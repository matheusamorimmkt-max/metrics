-- Imposto padrão do negócio herdado pelos produtos; personalização por produto.
begin;
set client_min_messages to warning;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

select has_column('public', 'organizacoes', 'aliquota_imposto', 'organizacoes.aliquota_imposto');
select has_column('public', 'produtos', 'imposto_personalizado', 'produtos.imposto_personalizado');

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_a', public.criar_organizacao('Empresa A');
reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_b', public.criar_organizacao('Empresa B');
reset role;

-- Padrão do negócio definido antes da importação
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select public.definir_imposto_organizacao((select valor from ctx where chave = 'org_a'), 0.06, 'liquido');
reset role;

-- Conector importa dois produtos: nascem com o padrão
do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;
insert into public.produtos (id, organizacao_id, plataforma, id_externo, nome)
select ('80000000-0000-0000-0000-00000000000' || n)::uuid, valor, 'greenn', 'p' || n, 'Produto ' || n
from ctx, generate_series(1, 2) as n where chave = 'org_a';
reset role;

select is((select aliquota_imposto from public.produtos where id = '80000000-0000-0000-0000-000000000001'), 0.06::numeric(6,4), 'produto novo herda a alíquota do negócio');
select is((select base_imposto from public.produtos where id = '80000000-0000-0000-0000-000000000001'), 'liquido', 'produto novo herda a base do negócio');

-- Personaliza o produto 2 e muda o padrão: só o 1 acompanha
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select public.definir_imposto_produto('80000000-0000-0000-0000-000000000002', true, 0.10, 'bruto');
select is((select public.definir_imposto_organizacao((select valor from ctx where chave = 'org_a'), 0.08, 'bruto')), 1, 'muda o padrão: 1 produto acompanhou');
select is((select aliquota_imposto from public.produtos where id = '80000000-0000-0000-0000-000000000001'), 0.08::numeric(6,4), 'produto padrão acompanha o negócio');
select is((select aliquota_imposto from public.produtos where id = '80000000-0000-0000-0000-000000000002'), 0.10::numeric(6,4), 'produto personalizado não muda');
select is((select count(*) from public.historico_aliquotas where produto_id = '80000000-0000-0000-0000-000000000001'), 1::bigint, 'histórico vira uma vigência única');
select is((select imposto_personalizado from public.produtos_resumo where id = '80000000-0000-0000-0000-000000000002'), true, 'view mostra personalizado');

-- Volta o produto 2 ao padrão
select public.definir_imposto_produto('80000000-0000-0000-0000-000000000002', false);
select is((select aliquota_imposto from public.produtos where id = '80000000-0000-0000-0000-000000000002'), 0.08::numeric(6,4), 'voltar ao padrão copia a alíquota do negócio');
reset role;

-- B não mexe no imposto da A
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select throws_ok(
  $$select public.definir_imposto_organizacao((select valor from ctx where chave = 'org_a'), 0.5, 'bruto')$$,
  '42501', null, 'B não define o imposto da A'
);
reset role;

select * from finish();
rollback;
