-- Vincular uma oferta a um funil recalcula o funil das transações já importadas.
begin;
set client_min_messages to warning;
select plan(3);

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
select '80000000-0000-0000-0000-000000000001', valor, 'greenn', 'p1', 'Produto' from ctx;
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '90000000-0000-0000-0000-000000000001', valor, 'greenn', 'o1', '80000000-0000-0000-0000-000000000001', 'Oferta', 100 from ctx;
insert into public.clientes (id, organizacao_id, email)
select 'a0000000-0000-0000-0000-000000000001', valor, 'c@x.com' from ctx;
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, status_externo, valor_bruto, vendida_em)
select valor, 'greenn', 'v1', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'aprovada', 'paid', 100, now() - interval '10 days' from ctx;
insert into public.funis (id, organizacao_id, categoria_id, nome)
select '30000000-0000-0000-0000-000000000001', valor,
       (select id from public.categorias where organizacao_id = ctx.valor and nome = 'Front-end'), 'Funil' from ctx;
select public.recalcular_transacoes((select valor from ctx), null);
select is((select funil_id from public.transacoes limit 1), null, 'antes do vínculo a transação não tem funil');

-- Vincula a oferta: o trigger recalcula
insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel)
select valor, '30000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'front' from ctx;
select is((select funil_id from public.transacoes limit 1), '30000000-0000-0000-0000-000000000001', 'vínculo dá funil à transação antiga');
select is((select funil_entrada_id from public.clientes limit 1), '30000000-0000-0000-0000-000000000001', 'e funil de entrada ao cliente');
reset role;

select * from finish();
rollback;
