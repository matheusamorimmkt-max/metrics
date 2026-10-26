-- Recorrência: cobranças repetidas de uma assinatura (mesmo cliente, mesma oferta,
-- mesmo valor) não são recompra nem item novo. A primeira cobrança é a compra
-- (assinatura_primeira); as demais são 'recorrencia', entram na mesma transação
-- (somam no valor) e ficam fora da contagem de itens e de compras.
-- A API da Greenn marca essas vendas como SUBSCRIPTION, mas não traz o id do
-- contrato: o agrupamento é por cliente + oferta + valor.

create or replace function public.classificar_recorrencias(
  p_organizacao_id uuid,
  p_cliente_ids    uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_alteradas integer;
begin
  if v_user is not null and not exists (
    select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  with grupos as (
    select
      v.id,
      row_number() over w as n,
      first_value(v.id_externo) over w as primeira_id_externo
    from public.vendas v
    where v.organizacao_id = p_organizacao_id
      and v.origem <> 'unica'
      and (p_cliente_ids is null or v.cliente_id = any (p_cliente_ids))
    window w as (
      partition by v.cliente_id, v.oferta_id, v.valor_bruto
      order by v.vendida_em, v.id
      rows between unbounded preceding and unbounded following
    )
  ),
  alvo as (
    -- A primeira cobrança do grupo mantém o que o conector disse; as demais viram
    -- recorrência. Uma renovação avulsa (conector já marcou, sem a primeira cobrança
    -- importada) continua fora das transações.
    select
      g.id,
      case when g.n > 1 then 'recorrencia' else null end as origem,
      g.primeira_id_externo
    from grupos g
  )
  update public.vendas v
  set origem = coalesce(a.origem, v.origem),
      assinatura_id_externo = coalesce(v.assinatura_id_externo, a.primeira_id_externo)
  from alvo a
  where a.id = v.id
    and (a.origem is not null and v.origem <> a.origem or v.assinatura_id_externo is null);
  get diagnostics v_alteradas = row_count;
  return v_alteradas;
end;
$$;

comment on function public.classificar_recorrencias(uuid, uuid[]) is
  'Cobranças de assinatura do mesmo cliente, oferta e valor: a primeira é assinatura_primeira, as demais recorrencia. Chamada por recalcular_transacoes.';

revoke all on function public.classificar_recorrencias(uuid, uuid[]) from public, anon;
grant execute on function public.classificar_recorrencias(uuid, uuid[]) to authenticated, service_role;

-- recalcular_transacoes: classifica antes e anexa as renovações à transação do contrato.
create or replace function public.recalcular_transacoes(
  p_organizacao_id uuid,
  p_cliente_ids    uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_janela   interval;
  v_cliente  record;
  v_venda    record;
  v_inicio   timestamptz;
  v_fim      timestamptz;
  v_total    numeric(14,2);
  v_qtd      integer;
  v_ordem    integer;
  v_trans_id uuid;
  v_funil    uuid;
  v_criadas  integer := 0;
begin
  -- Chamada pelo app (usuário autenticado) exige ser membro; os conectores usam service_role.
  if v_user is not null and not exists (
    select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  select make_interval(mins => janela_transacao_min) into v_janela
  from public.organizacoes where id = p_organizacao_id;
  if v_janela is null then
    raise exception 'Organização não encontrada.' using errcode = 'no_data_found';
  end if;

  -- Cobranças repetidas de assinatura viram 'recorrencia' antes de agrupar.
  perform public.classificar_recorrencias(p_organizacao_id, p_cliente_ids);

  for v_cliente in
    select c.id
    from public.clientes c
    where c.organizacao_id = p_organizacao_id
      and (p_cliente_ids is null or c.id = any (p_cliente_ids))
  loop
    update public.vendas set transacao_id = null
    where cliente_id = v_cliente.id and transacao_id is not null;
    delete from public.transacoes where cliente_id = v_cliente.id;

    v_inicio := null; v_ordem := 0; v_trans_id := null;

    for v_venda in
      select v.id, v.vendida_em, v.valor_bruto, v.oferta_id
      from public.vendas v
      where v.cliente_id = v_cliente.id and v.origem <> 'recorrencia'
      order by v.vendida_em, v.id
    loop
      -- Nova transação quando a venda cai fora da janela contada da PRIMEIRA compra do grupo.
      if v_inicio is null or v_venda.vendida_em > v_inicio + v_janela then
        if v_trans_id is not null then
          update public.transacoes
          set fim = v_fim, valor_total = v_total, quantidade_vendas = v_qtd, funil_id = v_funil
          where id = v_trans_id;
        end if;

        v_ordem := v_ordem + 1;
        v_inicio := v_venda.vendida_em; v_fim := v_venda.vendida_em;
        v_total := 0; v_qtd := 0; v_funil := null;

        insert into public.transacoes (organizacao_id, cliente_id, inicio, fim, ordem, eh_recompra)
        values (p_organizacao_id, v_cliente.id, v_inicio, v_fim, v_ordem, v_ordem > 1)
        returning id into v_trans_id;
        v_criadas := v_criadas + 1;
      end if;

      v_fim := greatest(v_fim, v_venda.vendida_em);
      v_total := v_total + v_venda.valor_bruto;
      v_qtd := v_qtd + 1;

      -- Funil da transação: o da oferta front confirmada; senão, o da primeira venda com funil.
      if v_funil is null or exists (
        select 1 from public.funil_ofertas fo
        where fo.oferta_id = v_venda.oferta_id and fo.papel = 'front' and fo.status = 'confirmado'
      ) then
        select fo.funil_id into v_funil
        from public.funil_ofertas fo
        where fo.oferta_id = v_venda.oferta_id and fo.status = 'confirmado'
        order by (fo.papel = 'front') desc
        limit 1;
      end if;

      update public.vendas set transacao_id = v_trans_id where id = v_venda.id;
    end loop;

    if v_trans_id is not null then
      update public.transacoes
      set fim = v_fim, valor_total = v_total, quantidade_vendas = v_qtd, funil_id = v_funil
      where id = v_trans_id;
    end if;

    -- Renovações entram na transação da primeira cobrança do contrato: somam no valor,
    -- mas não contam como item nem como transação nova.
    update public.vendas r
    set transacao_id = p.transacao_id
    from public.vendas p
    where r.cliente_id = v_cliente.id
      and r.origem = 'recorrencia'
      and p.cliente_id = r.cliente_id
      and p.origem = 'assinatura_primeira'
      and p.assinatura_id_externo = r.assinatura_id_externo
      and p.transacao_id is not null;
    update public.transacoes t
    set valor_total = t.valor_total + coalesce((
      select sum(r.valor_bruto) from public.vendas r
      where r.transacao_id = t.id and r.origem = 'recorrencia'
    ), 0)
    where t.cliente_id = v_cliente.id;

    -- Primeira compra e funil de entrada vêm da primeira transação.
    update public.clientes c
    set primeira_compra_em = t.inicio,
        funil_entrada_id   = t.funil_id
    from public.transacoes t
    where c.id = v_cliente.id and t.cliente_id = c.id and t.ordem = 1;

    if not exists (select 1 from public.transacoes where cliente_id = v_cliente.id) then
      update public.clientes set primeira_compra_em = null, funil_entrada_id = null
      where id = v_cliente.id;
    end if;
  end loop;

  return v_criadas;
end;
$$;

-- Itens vendidos e compras não contam renovações; o faturamento continua contando.
create or replace view public.metricas_diarias
with (security_invoker = true)
as
with vendas_base as (
  select
    v.organizacao_id,
    org.fuso_horario,
    v.vendida_em,
    v.reembolsada_em,
    v.status,
    v.origem,
    v.valor_bruto,
    v.taxa_gateway,
    v.valor_parceiros,
    -- Funil da venda: recompra vai para o funil de entrada do cliente; senão, o da oferta.
    case
      when t.eh_recompra then c.funil_entrada_id
      else coalesce(fo.funil_id, t.funil_id)
    end as funil_id,
    coalesce(h.aliquota, 0) as aliquota,
    coalesce(h.base, 'bruto') as base
  from public.vendas v
  join public.organizacoes org on org.id = v.organizacao_id
  left join public.transacoes t on t.id = v.transacao_id
  left join public.clientes c on c.id = v.cliente_id
  left join public.funil_ofertas fo on fo.oferta_id = v.oferta_id and fo.status = 'confirmado'
  -- Vigência da alíquota na data da venda. Produtos importados nascem depois das vendas
  -- antigas: quando nenhuma vigência cobre a data, vale a mais próxima (a primeira conhecida).
  left join lateral (
    select h.aliquota, h.base
    from public.historico_aliquotas h
    where h.produto_id = v.produto_id
    order by (h.vigencia_inicio <= v.vendida_em) desc,
             abs(extract(epoch from h.vigencia_inicio - v.vendida_em))
    limit 1
  ) h on true
),
vendas_dia as (
  -- Dia da venda
  select
    organizacao_id,
    (vendida_em at time zone fuso_horario)::date as data,
    funil_id,
    0::numeric(14,2) as gasto,
    0::bigint as impressoes, 0::bigint as cliques_link, 0::bigint as visualizacoes_pagina,
    0::bigint as inicios_checkout, 0::bigint as leads,
    valor_bruto as faturamento_bruto,
    0::numeric(14,2) as reembolsos,
    taxa_gateway as taxas_gateway,
    valor_parceiros as parceiros,
    (aliquota * case when base = 'bruto' then valor_bruto
                     else valor_bruto - taxa_gateway - valor_parceiros end)::numeric(14,2) as impostos,
    (case when origem = 'recorrencia' then 0 else 1 end)::bigint as vendas,
    0::bigint as transacoes, 0::bigint as recompras, 0::bigint as clientes_novos
  from vendas_base
  union all
  -- Dia do reembolso ou chargeback
  select
    organizacao_id,
    (reembolsada_em at time zone fuso_horario)::date,
    funil_id,
    0, 0, 0, 0, 0, 0,
    0,
    valor_bruto,
    0, 0,
    -(aliquota * case when base = 'bruto' then valor_bruto
                      else valor_bruto - taxa_gateway - valor_parceiros end)::numeric(14,2),
    0, 0, 0, 0
  from vendas_base
  where status <> 'aprovada' and reembolsada_em is not null
),
gasto_dia as (
  select
    m.organizacao_id,
    m.data,
    fc.funil_id,
    m.gasto,
    m.impressoes, m.cliques_link, m.visualizacoes_pagina, m.inicios_checkout, m.leads,
    0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2),
    0::bigint, 0::bigint, 0::bigint, 0::bigint
  from public.metricas_anuncio_diarias m
  left join public.funil_campanhas fc on fc.campanha_id = m.campanha_id
),
transacoes_dia as (
  select
    t.organizacao_id,
    (t.inicio at time zone org.fuso_horario)::date,
    case when t.eh_recompra then c.funil_entrada_id else t.funil_id end,
    0::numeric(14,2), 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
    0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2),
    0::bigint,
    1::bigint,
    case when t.eh_recompra then 1 else 0 end::bigint,
    case when t.ordem = 1 then 1 else 0 end::bigint
  from public.transacoes t
  join public.organizacoes org on org.id = t.organizacao_id
  join public.clientes c on c.id = t.cliente_id
),
tudo as (
  select * from vendas_dia
  union all select * from gasto_dia
  union all select * from transacoes_dia
)
select
  organizacao_id,
  data,
  funil_id,
  sum(gasto)::numeric(14,2)                as gasto,
  sum(impressoes)::bigint                          as impressoes,
  sum(cliques_link)::bigint                        as cliques_link,
  sum(visualizacoes_pagina)::bigint                as visualizacoes_pagina,
  sum(inicios_checkout)::bigint                    as inicios_checkout,
  sum(leads)::bigint                               as leads,
  sum(faturamento_bruto)::numeric(14,2)    as faturamento_bruto,
  sum(reembolsos)::numeric(14,2)           as reembolsos,
  sum(taxas_gateway)::numeric(14,2)        as taxas_gateway,
  sum(parceiros)::numeric(14,2)            as parceiros,
  sum(impostos)::numeric(14,2)             as impostos,
  sum(vendas)::bigint                              as vendas,
  sum(transacoes)::bigint                          as transacoes,
  sum(recompras)::bigint                           as recompras,
  sum(clientes_novos)::bigint                      as clientes_novos
from tudo
group by organizacao_id, data, funil_id;

create or replace view public.vendas_oferta_diarias
with (security_invoker = true)
as
select
  v.organizacao_id,
  (v.vendida_em at time zone org.fuso_horario)::date as data,
  v.oferta_id,
  count(*) filter (where v.origem <> 'recorrencia')::bigint          as vendas,
  coalesce(sum(v.valor_bruto), 0)::numeric(14,2)                     as faturamento_bruto,
  count(*) filter (where v.status <> 'aprovada')::bigint             as reembolsadas,
  coalesce(sum(v.valor_bruto) filter (where v.status <> 'aprovada'), 0)::numeric(14,2) as valor_reembolsado
from public.vendas v
join public.organizacoes org on org.id = v.organizacao_id
group by v.organizacao_id, (v.vendida_em at time zone org.fuso_horario)::date, v.oferta_id;

-- Reclassifica e refaz as transações de todas as organizações.
select public.recalcular_transacoes(o.id, null) from public.organizacoes o;
