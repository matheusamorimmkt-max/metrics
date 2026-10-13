-- Fase 2 / Etapa 2 — Conector da Greenn no agendamento
--
-- 1. greenn → Edge Function greenn-sync.
-- 2. Importação retroativa continua a cada minuto enquanto não terminar
--    (job ciclo_retroativa), em vez de esperar o ciclo de 15 min.

create or replace function public.conector_da_integracao(p_tipo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'meta'   then 'meta-sync'
    when 'greenn' then 'greenn-sync'
    else null
  end;
$$;

-- Modo 'retroativa': só integrações cuja importação inicial ainda não terminou.
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
  if p_modo not in ('incremental', 'reconsulta', 'retroativa') then
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
      and (p_modo <> 'retroativa' or i.importacao_concluida_em is null)
      and not exists (
        select 1 from public.sincronizacoes s
        where s.integracao_id = i.id and s.status = 'executando'
      )
    order by i.organizacao_id
  loop
    if v_org_anterior is distinct from v_linha.organizacao_id then
      v_ciclo := gen_random_uuid();
      v_org_anterior := v_linha.organizacao_id;
    end if;

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
      timeout_milliseconds := 150000
    );
    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

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

  perform cron.unschedule(jobid) from cron.job
    where jobname in ('ciclo_incremental', 'ciclo_reconsulta', 'ciclo_retroativa');
  perform cron.schedule('ciclo_incremental', '*/15 * * * *', $job$select public.disparar_ciclo_agendado('incremental')$job$);
  perform cron.schedule('ciclo_reconsulta',  '0 6 * * *',    $job$select public.disparar_ciclo_agendado('reconsulta')$job$);
  perform cron.schedule('ciclo_retroativa',  '* * * * *',    $job$select public.disparar_ciclo_agendado('retroativa')$job$);

  return 'Agendamento configurado: ciclo a cada 15 min, reconsulta diária às 06:00 UTC e importação retroativa a cada minuto enquanto houver.';
end;
$$;
