-- Conjuntos de anúncios: só o conector escreve; membro lê só a própria organização.
begin;
set client_min_messages to warning;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

select has_table('public', 'conjuntos', 'tabela conjuntos');

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
insert into public.integracoes (id, organizacao_id, tipo, status)
select '50000000-0000-0000-0000-000000000001', valor, 'meta', 'configurada' from ctx where chave = 'org_a';
insert into public.contas_anuncio (id, organizacao_id, integracao_id, plataforma, id_externo, nome, moeda)
select '60000000-0000-0000-0000-000000000001', valor, '50000000-0000-0000-0000-000000000001', 'meta', 'act_123', 'Conta A', 'BRL'
from ctx where chave = 'org_a';
insert into public.campanhas (id, organizacao_id, conta_anuncio_id, plataforma, id_externo, nome, status)
select '70000000-0000-0000-0000-000000000001', valor, '60000000-0000-0000-0000-000000000001', 'meta', 'camp-1', 'Campanha 1', 'ACTIVE'
from ctx where chave = 'org_a';
insert into public.conjuntos (organizacao_id, campanha_id, plataforma, id_externo, nome, status, ativo)
select valor, '70000000-0000-0000-0000-000000000001', 'meta', 'cj-1', 'Conjunto 1', 'PAUSED', false
from ctx where chave = 'org_a';
select is((select ativo from public.conjuntos where id_externo = 'cj-1'), false, 'conjunto gravado com status');
select throws_ok(
  $$insert into public.conjuntos (organizacao_id, campanha_id, plataforma, id_externo)
    select valor, '70000000-0000-0000-0000-000000000001', 'meta', 'cj-x' from ctx where chave = 'org_b'$$,
  '23503', null, 'conjunto não aponta para campanha de outra organização'
);
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.conjuntos), 1::bigint, 'A vê o conjunto');
reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.conjuntos), 0::bigint, 'B não vê conjuntos da A');
reset role;

select * from finish();
rollback;
