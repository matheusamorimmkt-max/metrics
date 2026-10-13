-- Visões de Produtos e Ofertas: conteúdo e isolamento.
begin;
set client_min_messages to warning;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

select has_view('public', 'ofertas_resumo',  'view ofertas_resumo');
select has_view('public', 'produtos_resumo', 'view produtos_resumo');

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
insert into public.funis (id, organizacao_id, categoria_id, nome)
select '30000000-0000-0000-0000-000000000001', valor,
       (select id from public.categorias where organizacao_id = ctx.valor and nome = 'Front-end'), 'Funil'
from ctx where chave = 'org_a';
insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel, status)
select valor, '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'front', 'sugerido' from ctx where chave = 'org_a';
insert into public.clientes (id, organizacao_id, email)
select '40000000-0000-0000-0000-000000000001', valor, 'x@teste.com' from ctx where chave = 'org_a';
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
select valor, 'greenn', 'v' || n, '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aprovada', 100, now() - make_interval(days => n)
from ctx, generate_series(1, 2) as n where chave = 'org_a';
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select is(
  (select faturamento from public.ofertas_resumo where id = '20000000-0000-0000-0000-000000000001'),
  200::numeric(14,2), 'oferta: faturamento acumulado'
);
select is(
  (select funil_nome || '/' || papel || '/' || vinculo_status from public.ofertas_resumo where id = '20000000-0000-0000-0000-000000000001'),
  'Funil/front/sugerido', 'oferta: funil, papel e status do vínculo'
);
select is(
  (select ofertas::text || '/' || vendas_30d::text || '/' || vigencias::text from public.produtos_resumo where id = '10000000-0000-0000-0000-000000000001'),
  '1/2/1', 'produto: 1 oferta, 2 vendas em 30 dias, 1 vigência'
);
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.ofertas_resumo), 0::bigint, 'B não vê ofertas da A');
select is((select count(*) from public.produtos_resumo), 0::bigint, 'B não vê produtos da A');
reset role;

select * from finish();
rollback;
