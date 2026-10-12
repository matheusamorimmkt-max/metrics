-- Fase 3: contas de anúncio, campanhas, vínculo com funil, métricas diárias e isolamento.
begin;
set client_min_messages to warning;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

select has_table('public', 'contas_anuncio',           'tabela contas_anuncio');
select has_table('public', 'campanhas',                'tabela campanhas');
select has_table('public', 'funil_campanhas',          'tabela funil_campanhas');
select has_table('public', 'metricas_anuncio_diarias', 'tabela metricas_anuncio_diarias');
select has_view('public', 'campanhas_resumo',          'view campanhas_resumo');

-- Organizações
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_a', public.criar_organizacao('Empresa A');
reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_b', public.criar_organizacao('Empresa B');
reset role;

-- Semente como o conector (service_role, sem sub)
do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;

insert into public.integracoes (id, organizacao_id, tipo, status)
select '50000000-0000-0000-0000-000000000001', valor, 'meta', 'configurada' from ctx where chave = 'org_a';

insert into public.contas_anuncio (id, organizacao_id, integracao_id, plataforma, id_externo, nome, moeda)
select '60000000-0000-0000-0000-000000000001', valor, '50000000-0000-0000-0000-000000000001', 'meta', 'act_123', 'Conta A', 'BRL'
from ctx where chave = 'org_a';

insert into public.campanhas (id, organizacao_id, conta_anuncio_id, plataforma, id_externo, nome, status)
select ('70000000-0000-0000-0000-00000000000' || n)::uuid, valor, '60000000-0000-0000-0000-000000000001', 'meta', 'camp-' || n, 'Campanha ' || n, 'ACTIVE'
from ctx, generate_series(1, 2) as n where chave = 'org_a';

insert into public.funis (id, organizacao_id, categoria_id, nome)
select '30000000-0000-0000-0000-000000000001', valor,
       (select id from public.categorias where organizacao_id = ctx.valor and nome = 'Front-end'),
       'Funil Desafio'
from ctx where chave = 'org_a';

-- Métricas: campanha 1 com 3 anúncios hoje e um dia há 40 dias; campanha 2 sem gasto
insert into public.metricas_anuncio_diarias
  (organizacao_id, campanha_id, conjunto_id_externo, anuncio_id_externo, data, gasto, impressoes, cliques_link, leads)
select valor, '70000000-0000-0000-0000-000000000001', 'cj-1', 'ad-' || n, current_date, 10 * n, 1000, 50, 2
from ctx, generate_series(1, 3) as n where chave = 'org_a';
insert into public.metricas_anuncio_diarias
  (organizacao_id, campanha_id, conjunto_id_externo, anuncio_id_externo, data, gasto)
select valor, '70000000-0000-0000-0000-000000000001', 'cj-1', 'ad-1', current_date - 40, 100
from ctx where chave = 'org_a';

-- Reimportar o mesmo dia substitui (idempotente)
insert into public.metricas_anuncio_diarias
  (organizacao_id, campanha_id, conjunto_id_externo, anuncio_id_externo, data, gasto)
select valor, '70000000-0000-0000-0000-000000000001', 'cj-1', 'ad-1', current_date, 15
from ctx where chave = 'org_a'
on conflict (campanha_id, data, conjunto_id_externo, anuncio_id_externo)
do update set gasto = excluded.gasto;

select is(
  (select gasto_30d from public.campanhas_resumo where id = '70000000-0000-0000-0000-000000000001'),
  65::numeric(14,2),
  'gasto dos últimos 30 dias soma os anúncios do dia (15 + 20 + 30)'
);
select is(
  (select gasto_total from public.campanhas_resumo where id = '70000000-0000-0000-0000-000000000001'),
  165::numeric(14,2),
  'gasto total inclui o dia antigo'
);
select is(
  (select gasto_total from public.campanhas_resumo where id = '70000000-0000-0000-0000-000000000002'),
  0::numeric(14,2),
  'campanha sem métricas aparece com gasto zero'
);
select is(
  (select funil_id from public.campanhas_resumo where id = '70000000-0000-0000-0000-000000000001'),
  null,
  'campanha começa não vinculada'
);

-- Métrica não aponta para campanha de outra organização
select throws_ok(
  $$insert into public.metricas_anuncio_diarias (organizacao_id, campanha_id, data, gasto)
    select valor, '70000000-0000-0000-0000-000000000001', current_date, 1 from ctx where chave = 'org_b'$$,
  '23503', null,
  'métrica não aponta para campanha de outra organização'
);
reset role;

-- ---------------------------------------------------------------------------
-- A vincula a campanha ao funil; uma campanha só pode ter um funil
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;

select is((select count(*) from public.campanhas_resumo), 2::bigint, 'A vê as 2 campanhas');

insert into public.funil_campanhas (organizacao_id, funil_id, campanha_id)
select valor, '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001' from ctx where chave = 'org_a';
select is(
  (select funil_id from public.campanhas_resumo where id = '70000000-0000-0000-0000-000000000001'),
  '30000000-0000-0000-0000-000000000001'::uuid,
  'A vincula a campanha ao funil'
);
select throws_ok(
  $$insert into public.funil_campanhas (organizacao_id, funil_id, campanha_id)
    select valor, '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001' from ctx where chave = 'org_a'$$,
  '23505', null,
  'campanha não entra em dois funis'
);
select throws_ok(
  $$insert into public.campanhas (organizacao_id, conta_anuncio_id, plataforma, id_externo)
    select valor, '60000000-0000-0000-0000-000000000001', 'meta', 'nova' from ctx where chave = 'org_a'$$,
  '42501', null,
  'app não insere campanhas (só o conector)'
);
select throws_ok(
  $$insert into public.metricas_anuncio_diarias (organizacao_id, campanha_id, data, gasto)
    select valor, '70000000-0000-0000-0000-000000000001', current_date, 1 from ctx where chave = 'org_a'$$,
  '42501', null,
  'app não insere métricas (só o conector)'
);
reset role;

-- ---------------------------------------------------------------------------
-- B não vê nem mexe em nada da A
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.campanhas), 0::bigint, 'B não vê campanhas da A');
select is((select count(*) from public.campanhas_resumo), 0::bigint, 'B não vê o resumo da A');
select is((select count(*) from public.metricas_anuncio_diarias), 0::bigint, 'B não vê métricas da A');
select is((select count(*) from public.contas_anuncio), 0::bigint, 'B não vê contas da A');
select throws_ok(
  $$insert into public.funil_campanhas (organizacao_id, funil_id, campanha_id)
    select valor, '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002' from ctx where chave = 'org_a'$$,
  null, null,
  'B não vincula campanhas da A'
);
reset role;

-- Vínculo não pode cruzar organizações mesmo sem RLS
do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;
insert into public.funis (id, organizacao_id, categoria_id, nome)
select '30000000-0000-0000-0000-00000000000b', valor,
       (select id from public.categorias where organizacao_id = ctx.valor and nome = 'Front-end'),
       'Funil da B'
from ctx where chave = 'org_b';
select throws_ok(
  $$insert into public.funil_campanhas (organizacao_id, funil_id, campanha_id)
    select valor, '30000000-0000-0000-0000-00000000000b', '70000000-0000-0000-0000-000000000002' from ctx where chave = 'org_b'$$,
  '23503', null,
  'funil da B não recebe campanha da A'
);
reset role;

select * from finish();
rollback;
