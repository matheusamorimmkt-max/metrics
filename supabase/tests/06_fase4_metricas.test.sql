-- Fase 4: a visão metricas_diarias aplica o modelo financeiro dia a dia e por funil.
begin;
set client_min_messages to warning;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

select has_view('public', 'metricas_diarias', 'view metricas_diarias');

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_a', public.criar_organizacao('Empresa A');
reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_b', public.criar_organizacao('Empresa B');
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;

-- Produto com 10% sobre o bruto; oferta front no Funil Desafio
insert into public.produtos (id, organizacao_id, plataforma, id_externo, nome, aliquota_imposto, base_imposto)
select '10000000-0000-0000-0000-000000000001', valor, 'greenn', 'p1', 'Curso', 0.10, 'bruto' from ctx where chave = 'org_a';
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '20000000-0000-0000-0000-000000000001', valor, 'greenn', 'o1', '10000000-0000-0000-0000-000000000001', 'Front', 100 from ctx where chave = 'org_a';
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '20000000-0000-0000-0000-000000000002', valor, 'greenn', 'o2', '10000000-0000-0000-0000-000000000001', 'Solta', 50 from ctx where chave = 'org_a';
insert into public.funis (id, organizacao_id, categoria_id, nome)
select '30000000-0000-0000-0000-000000000001', valor,
       (select id from public.categorias where organizacao_id = ctx.valor and nome = 'Front-end'), 'Funil Desafio'
from ctx where chave = 'org_a';
insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel, status)
select valor, '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'front', 'confirmado' from ctx where chave = 'org_a';

-- Cliente X: front em 01/09 (R$100, taxa 5, parceiro 10), oferta solta em 03/09, reembolso do front em 05/09
insert into public.clientes (id, organizacao_id, email)
select '40000000-0000-0000-0000-000000000001', valor, 'x@teste.com' from ctx where chave = 'org_a';
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, taxa_gateway, valor_parceiros, vendida_em, reembolsada_em)
select valor, 'greenn', 'v1', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
       'reembolsada', 100, 5, 10, '2026-09-01 10:00-03', '2026-09-05 15:00-03' from ctx where chave = 'org_a';
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
select valor, 'greenn', 'v2', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
       'aprovada', 50, '2026-09-03 23:30-03' from ctx where chave = 'org_a';
select public.recalcular_transacoes((select valor from ctx where chave = 'org_a'));

-- Gasto: campanha vinculada (R$ 40 em 01/09) e campanha solta (R$ 7 em 01/09)
insert into public.integracoes (id, organizacao_id, tipo, status)
select '50000000-0000-0000-0000-000000000001', valor, 'meta', 'conectada' from ctx where chave = 'org_a';
insert into public.contas_anuncio (id, organizacao_id, integracao_id, plataforma, id_externo)
select '60000000-0000-0000-0000-000000000001', valor, '50000000-0000-0000-0000-000000000001', 'meta', 'act_1' from ctx where chave = 'org_a';
insert into public.campanhas (id, organizacao_id, conta_anuncio_id, plataforma, id_externo, nome)
select ('70000000-0000-0000-0000-00000000000' || n)::uuid, valor, '60000000-0000-0000-0000-000000000001', 'meta', 'c' || n, 'Campanha ' || n
from ctx, generate_series(1, 2) as n where chave = 'org_a';
insert into public.funil_campanhas (organizacao_id, funil_id, campanha_id)
select valor, '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001' from ctx where chave = 'org_a';
insert into public.metricas_anuncio_diarias (organizacao_id, campanha_id, data, gasto, cliques_link, leads)
select valor, '70000000-0000-0000-0000-000000000001', '2026-09-01', 40, 20, 2 from ctx where chave = 'org_a';
insert into public.metricas_anuncio_diarias (organizacao_id, campanha_id, data, gasto)
select valor, '70000000-0000-0000-0000-000000000002', '2026-09-01', 7 from ctx where chave = 'org_a';

-- Dia 01/09, Funil Desafio: venda + gasto + transação + cliente novo
select is(
  (select faturamento_bruto from public.metricas_diarias where data = '2026-09-01' and funil_id = '30000000-0000-0000-0000-000000000001'),
  100::numeric(14,2), '01/09 funil: faturamento 100'
);
select is(
  (select gasto from public.metricas_diarias where data = '2026-09-01' and funil_id = '30000000-0000-0000-0000-000000000001'),
  40::numeric(14,2), '01/09 funil: gasto 40 da campanha vinculada'
);
select is(
  (select impostos from public.metricas_diarias where data = '2026-09-01' and funil_id = '30000000-0000-0000-0000-000000000001'),
  10::numeric(14,2), '01/09 funil: imposto 10% sobre o bruto'
);
select is(
  (select taxas_gateway + parceiros from public.metricas_diarias where data = '2026-09-01' and funil_id = '30000000-0000-0000-0000-000000000001'),
  15::numeric(14,2), '01/09 funil: taxa e parceiros'
);
select is(
  (select transacoes::text || '/' || clientes_novos::text || '/' || leads::text from public.metricas_diarias where data = '2026-09-01' and funil_id = '30000000-0000-0000-0000-000000000001'),
  '1/1/2', '01/09 funil: 1 transação, 1 cliente novo, 2 leads'
);
-- Campanha sem funil: gasto em funil_id null
select is(
  (select gasto from public.metricas_diarias where data = '2026-09-01' and funil_id is null),
  7::numeric(14,2), '01/09 não vinculado: gasto 7'
);
-- 03/09 23:30-03 = 04/09 em UTC, mas o dia é no fuso da organização. A venda conta no
-- funil da oferta: oferta solta fica sem funil, mesmo sendo recompra de quem entrou pelo funil 1.
select is(
  (select faturamento_bruto from public.metricas_diarias where data = '2026-09-03' and funil_id is null),
  50::numeric(14,2), '03/09: recompra da oferta solta fica fora dos funis, no dia do fuso da organização'
);
select is(
  (select coalesce(sum(faturamento_bruto), 0) from public.metricas_diarias where data = '2026-09-03' and funil_id = '30000000-0000-0000-0000-000000000001'),
  0::numeric, '03/09: o funil de entrada não recebe a recompra feita em outra oferta'
);
select is(
  (select recompras from public.metricas_diarias where data = '2026-09-03' and funil_id is null),
  1::bigint, '03/09: conta como recompra onde a venda aconteceu'
);
select is(
  (select faturamento_recompra from public.metricas_diarias where data = '2026-09-03' and funil_id is null),
  50::numeric(14,2), '03/09: faturamento de recompra = valor da venda recomprada'
);
select is(
  (select coalesce(sum(faturamento_recompra), 0) from public.metricas_diarias where data = '2026-09-01'),
  0::numeric, '01/09: primeira compra não é faturamento de recompra'
);
-- 05/09: reembolso no dia em que aconteceu, imposto negativo
select is(
  (select reembolsos from public.metricas_diarias where data = '2026-09-05' and funil_id = '30000000-0000-0000-0000-000000000001'),
  100::numeric(14,2), '05/09: reembolso de 100'
);
select is(
  (select impostos from public.metricas_diarias where data = '2026-09-05' and funil_id = '30000000-0000-0000-0000-000000000001'),
  (-10)::numeric(14,2), '05/09: imposto devolvido'
);
reset role;

-- Base líquida: imposto sobre bruto − taxa − parceiros
do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;
update public.produtos set base_imposto = 'liquido' where id = '10000000-0000-0000-0000-000000000001';
select public.recalcular_aliquota_historico('10000000-0000-0000-0000-000000000001');
select is(
  (select impostos from public.metricas_diarias where data = '2026-09-01' and funil_id = '30000000-0000-0000-0000-000000000001'),
  8.50::numeric(14,2), 'base líquida: 10% de (100 − 5 − 10)'
);
reset role;

-- RLS pela view
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.metricas_diarias), 4::bigint, 'A vê as 4 linhas (01/09 funil, 01/09 solto, 03/09, 05/09)');
reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.metricas_diarias), 0::bigint, 'B não vê métricas da A');
reset role;

select * from finish();
rollback;
