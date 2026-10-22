-- Imposto sobre as vendas definido no negócio e herdado pelos produtos.
-- A organização guarda a alíquota e a base padrão; todo produto segue o padrão, a
-- não ser que o usuário personalize (imposto_personalizado). Qualquer mudança vale
-- para todo o histórico (uma vigência única desde a primeira venda).

alter table public.organizacoes
  add column aliquota_imposto numeric(6,4) not null default 0
    check (aliquota_imposto >= 0 and aliquota_imposto <= 1),
  add column base_imposto text not null default 'bruto'
    check (base_imposto in ('bruto', 'liquido'));

comment on column public.organizacoes.aliquota_imposto is 'Alíquota padrão do negócio (fração), herdada pelos produtos não personalizados.';
comment on column public.organizacoes.base_imposto is 'Base padrão: bruto (faturamento − reembolsos) ou liquido (também sem taxas e parceiros).';

alter table public.produtos
  add column imposto_personalizado boolean not null default false;

comment on column public.produtos.imposto_personalizado is 'true: alíquota/base próprias; false: segue o padrão do negócio.';

-- Produto novo (importado pelo conector, que não informa imposto) nasce com o padrão
-- do negócio. Um insert que já traz alíquota ou base diferentes do default da coluna
-- (testes, importações futuras) é respeitado.
create or replace function public.aplica_imposto_padrao_produto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.imposto_personalizado
     and new.aliquota_imposto = 0
     and new.base_imposto = 'bruto' then
    select o.aliquota_imposto, o.base_imposto
      into new.aliquota_imposto, new.base_imposto
    from public.organizacoes o where o.id = new.organizacao_id;
  end if;
  return new;
end;
$$;
revoke all on function public.aplica_imposto_padrao_produto() from public, anon, authenticated;

create trigger produtos_imposto_padrao
  before insert on public.produtos
  for each row execute function public.aplica_imposto_padrao_produto();

-- Define o imposto do negócio e aplica a todos os produtos não personalizados, em
-- todo o histórico.
create or replace function public.definir_imposto_organizacao(
  p_organizacao_id uuid,
  p_aliquota numeric,
  p_base text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_produto uuid;
  v_total integer := 0;
begin
  if v_user is null or not exists (
    select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;
  if p_aliquota is null or p_aliquota < 0 or p_aliquota > 1 then
    raise exception 'Alíquota inválida.' using errcode = 'check_violation';
  end if;
  if p_base not in ('bruto', 'liquido') then
    raise exception 'Base inválida.' using errcode = 'check_violation';
  end if;

  update public.organizacoes
  set aliquota_imposto = p_aliquota, base_imposto = p_base
  where id = p_organizacao_id;

  for v_produto in
    select id from public.produtos
    where organizacao_id = p_organizacao_id and not imposto_personalizado
  loop
    update public.produtos
    set aliquota_imposto = p_aliquota, base_imposto = p_base
    where id = v_produto;
    perform public.recalcular_aliquota_historico(v_produto);
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;
grant execute on function public.definir_imposto_organizacao(uuid, numeric, text) to authenticated;

-- Personaliza (ou devolve ao padrão) o imposto de um produto, em todo o histórico.
create or replace function public.definir_imposto_produto(
  p_produto_id uuid,
  p_personalizado boolean,
  p_aliquota numeric default null,
  p_base text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org  uuid;
  v_aliquota numeric;
  v_base text;
begin
  select organizacao_id into v_org from public.produtos where id = p_produto_id;
  if v_org is null then
    raise exception 'Produto não encontrado.' using errcode = 'no_data_found';
  end if;
  if v_user is null or not exists (
    select 1 from public.membros where organizacao_id = v_org and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  if p_personalizado then
    if p_aliquota is null or p_aliquota < 0 or p_aliquota > 1 then
      raise exception 'Alíquota inválida.' using errcode = 'check_violation';
    end if;
    if p_base not in ('bruto', 'liquido') then
      raise exception 'Base inválida.' using errcode = 'check_violation';
    end if;
    v_aliquota := p_aliquota;
    v_base := p_base;
  else
    select aliquota_imposto, base_imposto into v_aliquota, v_base
    from public.organizacoes where id = v_org;
  end if;

  update public.produtos
  set aliquota_imposto = v_aliquota, base_imposto = v_base, imposto_personalizado = p_personalizado
  where id = p_produto_id;
  perform public.recalcular_aliquota_historico(p_produto_id);
end;
$$;
grant execute on function public.definir_imposto_produto(uuid, boolean, numeric, text) to authenticated;

-- A view de produtos passa a dizer se o imposto é personalizado.
drop view if exists public.produtos_resumo;
create view public.produtos_resumo
with (security_invoker = true)
as
select
  p.id,
  p.organizacao_id,
  p.plataforma,
  p.id_externo,
  p.nome,
  p.aliquota_imposto,
  p.base_imposto,
  p.imposto_personalizado,
  p.ativo,
  (select count(*) from public.ofertas o where o.produto_id = p.id)                 as ofertas,
  (select count(*) from public.vendas v
    where v.produto_id = p.id and v.status = 'aprovada'
      and v.vendida_em >= now() - interval '30 days')                             as vendas_30d,
  (select count(*) from public.historico_aliquotas h where h.produto_id = p.id)   as vigencias
from public.produtos p;

revoke all on public.produtos_resumo from anon;
grant select on public.produtos_resumo to authenticated, service_role;
