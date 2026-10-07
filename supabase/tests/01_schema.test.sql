-- Estrutura: tabelas existem, todas com RLS ligado, funções de apoio presentes.
begin;
set client_min_messages to warning;
select plan(20);

select has_table('public', 'organizacoes',        'tabela organizacoes');
select has_table('public', 'membros',             'tabela membros');
select has_table('public', 'integracoes',         'tabela integracoes');
select has_table('public', 'categorias',          'tabela categorias');
select has_table('public', 'produtos',            'tabela produtos');
select has_table('public', 'historico_aliquotas', 'tabela historico_aliquotas');
select has_table('public', 'ofertas',             'tabela ofertas');
select has_table('public', 'funis',               'tabela funis');
select has_table('public', 'funil_ofertas',       'tabela funil_ofertas');

-- Toda tabela de negócio tem RLS ligado (regra do CLAUDE.md).
select is(
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint,
  'nenhuma tabela em public sem RLS'
);

-- Toda tabela de negócio tem organizacao_id.
select is(
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'organizacoes'
      and not exists (
        select 1 from pg_attribute a
        where a.attrelid = c.oid and a.attname = 'organizacao_id' and not a.attisdropped
      )),
  0::bigint,
  'toda tabela (exceto organizacoes) tem organizacao_id'
);

-- Toda tabela tem ao menos uma política.
select is(
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)),
  0::bigint,
  'toda tabela tem política de RLS'
);

select has_function('public', 'criar_organizacao', array['text'], 'função criar_organizacao(text)');
select has_function('public', 'organizacoes_do_usuario', 'função organizacoes_do_usuario()');
select is(
  (select prosecdef from pg_proc where proname = 'organizacoes_do_usuario'),
  true, 'organizacoes_do_usuario é security definer'
);
select is(
  (select prosecdef from pg_proc where proname = 'criar_organizacao'),
  true, 'criar_organizacao é security definer'
);

-- anon não tem privilégio em nenhuma tabela.
select is(
  (select count(*) from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'),
  0::bigint,
  'anon sem privilégios em public'
);

-- Restrições-chave
select col_is_unique('public', 'funil_ofertas', 'oferta_id', 'uma oferta só entra em um funil');
select has_index('public', 'membros', 'membros_user_id_idx', 'índice em membros.user_id');
select is(
  (select count(*) from pg_constraint where conrelid = 'public.historico_aliquotas'::regclass and contype = 'x'),
  1::bigint, 'historico_aliquotas tem exclusão de vigências sobrepostas'
);

select * from finish();
rollback;
