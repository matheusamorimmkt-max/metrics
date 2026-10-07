-- Fase 1 / Etapa 1 — Funções chamadas pelo app (RPC)

-- Cria a organização do usuário autenticado, vincula-o como diretor e
-- insere as quatro categorias padrão. Retorna o id da organização.
create or replace function public.criar_organizacao(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org  uuid;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado para criar uma organização.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Informe o nome da organização.' using errcode = 'check_violation';
  end if;

  insert into public.organizacoes (nome)
  values (trim(p_nome))
  returning id into v_org;

  insert into public.membros (organizacao_id, user_id, papel)
  values (v_org, v_user, 'diretor');

  insert into public.categorias (organizacao_id, nome, ordem, tem_semaforo) values
    (v_org, 'Iscas gratuitas', 1, false),
    (v_org, 'Front-end',       2, true),
    (v_org, 'Back-end',        3, false),
    (v_org, 'High-end',        4, false);

  return v_org;
end;
$$;

comment on function public.criar_organizacao(text) is
  'Primeiro acesso: cria organização, membro diretor e categorias padrão.';

revoke all on function public.criar_organizacao(text) from public, anon;
grant execute on function public.criar_organizacao(text) to authenticated, service_role;
