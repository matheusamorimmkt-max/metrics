-- Ciclo "executando" há mais de 10 min é um conector que morreu sem responder: o
-- agendamento não o trata mais como "em andamento". O próprio conector marca a
-- linha como falha ao começar o ciclo seguinte.

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
      and (p_modo <> 'retroativa' or (i.importacao_concluida_em is null and i.status <> 'erro'))
      and not exists (
        select 1 from public.sincronizacoes s
        where s.integracao_id = i.id
          and s.status = 'executando'
          and s.inicio > now() - interval '10 minutes'
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
