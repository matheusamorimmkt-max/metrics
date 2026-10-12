-- Emula, num Postgres comum, o que o Supabase já entrega:
-- papéis anon/authenticated/service_role, schema extensions, schema auth com
-- auth.users e auth.uid(). Usado SÓ pelos testes locais e pelo CI.
-- No Supabase hospedado nada disto roda.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema if not exists extensions;
create schema if not exists auth;

create extension if not exists pgtap with schema extensions;

create table if not exists auth.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique,
  created_at  timestamptz not null default now()
);

-- Mesma lógica do Supabase: lê o "sub" do JWT a partir das configurações da sessão.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

-- Privilégios padrão do Supabase: os papéis da API enxergam o schema public.
grant usage on schema public, extensions, auth to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

alter database :"dbname" set search_path = "$user", public, extensions;

-- ---------------------------------------------------------------------------
-- Emulação do Vault (supabase_vault). No Supabase hospedado o segredo é
-- criptografado; aqui fica em texto, só para os testes. Como lá, os papéis da
-- API (anon, authenticated, service_role) não enxergam o schema vault: só as
-- funções SECURITY DEFINER do schema public chegam nele.
-- ---------------------------------------------------------------------------
create schema if not exists vault;

create table if not exists vault.secrets (
  id          uuid primary key default gen_random_uuid(),
  name        text unique,
  description text not null default '',
  secret      text not null,
  key_id      uuid,
  nonce       bytea,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace view vault.decrypted_secrets as
  select id, name, description, secret, secret as decrypted_secret,
         key_id, nonce, created_at, updated_at
  from vault.secrets;

create or replace function vault.create_secret(
  new_secret      text,
  new_name        text default null,
  new_description text default '',
  new_key_id      uuid default null
)
returns uuid
language sql
as $$
  insert into vault.secrets (secret, name, description, key_id)
  values (new_secret, new_name, new_description, new_key_id)
  returning id;
$$;

create or replace function vault.update_secret(
  secret_id       uuid,
  new_secret      text default null,
  new_name        text default null,
  new_description text default null,
  new_key_id      uuid default null
)
returns void
language sql
as $$
  update vault.secrets
  set secret      = coalesce(new_secret, secret),
      name        = coalesce(new_name, name),
      description = coalesce(new_description, description),
      key_id      = coalesce(new_key_id, key_id),
      updated_at  = now()
  where id = secret_id;
$$;
