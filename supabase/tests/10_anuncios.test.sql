-- Anúncios com criativo: só o conector escreve; membro lê só a própria organização.
begin;
set client_min_messages to warning;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

select has_table('public', 'anuncios', 'tabela anuncios');
select col_is_unique('public', 'anuncios', array['organizacao_id', 'plataforma', 'id_externo'], 'anúncio único por organização e plataforma');

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

insert into public.anuncios (organizacao_id, campanha_id, plataforma, id_externo, nome, status, ativo, criativo_tipo, miniatura_url)
select valor, '70000000-0000-0000-0000-000000000001', 'meta', 'ad-1', 'Anúncio 1', 'ACTIVE', true, 'video', 'https://cdn/thumb.jpg'
from ctx where chave = 'org_a';

-- Reimportar substitui (idempotente pela chave externa)
insert into public.anuncios (organizacao_id, campanha_id, plataforma, id_externo, nome, status, ativo, criativo_tipo)
select valor, '70000000-0000-0000-0000-000000000001', 'meta', 'ad-1', 'Anúncio 1 novo', 'PAUSED', false, 'imagem'
from ctx where chave = 'org_a'
on conflict (organizacao_id, plataforma, id_externo) do update
  set nome = excluded.nome, status = excluded.status, ativo = excluded.ativo, criativo_tipo = excluded.criativo_tipo;
select is((select count(*) from public.anuncios), 1::bigint, 'upsert não duplica');
select is((select status from public.anuncios where id_externo = 'ad-1'), 'PAUSED', 'upsert atualiza o status');

-- Campanha de outra organização é recusada
select throws_ok(
  $$insert into public.anuncios (organizacao_id, campanha_id, plataforma, id_externo)
    select valor, '70000000-0000-0000-0000-000000000001', 'meta', 'ad-x' from ctx where chave = 'org_b'$$,
  '23503', null, 'anúncio não aponta para campanha de outra organização'
);
reset role;

-- Membro A lê; não escreve
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.anuncios), 1::bigint, 'A vê o anúncio');
select throws_ok(
  $$insert into public.anuncios (organizacao_id, campanha_id, plataforma, id_externo)
    select valor, '70000000-0000-0000-0000-000000000001', 'meta', 'ad-2' from ctx where chave = 'org_a'$$,
  '42501', null, 'app não insere anúncios (só o conector)'
);
reset role;

-- Membro B não vê
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.anuncios), 0::bigint, 'B não vê anúncios da A');
reset role;

select * from finish();
rollback;
