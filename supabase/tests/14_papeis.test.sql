-- Papéis: administrador edita, visualizador só vê; nunca fica sem administrador.
begin;
set client_min_messages to warning;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');
create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

-- A cria a organização e vira administrador
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org', public.criar_organizacao('Empresa A');
select is((select papel from public.membros where user_id = '00000000-0000-0000-0000-00000000000a'), 'administrador', 'quem cria a organização é administrador');

select throws_ok(
  $$update public.membros set papel = 'visualizador' where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', 'A organização precisa ter pelo menos um administrador.',
  'o único administrador não pode se rebaixar'
);
select throws_ok(
  $$insert into public.membros (organizacao_id, user_id, papel) select valor, '00000000-0000-0000-0000-00000000000b', 'diretor' from ctx$$,
  '23514', null, 'papel desconhecido é recusado'
);
insert into public.membros (organizacao_id, user_id, papel)
select valor, '00000000-0000-0000-0000-00000000000b', 'visualizador' from ctx;
select is((select count(*) from public.membros), 2::bigint, 'administrador adiciona visualizador');
reset role;

-- B (visualizador) vê, mas não edita
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.categorias), 4::bigint, 'visualizador vê as categorias');
select is((select count(*) from public.organizacoes), 1::bigint, 'visualizador vê a organização');
select is((select count(*) from public.membros), 2::bigint, 'visualizador vê os membros');
select throws_ok(
  $$insert into public.categorias (organizacao_id, nome, ordem) select valor, 'Nova', 9 from ctx$$,
  '42501', null, 'visualizador não cria categoria'
);
update public.organizacoes set nome = 'Mudou';
select is((select nome from public.organizacoes), 'Empresa A', 'visualizador não edita a organização');
update public.categorias set nome = 'Mudou' where nome = 'Front-end';
select is((select count(*) from public.categorias where nome = 'Mudou'), 0::bigint, 'visualizador não edita categoria');
delete from public.categorias;
select is((select count(*) from public.categorias), 4::bigint, 'visualizador não apaga categoria');
update public.membros set papel = 'administrador' where user_id = '00000000-0000-0000-0000-00000000000b';
select is((select papel from public.membros where user_id = '00000000-0000-0000-0000-00000000000b'), 'visualizador', 'visualizador não se promove');
select throws_ok(
  format($$select public.definir_imposto_organizacao(%L, 0.1, 'bruto')$$, (select valor from ctx)),
  '42501', 'Só administradores podem alterar isso.',
  'visualizador não define imposto'
);
select throws_ok(
  format($$select public.guardar_credencial_integracao(%L, 'greenn', 'grn_live_x')$$, (select valor from ctx)),
  '42501', 'Só administradores podem alterar isso.',
  'visualizador não conecta integração'
);
reset role;

-- A promove B e então pode se rebaixar
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
update public.membros set papel = 'administrador' where user_id = '00000000-0000-0000-0000-00000000000b';
update public.membros set papel = 'visualizador' where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select papel from public.membros where user_id = '00000000-0000-0000-0000-00000000000a'), 'visualizador', 'com outro administrador, A pode virar visualizador');
select throws_ok(
  $$insert into public.categorias (organizacao_id, nome, ordem) select valor, 'Nova', 9 from ctx$$,
  '42501', null, 'rebaixado, A deixa de editar'
);
reset role;

select * from finish();
rollback;
