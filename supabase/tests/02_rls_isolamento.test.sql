-- Isolamento entre organizações e regras de negócio do banco.
-- Simula usuários trocando o papel e o "sub" do JWT, como o PostgREST faz.
begin;
set client_min_messages to warning;
select plan(39);

-- Três usuários no Auth: A e B terão organizações próprias; C começa sem nenhuma.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com'),
  ('00000000-0000-0000-0000-00000000000c', 'c@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sem usuário autenticado
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
set local role authenticated;

select throws_ok(
  $$select public.criar_organizacao('Sem dono')$$,
  '42501',
  'É preciso estar autenticado para criar uma organização.',
  'criar_organizacao exige usuário autenticado'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.organizacoes$$,
  '42501', null,
  'anon não lê organizacoes'
);
select throws_ok(
  $$select public.criar_organizacao('Anon')$$,
  '42501', null,
  'anon não executa criar_organizacao'
);
reset role;

-- ---------------------------------------------------------------------------
-- Usuário A cria a Empresa A
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;

insert into ctx select 'org_a', public.criar_organizacao('  Empresa A  ');

select is((select count(*) from public.organizacoes), 1::bigint, 'A vê 1 organização');
select is((select nome from public.organizacoes), 'Empresa A', 'nome salvo sem espaços extras');
select is((select taxa_anuncios from public.organizacoes), 0.1215, 'taxa sobre anúncios padrão 12,15%');
select is((select janela_transacao_min from public.organizacoes), 5, 'janela de transação padrão 5 min');
select is((select count(*) from public.categorias), 4::bigint, '4 categorias padrão');
select is(
  (select array_agg(nome order by ordem) from public.categorias),
  array['Iscas gratuitas', 'Front-end', 'Back-end', 'High-end'],
  'categorias na ordem padrão'
);
select is(
  (select array_agg(nome) from public.categorias where tem_semaforo),
  array['Front-end'],
  'só Front-end tem semáforo'
);
select is((select count(*) from public.membros), 1::bigint, 'A é o único membro');

-- A política não deixa o usuário remover a si mesmo...
delete from public.membros;
select is(
  (select count(*) from public.membros),
  1::bigint,
  'A não remove a si mesmo (política de delete)'
);

-- ...e, mesmo com service_role (sem RLS), o último membro é protegido pelo trigger.
reset role;
set local role service_role;
select throws_ok(
  $$delete from public.membros where organizacao_id = (select valor from ctx where chave = 'org_a')$$,
  '23514', null,
  'trigger impede remover o último membro'
);
reset role;
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Usuário B cria a Empresa B e tenta invadir a A
-- ---------------------------------------------------------------------------
reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;

insert into ctx select 'org_b', public.criar_organizacao('Empresa B');

select is((select count(*) from public.organizacoes), 1::bigint, 'B vê só 1 organização');
select is((select nome from public.organizacoes), 'Empresa B', 'B vê a própria organização');
select is(
  (select count(*) from public.categorias where organizacao_id = (select valor from ctx where chave = 'org_a')),
  0::bigint,
  'B não vê categorias da A'
);

select throws_ok(
  $$insert into public.categorias (organizacao_id, nome)
    select valor, 'Invasora' from ctx where chave = 'org_a'$$,
  '42501', null,
  'B não insere categoria na organização A'
);

update public.organizacoes set nome = 'Hackeada'
where id = (select valor from ctx where chave = 'org_a');
reset role;
set local role service_role;
select is(
  (select nome from public.organizacoes where id = (select valor from ctx where chave = 'org_a')),
  'Empresa A',
  'B não altera a organização A'
);
reset role;
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;

-- Funil da B apontando para categoria da A: bloqueado.
select throws_ok(
  $$insert into public.funis (organizacao_id, categoria_id, nome)
    values (
      (select valor from ctx where chave = 'org_b'),
      (select id from public.categorias where organizacao_id = (select valor from ctx where chave = 'org_a') limit 1),
      'Funil misto')$$,
  null, null,
  'funil não aponta para categoria de outra organização'
);

-- ---------------------------------------------------------------------------
-- Regras de funil (como B)
-- ---------------------------------------------------------------------------
select lives_ok(
  $$insert into public.funis (organizacao_id, categoria_id, nome, tipo, meta_roi)
    values (
      (select valor from ctx where chave = 'org_b'),
      (select id from public.categorias where nome = 'Front-end'),
      'Funil Desafio', 'venda_direta', 0.25)$$,
  'cria funil de venda direta'
);

select throws_ok(
  $$insert into public.funis (organizacao_id, categoria_id, nome, tipo)
    values (
      (select valor from ctx where chave = 'org_b'),
      (select id from public.categorias where nome = 'Back-end'),
      'Lançamento sem datas', 'lancamento')$$,
  '23514', null,
  'lançamento exige datas'
);

select lives_ok(
  $$insert into public.funis (organizacao_id, categoria_id, nome, tipo, data_inicio, data_fim)
    values (
      (select valor from ctx where chave = 'org_b'),
      (select id from public.categorias where nome = 'Back-end'),
      'Lançamento Outubro', 'lancamento', '2026-10-01', '2026-10-15')$$,
  'cria lançamento com datas'
);

select throws_ok(
  $$insert into public.funis (organizacao_id, categoria_id, nome)
    values (
      (select valor from ctx where chave = 'org_b'),
      (select id from public.categorias where nome = 'Front-end'),
      'Funil Desafio')$$,
  '23505', null,
  'nome de funil é único na organização'
);

-- Categoria com funil não pode ser excluída.
select throws_ok(
  $$delete from public.categorias where nome = 'Front-end'$$,
  '23503', null,
  'categoria com funis não é excluída'
);

-- ---------------------------------------------------------------------------
-- Produtos, ofertas, histórico e papel único (como B)
-- ---------------------------------------------------------------------------
insert into public.produtos (organizacao_id, plataforma, id_externo, nome, aliquota_imposto, base_imposto)
values ((select valor from ctx where chave = 'org_b'), 'greenn', 'P1', 'Curso X', 0.06, 'liquido');

select is(
  (select count(*) from public.historico_aliquotas),
  1::bigint,
  'produto nasce com uma vigência de alíquota'
);

update public.produtos set aliquota_imposto = 0.08 where id_externo = 'P1';

select is(
  (select count(*) from public.historico_aliquotas),
  2::bigint,
  'mudar alíquota abre nova vigência'
);
select is(
  (select count(*) from public.historico_aliquotas where vigencia_fim is null),
  1::bigint,
  'só uma vigência aberta por produto'
);
select is(
  (select aliquota from public.historico_aliquotas where vigencia_fim is null),
  0.08,
  'vigência aberta tem a alíquota nova'
);

select throws_ok(
  $$insert into public.historico_aliquotas (organizacao_id, produto_id, aliquota, base)
    select organizacao_id, id, 0.1, 'bruto' from public.produtos$$,
  '42501', null,
  'usuário não escreve direto no histórico de alíquotas'
);

insert into public.ofertas (organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select organizacao_id, 'greenn', '123', id, 'Curso X R$27', 27.00 from public.produtos
union all
select organizacao_id, 'greenn', '456', id, 'Curso X R$37', 37.00 from public.produtos;

insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel)
select f.organizacao_id, f.id, o.id, 'front'
from public.funis f, public.ofertas o
where f.nome = 'Funil Desafio' and o.id_externo = '123';

select throws_ok(
  $$insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel)
    select f.organizacao_id, f.id, o.id, 'bump'
    from public.funis f, public.ofertas o
    where f.nome = 'Lançamento Outubro' and o.id_externo = '123'$$,
  '23505', null,
  'a mesma oferta não entra em dois funis'
);

select throws_ok(
  $$insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel)
    select f.organizacao_id, f.id, o.id, 'chefe'
    from public.funis f, public.ofertas o
    where f.nome = 'Funil Desafio' and o.id_externo = '456'$$,
  '23514', null,
  'papel inválido é rejeitado'
);

-- Produto com oferta não pode ser excluído.
select throws_ok(
  $$delete from public.produtos$$,
  '23503', null,
  'produto com ofertas não é excluído'
);

-- ---------------------------------------------------------------------------
-- Membros: B adiciona A à Empresa B; A passa a ver as duas.
-- ---------------------------------------------------------------------------
insert into public.membros (organizacao_id, user_id)
values ((select valor from ctx where chave = 'org_b'), '00000000-0000-0000-0000-00000000000a');

select is((select count(*) from public.membros), 2::bigint, 'B vê 2 membros');

-- B não consegue remover a si mesmo (política), mas remove A.
delete from public.membros where user_id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select count(*) from public.membros),
  2::bigint,
  'B não remove a si mesmo'
);

reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;

select is((select count(*) from public.organizacoes), 2::bigint, 'A agora vê as duas organizações');
select is((select count(*) from public.categorias), 8::bigint, 'A vê as categorias das duas');

reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;

select lives_ok(
  $$delete from public.membros where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  'B remove A da Empresa B'
);

-- ---------------------------------------------------------------------------
-- Usuário C sem organização
-- ---------------------------------------------------------------------------
reset role;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true); end $$;
set local role authenticated;

select is((select count(*) from public.organizacoes), 0::bigint, 'C sem organização não vê nada');
select is((select count(*) from public.categorias), 0::bigint, 'C não vê categorias de ninguém');

reset role;
select * from finish();
rollback;
