-- Credenciais de integração por organização (Greenn, Meta), guardadas no Vault.
--
-- Cada organização conecta a própria conta do gateway e do Meta na tela de
-- Integrações. O token nunca fica em tabela de negócio: vai para vault.secrets e
-- a tabela integracoes guarda só a referência (credenciais_secret_id), os 4 últimos
-- caracteres (para o usuário reconhecer qual token está salvo) e a data.
--
-- O app grava e apaga credenciais só pelas funções abaixo (RPC). A leitura do
-- segredo é exclusiva da service_role (Edge Functions dos conectores).

-- ---------------------------------------------------------------------------
-- integracoes: status "configurada" e colunas de apoio
-- ---------------------------------------------------------------------------
alter table public.integracoes drop constraint if exists integracoes_status_check;
alter table public.integracoes add constraint integracoes_status_check
  check (status in ('desconectada', 'configurada', 'conectada', 'erro'));

alter table public.integracoes
  add column if not exists credencial_sufixo          text,
  add column if not exists credenciais_atualizadas_em timestamptz,
  add column if not exists erro                       text;

comment on column public.integracoes.status is
  'desconectada: sem credenciais; configurada: credenciais salvas, ainda sem sincronização; conectada: última sincronização OK; erro: última sincronização falhou (ver erro).';
comment on column public.integracoes.credencial_sufixo is
  'Últimos 4 caracteres da credencial, só para o usuário reconhecer qual token está salvo.';
comment on column public.integracoes.erro is
  'Mensagem da última falha de sincronização ou de validação da credencial.';

-- O app só lê integracoes. Toda escrita passa pelas funções abaixo ou pelos
-- conectores (service_role), para o segredo e o status nunca saírem de sincronia.
drop policy if exists "membro gerencia integracoes" on public.integracoes;

create policy "membro ve integracoes"
  on public.integracoes for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

-- ---------------------------------------------------------------------------
-- guardar_credencial_integracao: cria ou troca a credencial de uma integração
-- ---------------------------------------------------------------------------
create or replace function public.guardar_credencial_integracao(
  p_organizacao_id uuid,
  p_tipo           text,
  p_credencial     text,
  p_config         jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_integracao uuid;
  v_secret     uuid;
  v_nome       text;
  v_credencial text := trim(p_credencial);
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.membros
    where organizacao_id = p_organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  if p_tipo is null or p_tipo not in ('greenn', 'meta') then
    raise exception 'Integração desconhecida.' using errcode = 'check_violation';
  end if;

  if v_credencial is null or length(v_credencial) < 8 then
    raise exception 'Informe a credencial da integração.' using errcode = 'check_violation';
  end if;

  -- Uma linha por (organização, tipo); criada na primeira conexão.
  insert into public.integracoes (organizacao_id, tipo)
  values (p_organizacao_id, p_tipo)
  on conflict (organizacao_id, tipo) do nothing;

  select id into v_integracao
  from public.integracoes
  where organizacao_id = p_organizacao_id and tipo = p_tipo;

  -- Nome único no Vault por (organização, tipo). Reaproveita o segredo se já existir,
  -- mesmo que a referência na tabela tenha se perdido.
  v_nome := 'integracao/' || p_organizacao_id::text || '/' || p_tipo;

  select id into v_secret from vault.secrets where name = v_nome;

  if v_secret is not null then
    perform vault.update_secret(v_secret, v_credencial);
  else
    v_secret := vault.create_secret(
      v_credencial,
      v_nome,
      'Credencial da integração ' || p_tipo || ' da organização ' || p_organizacao_id::text
    );
  end if;

  update public.integracoes
  set credenciais_secret_id      = v_secret,
      credencial_sufixo          = right(v_credencial, 4),
      credenciais_atualizadas_em = now(),
      status                     = 'configurada',
      erro                       = null,
      config                     = coalesce(p_config, '{}'::jsonb)
  where id = v_integracao;

  return v_integracao;
end;
$$;

comment on function public.guardar_credencial_integracao(uuid, text, text, jsonb) is
  'Tela de Integrações: guarda a credencial no Vault e marca a integração como configurada. Só membros da organização.';

revoke all on function public.guardar_credencial_integracao(uuid, text, text, jsonb) from public, anon;
grant execute on function public.guardar_credencial_integracao(uuid, text, text, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- remover_credencial_integracao: desconecta e apaga o segredo do Vault
-- ---------------------------------------------------------------------------
create or replace function public.remover_credencial_integracao(
  p_organizacao_id uuid,
  p_tipo           text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_secret uuid;
  v_nome   text := 'integracao/' || p_organizacao_id::text || '/' || p_tipo;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.membros
    where organizacao_id = p_organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  select credenciais_secret_id into v_secret
  from public.integracoes
  where organizacao_id = p_organizacao_id and tipo = p_tipo;

  delete from vault.secrets where id = v_secret or name = v_nome;

  update public.integracoes
  set credenciais_secret_id      = null,
      credencial_sufixo          = null,
      credenciais_atualizadas_em = null,
      status                     = 'desconectada',
      erro                       = null,
      config                     = '{}'::jsonb
  where organizacao_id = p_organizacao_id and tipo = p_tipo;
end;
$$;

comment on function public.remover_credencial_integracao(uuid, text) is
  'Tela de Integrações: apaga a credencial do Vault e volta a integração para desconectada.';

revoke all on function public.remover_credencial_integracao(uuid, text) from public, anon;
grant execute on function public.remover_credencial_integracao(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ler_credencial_integracao: só os conectores (service_role) leem o segredo
-- ---------------------------------------------------------------------------
create or replace function public.ler_credencial_integracao(p_integracao_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
  from public.integracoes i
  join vault.decrypted_secrets s on s.id = i.credenciais_secret_id
  where i.id = p_integracao_id;
$$;

comment on function public.ler_credencial_integracao(uuid) is
  'Conectores (Edge Functions com service_role): credencial em texto claro. Nunca liberar para authenticated.';

revoke all on function public.ler_credencial_integracao(uuid) from public, anon, authenticated;
grant execute on function public.ler_credencial_integracao(uuid) to service_role;
