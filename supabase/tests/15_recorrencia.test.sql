-- Cobranças repetidas de assinatura não são recompra nem item novo.
begin;
set client_min_messages to warning;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@teste.com');
create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org', public.criar_organizacao('Empresa A');
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;
insert into public.produtos (id, organizacao_id, plataforma, id_externo, nome)
select '80000000-0000-0000-0000-000000000001', valor, 'greenn', 'p1', 'Mentoria' from ctx;
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '90000000-0000-0000-0000-000000000001', valor, 'greenn', 'o1', '80000000-0000-0000-0000-000000000001', 'Mentoria 6x', 833 from ctx;
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '90000000-0000-0000-0000-000000000002', valor, 'greenn', 'o2', '80000000-0000-0000-0000-000000000001', 'E-book', 37 from ctx;
insert into public.clientes (id, organizacao_id, email)
select 'a0000000-0000-0000-0000-000000000001', valor, 'c@x.com' from ctx;

-- Três cobranças mensais da mesma assinatura (a Greenn manda todas como assinatura_primeira)
-- e uma compra avulsa de outro produto dois meses depois.
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, status_externo, origem, valor_bruto, vendida_em)
select valor, 'greenn', 'v1', 'a0000000-0000-0000-0000-000000000001'::uuid, '90000000-0000-0000-0000-000000000001'::uuid, '80000000-0000-0000-0000-000000000001'::uuid, 'aprovada', 'paid', 'assinatura_primeira', 833, '2026-02-03 18:12+00'::timestamptz from ctx union all
select valor, 'greenn', 'v2', 'a0000000-0000-0000-0000-000000000001'::uuid, '90000000-0000-0000-0000-000000000001'::uuid, '80000000-0000-0000-0000-000000000001'::uuid, 'aprovada', 'paid', 'assinatura_primeira', 833, '2026-03-03 17:19+00'::timestamptz from ctx union all
select valor, 'greenn', 'v3', 'a0000000-0000-0000-0000-000000000001'::uuid, '90000000-0000-0000-0000-000000000001'::uuid, '80000000-0000-0000-0000-000000000001'::uuid, 'aprovada', 'paid', 'assinatura_primeira', 833, '2026-04-03 17:25+00'::timestamptz from ctx union all
select valor, 'greenn', 'v4', 'a0000000-0000-0000-0000-000000000001'::uuid, '90000000-0000-0000-0000-000000000002'::uuid, '80000000-0000-0000-0000-000000000001'::uuid, 'aprovada', 'paid', 'unica', 37, '2026-06-10 10:00+00'::timestamptz from ctx;

select public.recalcular_transacoes((select valor from ctx), null);

select is((select origem from public.vendas where id_externo = 'v1'), 'assinatura_primeira', '1ª cobrança é a compra');
select is((select origem from public.vendas where id_externo = 'v2'), 'recorrencia', '2ª cobrança é recorrência');
select is((select origem from public.vendas where id_externo = 'v3'), 'recorrencia', '3ª cobrança é recorrência');
select is((select assinatura_id_externo from public.vendas where id_externo = 'v3'), 'v1', 'cobranças compartilham o id do contrato');
select is((select count(*) from public.transacoes), 2::bigint, 'assinatura = 1 transação; avulsa = outra');
select is((select valor_total from public.transacoes where ordem = 1), 2499.00, 'transação da assinatura soma as 3 cobranças');
select is((select quantidade_vendas from public.transacoes where ordem = 1), 1, 'mas conta 1 item');
select is((select transacao_id from public.vendas where id_externo = 'v3'), (select id from public.transacoes where ordem = 1), 'renovação aponta para a transação do contrato');
select is((select eh_recompra from public.transacoes where ordem = 2), true, 'a compra avulsa depois é recompra de verdade');
select is((select sum(vendas)::bigint from public.metricas_diarias), 2::bigint, 'itens vendidos na view: 2 (sem as renovações)');
reset role;

select * from finish();
rollback;
