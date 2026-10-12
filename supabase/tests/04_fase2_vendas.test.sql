-- Fase 2: vendas, clientes, transações, recompra, sugestões e isolamento.
begin;
set client_min_messages to warning;
select plan(45);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.com');

create temp table ctx (chave text primary key, valor uuid);
grant all on ctx to authenticated, service_role;

-- Schema
select has_table('public', 'clientes',            'tabela clientes');
select has_table('public', 'vendas',              'tabela vendas');
select has_table('public', 'transacoes',          'tabela transacoes');
select has_table('public', 'comissoes',           'tabela comissoes');
select has_table('public', 'sincronizacoes',      'tabela sincronizacoes');
select has_table('public', 'ofertas_descartadas', 'tabela ofertas_descartadas');
select has_view('public', 'conferencia_vendas_mensal', 'view conferencia_vendas_mensal');
select has_column('public', 'integracoes', 'ultimo_corte', 'coluna integracoes.ultimo_corte');

-- ---------------------------------------------------------------------------
-- Organizações A e B
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
-- Dados de semente na Empresa A, como o conector faria (service_role)
-- ---------------------------------------------------------------------------
-- service_role não carrega "sub": auth.uid() é null, como no Supabase.
do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;

insert into public.produtos (id, organizacao_id, plataforma, id_externo, nome, aliquota_imposto)
select '10000000-0000-0000-0000-000000000001', valor, 'greenn', 'p1', 'Curso', 0.06 from ctx where chave = 'org_a';

insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '20000000-0000-0000-0000-000000000001', valor, 'greenn', 'o-front', '10000000-0000-0000-0000-000000000001', 'Front R$97', 97 from ctx where chave = 'org_a';
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '20000000-0000-0000-0000-000000000002', valor, 'greenn', 'o-bump', '10000000-0000-0000-0000-000000000001', 'Bump R$27', 27 from ctx where chave = 'org_a';
insert into public.ofertas (id, organizacao_id, plataforma, id_externo, produto_id, nome, preco)
select '20000000-0000-0000-0000-000000000003', valor, 'greenn', 'o-upsell', '10000000-0000-0000-0000-000000000001', 'Upsell R$297', 297 from ctx where chave = 'org_a';

insert into public.funis (id, organizacao_id, categoria_id, nome)
select '30000000-0000-0000-0000-000000000001', valor,
       (select id from public.categorias where organizacao_id = ctx.valor and nome = 'Front-end'),
       'Funil Desafio'
from ctx where chave = 'org_a';

insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel, status)
select valor, '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'front', 'confirmado'
from ctx where chave = 'org_a';

-- Cliente X: exemplo canônico (10h00, 10h03, 10h07)
insert into public.clientes (id, organizacao_id, email, plataforma, id_externo)
select '40000000-0000-0000-0000-000000000001', valor, 'x@teste.com', 'greenn', 'c-x' from ctx where chave = 'org_a';

insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
select valor, 'greenn', 'v' || n, '40000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
       'aprovada', 97, ('2026-09-01 10:00-03'::timestamptz + make_interval(mins => m))
from ctx, (values (1, 0), (2, 3), (3, 7)) as s(n, m)
where chave = 'org_a';

select is(
  public.recalcular_transacoes((select valor from ctx where chave = 'org_a')),
  2,
  'exemplo canônico: 10h00, 10h03 e 10h07 geram 2 transações'
);
select is(
  (select array_agg(eh_recompra order by ordem) from public.transacoes where cliente_id = '40000000-0000-0000-0000-000000000001'),
  array[false, true],
  'a segunda transação (10h07) é recompra'
);
select is(
  (select quantidade_vendas from public.transacoes where cliente_id = '40000000-0000-0000-0000-000000000001' and ordem = 1),
  2,
  'primeira transação agrupa 10h00 e 10h03'
);
select is(
  (select funil_entrada_id from public.clientes where id = '40000000-0000-0000-0000-000000000001'),
  '30000000-0000-0000-0000-000000000001'::uuid,
  'funil de entrada do cliente = funil do front da primeira transação'
);
select is(
  (select primeira_compra_em from public.clientes where id = '40000000-0000-0000-0000-000000000001'),
  '2026-09-01 10:00-03'::timestamptz,
  'primeira compra registrada no cliente'
);
select is(
  (select count(*) from public.vendas where cliente_id = '40000000-0000-0000-0000-000000000001' and transacao_id is null),
  0::bigint,
  'todas as vendas apontam para uma transação'
);

-- Janela maior: vira uma transação só
update public.organizacoes set janela_transacao_min = 10 where id = (select valor from ctx where chave = 'org_a');
select is(
  public.recalcular_transacoes((select valor from ctx where chave = 'org_a'), array['40000000-0000-0000-0000-000000000001'::uuid]),
  1,
  'com janela de 10 min, as três compras viram 1 transação'
);
update public.organizacoes set janela_transacao_min = 5 where id = (select valor from ctx where chave = 'org_a');

-- Renovação de assinatura fica fora das transações
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em, origem)
select valor, 'greenn', 'v-rec', '40000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
       'aprovada', 97, '2026-10-01 10:00-03', 'recorrencia'
from ctx where chave = 'org_a';
select is(
  public.recalcular_transacoes((select valor from ctx where chave = 'org_a'), array['40000000-0000-0000-0000-000000000001'::uuid]),
  2,
  'recorrência não cria transação'
);
select is(
  (select transacao_id from public.vendas where id_externo = 'v-rec'),
  null,
  'venda de recorrência fica sem transação'
);

-- Clientes 1..3: front + bump na mesma hora (sugestão de bump)
insert into public.clientes (id, organizacao_id, email)
select ('40000000-0000-0000-0000-00000000001' || n)::uuid, valor, 'c' || n || '@teste.com'
from ctx, generate_series(1, 3) as n where chave = 'org_a';

insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
select valor, 'greenn', 'f' || n, ('40000000-0000-0000-0000-00000000001' || n)::uuid,
       '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aprovada', 97,
       '2026-09-02 09:00-03'::timestamptz + make_interval(hours => n)
from ctx, generate_series(1, 3) as n where chave = 'org_a';
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
select valor, 'greenn', 'b' || n, ('40000000-0000-0000-0000-00000000001' || n)::uuid,
       '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'aprovada', 27,
       '2026-09-02 09:01-03'::timestamptz + make_interval(hours => n)
from ctx, generate_series(1, 3) as n where chave = 'org_a';

-- Clientes 4..6: front e, dois dias depois, o upsell (sugestão de upsell)
insert into public.clientes (id, organizacao_id, email)
select ('40000000-0000-0000-0000-00000000002' || n)::uuid, valor, 'd' || n || '@teste.com'
from ctx, generate_series(1, 3) as n where chave = 'org_a';
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
select valor, 'greenn', 'g' || n, ('40000000-0000-0000-0000-00000000002' || n)::uuid,
       '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aprovada', 97,
       '2026-09-03 09:00-03'::timestamptz + make_interval(hours => n)
from ctx, generate_series(1, 3) as n where chave = 'org_a';
insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em, reembolsada_em)
select valor, 'greenn', 'u' || n, ('40000000-0000-0000-0000-00000000002' || n)::uuid,
       '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
       case when n = 1 then 'reembolsada' else 'aprovada' end, 297,
       '2026-09-05 09:00-03'::timestamptz + make_interval(hours => n),
       case when n = 1 then '2026-09-06 12:00-03'::timestamptz else null end
from ctx, generate_series(1, 3) as n where chave = 'org_a';

select is(
  public.recalcular_transacoes((select valor from ctx where chave = 'org_a')),
  11,
  'transações de todos os clientes: X=2, c1..3=3, d1..3=6'
);

select is(
  public.sugerir_ofertas((select valor from ctx where chave = 'org_a')),
  2,
  'sugere bump e upsell'
);
select is(
  (select papel || '/' || status from public.funil_ofertas where oferta_id = '20000000-0000-0000-0000-000000000002'),
  'bump/sugerido',
  'oferta vendida junto com o front vira sugestão de bump'
);
select is(
  (select papel || '/' || status from public.funil_ofertas where oferta_id = '20000000-0000-0000-0000-000000000003'),
  'upsell/sugerido',
  'oferta comprada até 7 dias depois vira sugestão de upsell'
);
select is(
  public.sugerir_ofertas((select valor from ctx where chave = 'org_a')),
  0,
  'rodar de novo não duplica sugestões'
);

-- Descartar a sugestão de upsell: não volta
delete from public.funil_ofertas where oferta_id = '20000000-0000-0000-0000-000000000003';
insert into public.ofertas_descartadas (organizacao_id, funil_id, oferta_id, papel)
select valor, '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'upsell'
from ctx where chave = 'org_a';
select is(
  public.sugerir_ofertas((select valor from ctx where chave = 'org_a')),
  0,
  'sugestão descartada não volta'
);

-- Conferência mensal (setembro, fuso America/Sao_Paulo)
select is(
  (select faturamento_bruto from public.conferencia_vendas_mensal
   where organizacao_id = (select valor from ctx where chave = 'org_a')
     and oferta_id = '20000000-0000-0000-0000-000000000001' and mes = '2026-09-01'),
  (97 * 9)::numeric(14,2),
  'conferência: 9 vendas do front em setembro'
);
select is(
  (select reembolsos from public.conferencia_vendas_mensal
   where organizacao_id = (select valor from ctx where chave = 'org_a')
     and oferta_id = '20000000-0000-0000-0000-000000000003' and mes = '2026-09-01'),
  297::numeric(14,2),
  'conferência: 1 upsell reembolsado em setembro'
);
select is(
  (select quantidade_aprovadas from public.conferencia_vendas_mensal
   where organizacao_id = (select valor from ctx where chave = 'org_a')
     and oferta_id = '20000000-0000-0000-0000-000000000001' and mes = '2026-10-01'),
  1::bigint,
  'conferência: a recorrência de outubro conta no faturamento'
);

-- Venda não pode apontar para cliente de outra organização
select throws_ok(
  $$insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
    select valor, 'greenn', 'v-mista', '40000000-0000-0000-0000-000000000001',
           '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aprovada', 1, now()
    from ctx where chave = 'org_b'$$,
  '23503', null,
  'venda não aponta para cliente de outra organização'
);

-- Reembolsada exige data
select throws_ok(
  $$insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
    select valor, 'greenn', 'v-sem-data', '40000000-0000-0000-0000-000000000001',
           '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'reembolsada', 1, now()
    from ctx where chave = 'org_a'$$,
  '23514', null,
  'venda reembolsada exige reembolsada_em'
);

-- Um ciclo por integração por vez
insert into public.integracoes (id, organizacao_id, tipo)
select '50000000-0000-0000-0000-000000000001', valor, 'greenn' from ctx where chave = 'org_a';
insert into public.sincronizacoes (organizacao_id, integracao_id, modo, origem)
select valor, '50000000-0000-0000-0000-000000000001', 'incremental', 'agendado' from ctx where chave = 'org_a';
select throws_ok(
  $$insert into public.sincronizacoes (organizacao_id, integracao_id, modo, origem)
    select valor, '50000000-0000-0000-0000-000000000001', 'incremental', 'botao' from ctx where chave = 'org_a'$$,
  '23505', null,
  'não inicia um segundo ciclo enquanto um está executando'
);

-- Recalcular histórico de alíquota: uma vigência só, desde a primeira venda
update public.produtos set aliquota_imposto = 0.10 where id = '10000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.historico_aliquotas where produto_id = '10000000-0000-0000-0000-000000000001'),
  2::bigint,
  'mudar a alíquota abre uma segunda vigência (só daqui para frente)'
);
select lives_ok(
  $$select public.recalcular_aliquota_historico('10000000-0000-0000-0000-000000000001')$$,
  'recalcular histórico roda'
);
select is(
  (select count(*) from public.historico_aliquotas where produto_id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'recalcular histórico deixa uma vigência só'
);
select is(
  (select vigencia_inicio from public.historico_aliquotas where produto_id = '10000000-0000-0000-0000-000000000001'),
  '2026-09-01 10:00-03'::timestamptz,
  'a vigência única começa na primeira venda'
);
select is(
  (select aliquota from public.historico_aliquotas where produto_id = '10000000-0000-0000-0000-000000000001'),
  0.10::numeric(6,4),
  'a vigência única tem a alíquota atual'
);
reset role;

-- ---------------------------------------------------------------------------
-- RLS: A lê os próprios dados e não escreve; B não vê nada da A
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.vendas), 16::bigint, 'A vê as 16 vendas da Empresa A');
select is((select count(*) from public.clientes), 7::bigint, 'A vê os 7 clientes');
select is((select count(*) from public.transacoes), 11::bigint, 'A vê as 11 transações');
select is((select count(*) from public.sincronizacoes), 1::bigint, 'A vê a sincronização');
select throws_ok(
  $$insert into public.vendas (organizacao_id, plataforma, id_externo, cliente_id, oferta_id, produto_id, status, valor_bruto, vendida_em)
    select valor, 'greenn', 'v-app', '40000000-0000-0000-0000-000000000001',
           '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aprovada', 1, now()
    from ctx where chave = 'org_a'$$,
  '42501', null,
  'app não insere vendas (só os conectores)'
);
select lives_ok(
  $$select public.recalcular_transacoes((select valor from ctx where chave = 'org_a'))$$,
  'membro pode recalcular as transações da própria organização'
);
select throws_ok(
  $$select public.recalcular_transacoes((select valor from ctx where chave = 'org_b'))$$,
  '42501', null,
  'membro não recalcula transações de outra organização'
);
reset role;

do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from public.vendas), 0::bigint, 'B não vê vendas da A');
select is((select count(*) from public.clientes), 0::bigint, 'B não vê clientes da A');
select is((select count(*) from public.conferencia_vendas_mensal), 0::bigint, 'B não vê a conferência da A (view com security_invoker)');
select throws_ok(
  $$select public.sugerir_ofertas((select valor from ctx where chave = 'org_a'))$$,
  '42501', null,
  'B não roda sugestões na organização A'
);
reset role;

select * from finish();
rollback;
