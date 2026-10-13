-- Fase 3 / Etapa 4 — Agendamento dos ciclos (pg_cron + pg_net)
--
-- A cada 15 min: ciclo incremental de todas as organizações com conector
-- configurado. Uma vez por dia (06:00 UTC = 03:00 em São Paulo): reconsulta.
-- As Edge Functions são chamadas via pg_net com a URL e a chave service_role
-- guardadas no Vault (nomes "app/url_funcoes" e "app/service_role_key").
--
-- As extensões pg_cron e pg_net existem no Supabase hospedado; no Postgres
-- local dos testes não existem, então tudo é condicional e só a função de
-- disparo é testada.

-- ---------------------------------------------------------------------------
-- Conectores por tipo de integração (nome da Edge Function)
-- ---------------------------------------------------------------------------
create or replace function public.conector_da_integracao(p_tipo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'meta' then 'meta-sync'
    else null
  end;
$$;

comment on function public.conector_da_integracao(text) is
  'Nome da Edge Function que sincroniza cada tipo de integração. Greenn entra aqui na Fase 2.';

-- ---------------------------------------------------------------------------
-- disparar_ciclo_agendado: chama o conector de cada integração configurada
-- ---------------------------------------------------------------------------
create or replace function public.disparar_ciclo_agendado(p_modo text default 'incremental')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_chave  text;
  v_linha  record;
  v_ciclo  uuid;
  v_corte  timestamptz := now();
  v_total  integer := 0;
  v_modo   text;
  v_org_anterior uuid;
begin
  if p_modo not in ('incremental', 'reconsulta') then
    raise exception 'Modo inválido: %', p_modo using errcode = 'check_violation';
  end if;

  select decrypted_secret into v_url   from vault.decrypted_secrets where name = 'app/url_funcoes';
  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'app/service_role_key';
  if v_url is null or v_chave is null then
    raise exception 'Agendamento não configurado: rode configurar_agendamento(url, chave).'
      using errcode = 'no_data_found';
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'Extensão pg_net não está instalada.' using errcode = 'undefined_object';
  end if;

  for v_linha in
    select i.organizacao_id, i.tipo, i.importacao_concluida_em
    from public.integracoes i
    where i.status <> 'desconectada'
      and public.conector_da_integracao(i.tipo) is not null
      and not exists (
        select 1 from public.sincronizacoes s
        where s.integracao_id = i.id and s.status = 'executando'
      )
    order by i.organizacao_id
  loop
    -- Mesmo ciclo e mesmo corte para todas as integrações de uma organização.
    if v_org_anterior is distinct from v_linha.organizacao_id then
      v_ciclo := gen_random_uuid();
      v_org_anterior := v_linha.organizacao_id;
    end if;

    -- Importação retroativa ainda não terminou: continua por ela.
    v_modo := case when v_linha.importacao_concluida_em is null then 'retroativa' else p_modo end;

    perform net.http_post(
      url     := v_url || '/' || public.conector_da_integracao(v_linha.tipo),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_chave
      ),
      body    := jsonb_build_object(
        'organizacao_id', v_linha.organizacao_id,
        'modo', v_modo,
        'origem', 'agendado',
        'ciclo_id', v_ciclo,
        'corte', v_corte
      ),
      timeout_milliseconds := 120000
    );
    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

comment on function public.disparar_ciclo_agendado(text) is
  'pg_cron: dispara o conector de cada integração configurada via pg_net. Devolve quantas chamadas fez.';

revoke all on function public.disparar_ciclo_agendado(text) from public, anon, authenticated;
grant execute on function public.disparar_ciclo_agendado(text) to service_role;

-- ---------------------------------------------------------------------------
-- configurar_agendamento: guarda URL e chave no Vault e cria os jobs do pg_cron
-- ---------------------------------------------------------------------------
-- Rodar uma vez no SQL Editor:
--   select public.configurar_agendamento('https://<ref>.supabase.co/functions/v1', '<service_role_key>');
create or replace function public.configurar_agendamento(p_url_funcoes text, p_service_role_key text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_url_funcoes is null or p_url_funcoes !~ '^https://' then
    raise exception 'Informe a URL das Edge Functions (https://<ref>.supabase.co/functions/v1).'
      using errcode = 'check_violation';
  end if;
  if p_service_role_key is null or length(p_service_role_key) < 20 then
    raise exception 'Informe a chave service_role.' using errcode = 'check_violation';
  end if;

  p_url_funcoes := rtrim(p_url_funcoes, '/');

  select id into v_id from vault.secrets where name = 'app/url_funcoes';
  if v_id is null then
    perform vault.create_secret(p_url_funcoes, 'app/url_funcoes', 'URL base das Edge Functions');
  else
    perform vault.update_secret(v_id, p_url_funcoes);
  end if;

  select id into v_id from vault.secrets where name = 'app/service_role_key';
  if v_id is null then
    perform vault.create_secret(p_service_role_key, 'app/service_role_key', 'Chave service_role usada pelo pg_cron');
  else
    perform vault.update_secret(v_id, p_service_role_key);
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return 'Segredos salvos. pg_cron não está instalado: ative em Database → Extensions e rode de novo.';
  end if;

  -- Recria os jobs (idempotente).
  perform cron.unschedule(jobid) from cron.job where jobname in ('ciclo_incremental', 'ciclo_reconsulta');
  perform cron.schedule('ciclo_incremental', '*/15 * * * *', $job$select public.disparar_ciclo_agendado('incremental')$job$);
  perform cron.schedule('ciclo_reconsulta',  '0 6 * * *',    $job$select public.disparar_ciclo_agendado('reconsulta')$job$);

  return 'Agendamento configurado: ciclo a cada 15 min e reconsulta diária às 06:00 UTC.';
end;
$$;

comment on function public.configurar_agendamento(text, text) is
  'Uma vez por projeto: guarda URL e chave no Vault e agenda os ciclos no pg_cron.';

revoke all on function public.configurar_agendamento(text, text) from public, anon, authenticated;
grant execute on function public.configurar_agendamento(text, text) to service_role;

-- pg_net precisa existir para o disparo. Só tenta criar onde a extensão está disponível.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net')
     and not exists (select 1 from pg_extension where extname = 'pg_net') then
    create extension pg_net with schema extensions;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and not exists (select 1 from pg_extension where extname = 'pg_cron') then
    create extension pg_cron;
  end if;
exception when others then
  raise notice 'Extensões pg_net/pg_cron não criadas aqui: %', sqlerrm;
end;
$$;
