-- Visões por oferta e por campanha, por dia.
begin;
set client_min_messages to warning;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

select has_view('public', 'vendas_oferta_diarias',     'view vendas_oferta_diarias');
select has_view('public', 'metricas_campanha_diarias', 'view metricas_campanha_diarias');

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
insert into public.produtos (id, organizacao_id, plataforma, id_externo, nome)
select '10000000-0000-0000-0000-000000000001', valor, 'greenn', 'p1', 'Curso' from ctx where chave = 'org_a';
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '20000000-0000-0000-0000-000000000001', valor, 'greenn', 'o1', '10000000-0000-0000-0000-000000000001', 'Front', 100 from ctx where chave = 'org_a';
insert into public.clientes (id, organizacao_id, email)
select '40000000-0000-0000-0000-000000000001', valor, 'x@teste.com' from ctx where chave = 'org_a';
-- Duas vendas no mesmo dia (uma às 23h30 de SP, que em UTC já é o dia seguinte), uma reembolsada
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em, reembolsada_em)
select valor, 'greenn', 'v1', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aprovada', 100, '2026-09-01 10:00-03', null from ctx where chave = 'org_a';
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em, reembolsada_em)
select valor, 'greenn', 'v2', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'reembolsada', 100, '2026-09-01 23:30-03', '2026-09-03 10:00-03' from ctx where chave = 'org_a';

insert into public.integracoes (id, organizacao_id, tipo, status)
select '50000000-0000-0000-0000-000000000001', valor, 'meta', 'conectada' from ctx where chave = 'org_a';
insert into public.contas_anuncio (id, organizacao_id, integracao_id, plataforma, id_externo)
select '60000000-0000-0000-0000-000000000001', valor, '50000000-0000-0000-0000-000000000001', 'meta', 'act_1' from ctx where chave = 'org_a';
insert into public.campanhas (id, organizacao_id, conta_anuncio_id, plataforma, id_externo, nome)
select '70000000-0000-0000-0000-000000000001', valor, '60000000-0000-0000-0000-000000000001', 'meta', 'c1', 'C1' from ctx where chave = 'org_a';
insert into public.metricas_anuncio_diarias (organizacao_id, campanha_id, anuncio_id_externo, data, gasto, impressoes, cliques_link)
select valor, '70000000-0000-0000-0000-000000000001', 'ad-' || n, '2026-09-01', 10, 100, 5 from ctx, generate_series(1, 3) as n where chave = 'org_a';
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select is(
  (select vendas::text || '/' || faturamento_bruto::text || '/' || reembolsadas::text from public.vendas_oferta_diarias where data = '2026-09-01'),
  '2/200.00/1', 'oferta no dia 01/09 (fuso de SP): 2 vendas, R$ 200, 1 reembolsada'
);
select is(
  (select gasto::text || '/' || impressoes::text || '/' || cliques_link::text from public.metricas_campanha_diarias where data = '2026-09-01'),
  '30.00/300/15', 'campanha no dia: soma dos 3 anúncios'
);
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.vendas_oferta_diarias), 0::bigint, 'B não vê vendas por oferta da A');
select is((select count(*) from public.metricas_campanha_diarias), 0::bigint, 'B não vê métricas por campanha da A');
reset role;

select * from finish();
rollback;
