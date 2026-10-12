-- Credenciais de integração: só membros gravam, o segredo fica no Vault e
-- nunca é lido por authenticated.
begin;
set client_min_messages to warning;
select plan(29);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

-- Colunas novas
select has_column('public', 'integracoes', 'credencial_sufixo',          'coluna credencial_sufixo');
select has_column('public', 'integracoes', 'credenciais_atualizadas_em', 'coluna credenciais_atualizadas_em');
select has_column('public', 'integracoes', 'erro',                       'coluna erro');

-- ---------------------------------------------------------------------------
-- A e B criam suas organizações
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_a', public.criar_organizacao('Empresa A');
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
insert into ctx select 'org_b', public.criar_organizacao('Empresa B');
reset role;

-- ---------------------------------------------------------------------------
-- Sem usuário autenticado
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
set local role authenticated;
select throws_ok(
  $$select public.guardar_credencial_integracao((select valor from ctx where chave = 'org_a'), 'greenn', 'grn_live_abcdef1234')$$,
  '42501', 'É preciso estar autenticado.',
  'guardar_credencial_integracao exige usuário autenticado'
);
reset role;

set local role anon;
select throws_ok(
  $$select public.guardar_credencial_integracao((select valor from ctx where chave = 'org_a'), 'greenn', 'grn_live_abcdef1234')$$,
  '42501', null,
  'anon não executa guardar_credencial_integracao'
);
reset role;

-- ---------------------------------------------------------------------------
-- A conecta a Greenn e o Meta na Empresa A
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;

insert into ctx select 'int_greenn', public.guardar_credencial_integracao(
  (select valor from ctx where chave = 'org_a'), 'greenn', '  grn_live_abcdef1234  '
);

select is(
  (select status from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  'configurada',
  'Greenn fica configurada após guardar a credencial'
);
select is(
  (select credencial_sufixo from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  '1234',
  'guarda só os 4 últimos caracteres (credencial aparada)'
);
select isnt(
  (select credenciais_secret_id from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  null,
  'referência ao segredo preenchida'
);
select isnt(
  (select credenciais_atualizadas_em from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  null,
  'data da credencial preenchida'
);

-- Trocar a credencial mantém a mesma integração e o mesmo segredo
select is(
  public.guardar_credencial_integracao(
    (select valor from ctx where chave = 'org_a'), 'greenn', 'grn_live_novo9999'
  ),
  (select valor from ctx where chave = 'int_greenn'),
  'trocar a credencial reaproveita a integração'
);
select is(
  (select credencial_sufixo from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  '9999',
  'sufixo acompanha a credencial nova'
);

-- Meta com configuração (conta de anúncios)
insert into ctx select 'int_meta', public.guardar_credencial_integracao(
  (select valor from ctx where chave = 'org_a'), 'meta', 'EAAB_token_meta_12345678',
  '{"conta_anuncios_id": "act_123"}'::jsonb
);
select is(
  (select config ->> 'conta_anuncios_id' from public.integracoes where id = (select valor from ctx where chave = 'int_meta')),
  'act_123',
  'config do Meta guarda a conta de anúncios'
);
select is((select count(*) from public.integracoes), 2::bigint, 'A vê as 2 integrações da Empresa A');

-- Validações
select throws_ok(
  $$select public.guardar_credencial_integracao((select valor from ctx where chave = 'org_a'), 'hotmart', 'token_valido_123')$$,
  '23514', 'Integração desconhecida.',
  'tipo desconhecido é rejeitado'
);
select throws_ok(
  $$select public.guardar_credencial_integracao((select valor from ctx where chave = 'org_a'), 'greenn', 'curto')$$,
  '23514', 'Informe a credencial da integração.',
  'credencial curta é rejeitada'
);

-- A não grava na Empresa B
select throws_ok(
  $$select public.guardar_credencial_integracao((select valor from ctx where chave = 'org_b'), 'greenn', 'grn_live_abcdef1234')$$,
  '42501', 'Você não faz parte desta organização.',
  'A não conecta integrações da Empresa B'
);

-- O segredo nunca é lido por authenticated
select throws_ok(
  $$select * from vault.secrets$$,
  '42501', null,
  'authenticated não lê vault.secrets'
);
select throws_ok(
  $$select * from vault.decrypted_secrets$$,
  '42501', null,
  'authenticated não lê vault.decrypted_secrets'
);
select throws_ok(
  $$select public.ler_credencial_integracao((select valor from ctx where chave = 'int_greenn'))$$,
  '42501', null,
  'authenticated não executa ler_credencial_integracao'
);

-- Escrita direta na tabela não existe mais para o app
select throws_ok(
  $$insert into public.integracoes (organizacao_id, tipo) values ((select valor from ctx where chave = 'org_a'), 'crm')$$,
  '42501', null,
  'app não insere em integracoes direto'
);
-- Sem política de update, o RLS não altera linha nenhuma (e não dá erro).
update public.integracoes set status = 'conectada';
select is(
  (select status from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  'configurada',
  'app não altera integracoes direto'
);
reset role;

-- ---------------------------------------------------------------------------
-- service_role (conectores) lê o segredo
-- ---------------------------------------------------------------------------
set local role service_role;
select is(
  public.ler_credencial_integracao((select valor from ctx where chave = 'int_greenn')),
  'grn_live_novo9999',
  'service_role lê a credencial atual em texto claro'
);
reset role;

select is(
  (select count(*) from vault.secrets),
  2::bigint,
  'um segredo no Vault por integração'
);

-- ---------------------------------------------------------------------------
-- B não vê nada da Empresa A
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.integracoes), 0::bigint, 'B não vê integrações da Empresa A');
select throws_ok(
  $$select public.remover_credencial_integracao((select valor from ctx where chave = 'org_a'), 'greenn')$$,
  '42501', 'Você não faz parte desta organização.',
  'B não desconecta integrações da Empresa A'
);
reset role;

-- ---------------------------------------------------------------------------
-- A desconecta a Greenn: segredo apagado, linha volta a desconectada
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select lives_ok(
  $$select public.remover_credencial_integracao((select valor from ctx where chave = 'org_a'), 'greenn')$$,
  'A desconecta a Greenn'
);
select is(
  (select status from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  'desconectada',
  'status volta para desconectada'
);
select is(
  (select credenciais_secret_id from public.integracoes where id = (select valor from ctx where chave = 'int_greenn')),
  null,
  'referência ao segredo limpa'
);
reset role;

select is(
  (select count(*) from vault.secrets),
  1::bigint,
  'segredo da Greenn apagado do Vault; o do Meta continua'
);

select * from finish();
rollback;
