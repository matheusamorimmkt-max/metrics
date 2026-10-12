-- Fase 2 / Etapa 1 — Vendas, clientes, transações e sincronizações
--
-- Tudo aqui é preenchido pelos conectores (service_role) e lido pelo app.
-- O usuário só escreve em ofertas_descartadas (descartar sugestão) e chama as
-- funções de recálculo. Convenções da Fase 1: organizacao_id com RLS,
-- plataforma + id_externo únicos por organização, dinheiro numeric(14,2).

-- ---------------------------------------------------------------------------
-- integracoes: controle do ciclo e da importação retroativa
-- ---------------------------------------------------------------------------
alter table public.integracoes
  add column if not exists ultimo_corte             timestamptz,
  add column if not exists importacao_inicio        date,
  add column if not exists importacao_concluida_em  timestamptz;

comment on column public.integracoes.ultimo_corte is
  'Horário de corte do último ciclo incremental concluído. O próximo busca a partir daqui (com folga).';
comment on column public.integracoes.importacao_inicio is
  'Data inicial da importação retroativa escolhida pelo usuário (null = desde a primeira venda).';
comment on column public.integracoes.importacao_concluida_em is
  'Quando a importação retroativa terminou. Null = ainda não rodou ou está em andamento.';

-- ---------------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------------
create table public.clientes (
  id                  uuid primary key default gen_random_uuid(),
  organizacao_id      uuid not null references public.organizacoes(id) on delete cascade,
  -- Chave de identidade: e-mail em minúsculas e sem espaços.
  email               text not null check (email = lower(trim(email)) and length(email) between 3 and 320),
  cpf                 text check (cpf is null or cpf ~ '^[0-9]{11,14}$'),
  nome                text,
  -- Último id do cliente visto no gateway. Dois ids com o mesmo e-mail são o mesmo cliente.
  plataforma          text check (plataforma is null or length(plataforma) between 1 and 40),
  id_externo          text check (id_externo is null or length(id_externo) between 1 and 120),
  primeira_compra_em  timestamptz,
  funil_entrada_id    uuid references public.funis(id) on delete set null,
  cpf_duplicado       boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organizacao_id, email)
);

comment on table public.clientes is
  'Cliente único por e-mail. CPF só sinaliza duplicidade (cpf_duplicado), nunca mescla sozinho.';
comment on column public.clientes.funil_entrada_id is
  'Funil da primeira transação do cliente. Toda recompra é atribuída a ele.';

create index clientes_organizacao_idx on public.clientes (organizacao_id);
create index clientes_cpf_idx on public.clientes (organizacao_id, cpf) where cpf is not null;
create index clientes_id_externo_idx on public.clientes (organizacao_id, plataforma, id_externo);

create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create trigger clientes_mesma_org_funil
  before insert or update of funil_entrada_id, organizacao_id on public.clientes
  for each row when (new.funil_entrada_id is not null)
  execute function public.valida_mesma_organizacao('funis', 'funil_entrada_id');

-- ---------------------------------------------------------------------------
-- transacoes (criadas por recalcular_transacoes; vendas apontam para cá)
-- ---------------------------------------------------------------------------
create table public.transacoes (
  id                 uuid primary key default gen_random_uuid(),
  organizacao_id     uuid not null references public.organizacoes(id) on delete cascade,
  cliente_id         uuid not null references public.clientes(id) on delete cascade,
  -- Funil da oferta front da transação; senão, da primeira venda; senão null.
  funil_id           uuid references public.funis(id) on delete set null,
  inicio             timestamptz not null,
  fim                timestamptz not null,
  valor_total        numeric(14,2) not null default 0,
  quantidade_vendas  integer not null default 0,
  -- 1 = primeira transação do cliente; 2+ = recompra.
  ordem              integer not null check (ordem >= 1),
  eh_recompra        boolean not null default false,
  created_at         timestamptz not null default now(),
  check (fim >= inicio)
);

comment on table public.transacoes is
  'Compras do mesmo cliente dentro da janela (organizacoes.janela_transacao_min) a partir da primeira compra do grupo.';

create index transacoes_organizacao_inicio_idx on public.transacoes (organizacao_id, inicio);
create index transacoes_cliente_ordem_idx on public.transacoes (cliente_id, ordem);
create index transacoes_funil_idx on public.transacoes (funil_id);

create trigger transacoes_mesma_org_cliente
  before insert or update of cliente_id, organizacao_id on public.transacoes
  for each row execute function public.valida_mesma_organizacao('clientes', 'cliente_id');

create trigger transacoes_mesma_org_funil
  before insert or update of funil_id, organizacao_id on public.transacoes
  for each row when (new.funil_id is not null)
  execute function public.valida_mesma_organizacao('funis', 'funil_id');

-- ---------------------------------------------------------------------------
-- vendas
-- ---------------------------------------------------------------------------
create table public.vendas (
  id                     uuid primary key default gen_random_uuid(),
  organizacao_id         uuid not null references public.organizacoes(id) on delete cascade,
  plataforma             text not null check (length(plataforma) between 1 and 40),
  id_externo             text not null check (length(id_externo) between 1 and 120),
  cliente_id             uuid not null references public.clientes(id) on delete restrict,
  oferta_id              uuid not null references public.ofertas(id) on delete restrict,
  produto_id             uuid not null references public.produtos(id) on delete restrict,
  transacao_id           uuid references public.transacoes(id) on delete set null,
  -- Só vendas que já foram pagas em algum momento entram aqui.
  status                 text not null check (status in ('aprovada', 'reembolsada', 'chargeback')),
  status_externo         text,
  reembolso_pendente     boolean not null default false,
  -- unica: compra avulsa. assinatura_primeira: 1ª cobrança do contrato. recorrencia: renovações (fora da recompra).
  origem                 text not null default 'unica'
                         check (origem in ('unica', 'assinatura_primeira', 'recorrencia')),
  assinatura_id_externo  text,
  valor_bruto            numeric(14,2) not null check (valor_bruto >= 0),
  taxa_gateway           numeric(14,2) not null default 0 check (taxa_gateway >= 0),
  -- gateway: valor informado pela plataforma. estimada: calculado pela tabela de taxas. desconhecida: ainda sem fonte.
  taxa_gateway_origem    text not null default 'desconhecida'
                         check (taxa_gateway_origem in ('gateway', 'estimada', 'desconhecida')),
  valor_parceiros        numeric(14,2) not null default 0 check (valor_parceiros >= 0),
  moeda                  char(3) not null default 'BRL',
  meio_pagamento         text,
  parcelas               integer not null default 1 check (parcelas >= 1),
  cupom                  text,
  afiliado_id_externo    text,
  utm                    jsonb not null default '{}'::jsonb,
  -- Data da venda = data do pagamento (paid_at).
  vendida_em             timestamptz not null,
  criada_em              timestamptz,
  reembolsada_em         timestamptz,
  -- JSON como veio da API, para auditoria e reprocessamento sem chamar a plataforma de novo.
  dados_brutos           jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organizacao_id, plataforma, id_externo),
  check (status = 'aprovada' or reembolsada_em is not null)
);

comment on table public.vendas is
  'Cada item aprovado no gateway (front, bump e upsell contam separados). Faturamento bruto = soma de valor_bruto das aprovadas.';

create index vendas_organizacao_vendida_idx on public.vendas (organizacao_id, vendida_em);
create index vendas_cliente_vendida_idx on public.vendas (cliente_id, vendida_em);
create index vendas_oferta_idx on public.vendas (oferta_id);
create index vendas_transacao_idx on public.vendas (transacao_id);
create index vendas_reembolsada_idx on public.vendas (organizacao_id, reembolsada_em) where reembolsada_em is not null;

create trigger vendas_updated_at
  before update on public.vendas
  for each row execute function public.set_updated_at();

create trigger vendas_mesma_org_cliente
  before insert or update of cliente_id, organizacao_id on public.vendas
  for each row execute function public.valida_mesma_organizacao('clientes', 'cliente_id');

create trigger vendas_mesma_org_oferta
  before insert or update of oferta_id, organizacao_id on public.vendas
  for each row execute function public.valida_mesma_organizacao('ofertas', 'oferta_id');

create trigger vendas_mesma_org_produto
  before insert or update of produto_id, organizacao_id on public.vendas
  for each row execute function public.valida_mesma_organizacao('produtos', 'produto_id');

create trigger vendas_mesma_org_transacao
  before insert or update of transacao_id, organizacao_id on public.vendas
  for each row when (new.transacao_id is not null)
  execute function public.valida_mesma_organizacao('transacoes', 'transacao_id');

-- ---------------------------------------------------------------------------
-- comissoes (parceiros por venda: afiliado, coprodutor, outros)
-- ---------------------------------------------------------------------------
create table public.comissoes (
  id                   uuid primary key default gen_random_uuid(),
  organizacao_id       uuid not null references public.organizacoes(id) on delete cascade,
  venda_id             uuid not null references public.vendas(id) on delete cascade,
  tipo                 text not null check (tipo in ('afiliado', 'coprodutor', 'outro')),
  parceiro_id_externo  text,
  parceiro_nome        text,
  valor                numeric(14,2) not null check (valor >= 0),
  created_at           timestamptz not null default now()
);

comment on table public.comissoes is
  'Comissões pagas a parceiros em cada venda. vendas.valor_parceiros guarda a soma.';

create index comissoes_venda_idx on public.comissoes (venda_id);

create trigger comissoes_mesma_org_venda
  before insert or update of venda_id, organizacao_id on public.comissoes
  for each row execute function public.valida_mesma_organizacao('vendas', 'venda_id');

-- ---------------------------------------------------------------------------
-- sincronizacoes (registro de cada execução dos conectores)
-- ---------------------------------------------------------------------------
create table public.sincronizacoes (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  integracao_id   uuid not null references public.integracoes(id) on delete cascade,
  -- Mesmo ciclo_id para todas as fontes de um ciclo (Fase 3 junta o Meta).
  ciclo_id        uuid not null default gen_random_uuid(),
  modo            text not null check (modo in ('retroativa', 'incremental', 'reconsulta')),
  origem          text not null check (origem in ('login', 'botao', 'agendado', 'manual')),
  corte           timestamptz not null default now(),
  inicio          timestamptz not null default now(),
  fim             timestamptz,
  status          text not null default 'executando'
                  check (status in ('executando', 'concluida', 'falhou')),
  registros       integer not null default 0,
  -- Posição da importação retroativa (página, filtro), para retomar de onde parou.
  cursor          jsonb,
  erro            text,
  detalhes        jsonb not null default '{}'::jsonb,
  check (fim is null or fim >= inicio)
);

comment on table public.sincronizacoes is
  'Uma linha por execução de conector. Um ciclo por integração por vez (índice parcial).';

create index sincronizacoes_organizacao_inicio_idx on public.sincronizacoes (organizacao_id, inicio desc);
create unique index sincronizacoes_uma_por_vez_idx
  on public.sincronizacoes (organizacao_id, integracao_id) where status = 'executando';

create trigger sincronizacoes_mesma_org_integracao
  before insert or update of integracao_id, organizacao_id on public.sincronizacoes
  for each row execute function public.valida_mesma_organizacao('integracoes', 'integracao_id');

-- ---------------------------------------------------------------------------
-- ofertas_descartadas (sugestão de bump/upsell que o usuário recusou)
-- ---------------------------------------------------------------------------
create table public.ofertas_descartadas (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  funil_id        uuid not null references public.funis(id) on delete cascade,
  oferta_id       uuid not null references public.ofertas(id) on delete cascade,
  papel           text not null check (papel in ('bump', 'upsell')),
  created_at      timestamptz not null default now(),
  unique (funil_id, oferta_id, papel)
);

comment on table public.ofertas_descartadas is
  'Sugestões descartadas pelo usuário. sugerir_ofertas nunca volta a sugerir estas.';

create trigger ofertas_descartadas_mesma_org_funil
  before insert or update of funil_id, organizacao_id on public.ofertas_descartadas
  for each row execute function public.valida_mesma_organizacao('funis', 'funil_id');

create trigger ofertas_descartadas_mesma_org_oferta
  before insert or update of oferta_id, organizacao_id on public.ofertas_descartadas
  for each row execute function public.valida_mesma_organizacao('ofertas', 'oferta_id');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.clientes            enable row level security;
alter table public.transacoes          enable row level security;
alter table public.vendas              enable row level security;
alter table public.comissoes           enable row level security;
alter table public.sincronizacoes      enable row level security;
alter table public.ofertas_descartadas enable row level security;

revoke all on
  public.clientes, public.transacoes, public.vendas, public.comissoes,
  public.sincronizacoes, public.ofertas_descartadas
from anon;

-- Dados importados: o membro lê; só os conectores (service_role) escrevem.
create policy "membro ve clientes"
  on public.clientes for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro ve transacoes"
  on public.transacoes for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro ve vendas"
  on public.vendas for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro ve comissoes"
  on public.comissoes for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro ve sincronizacoes"
  on public.sincronizacoes for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro gerencia ofertas_descartadas"
  on public.ofertas_descartadas for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));

-- ---------------------------------------------------------------------------
-- recalcular_transacoes: agrupa as vendas de cada cliente em transações
-- ---------------------------------------------------------------------------
-- Determinística e reexecutável: apaga e refaz as transações dos clientes
-- informados (ou de todos) a partir das vendas. Renovações de assinatura
-- (origem = 'recorrencia') ficam fora das transações e da recompra.
create or replace function public.recalcular_transacoes(
  p_organizacao_id uuid,
  p_cliente_ids    uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_janela   interval;
  v_cliente  record;
  v_venda    record;
  v_inicio   timestamptz;
  v_fim      timestamptz;
  v_total    numeric(14,2);
  v_qtd      integer;
  v_ordem    integer;
  v_trans_id uuid;
  v_funil    uuid;
  v_criadas  integer := 0;
begin
  -- Chamada pelo app (usuário autenticado) exige ser membro; os conectores usam service_role.
  if v_user is not null and not exists (
    select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  select make_interval(mins => janela_transacao_min) into v_janela
  from public.organizacoes where id = p_organizacao_id;
  if v_janela is null then
    raise exception 'Organização não encontrada.' using errcode = 'no_data_found';
  end if;

  for v_cliente in
    select c.id
    from public.clientes c
    where c.organizacao_id = p_organizacao_id
      and (p_cliente_ids is null or c.id = any (p_cliente_ids))
  loop
    update public.vendas set transacao_id = null
    where cliente_id = v_cliente.id and transacao_id is not null;
    delete from public.transacoes where cliente_id = v_cliente.id;

    v_inicio := null; v_ordem := 0; v_trans_id := null;

    for v_venda in
      select v.id, v.vendida_em, v.valor_bruto, v.oferta_id
      from public.vendas v
      where v.cliente_id = v_cliente.id and v.origem <> 'recorrencia'
      order by v.vendida_em, v.id
    loop
      -- Nova transação quando a venda cai fora da janela contada da PRIMEIRA compra do grupo.
      if v_inicio is null or v_venda.vendida_em > v_inicio + v_janela then
        if v_trans_id is not null then
          update public.transacoes
          set fim = v_fim, valor_total = v_total, quantidade_vendas = v_qtd, funil_id = v_funil
          where id = v_trans_id;
        end if;

        v_ordem := v_ordem + 1;
        v_inicio := v_venda.vendida_em; v_fim := v_venda.vendida_em;
        v_total := 0; v_qtd := 0; v_funil := null;

        insert into public.transacoes (organizacao_id, cliente_id, inicio, fim, ordem, eh_recompra)
        values (p_organizacao_id, v_cliente.id, v_inicio, v_fim, v_ordem, v_ordem > 1)
        returning id into v_trans_id;
        v_criadas := v_criadas + 1;
      end if;

      v_fim := greatest(v_fim, v_venda.vendida_em);
      v_total := v_total + v_venda.valor_bruto;
      v_qtd := v_qtd + 1;

      -- Funil da transação: o da oferta front confirmada; senão, o da primeira venda com funil.
      if v_funil is null or exists (
        select 1 from public.funil_ofertas fo
        where fo.oferta_id = v_venda.oferta_id and fo.papel = 'front' and fo.status = 'confirmado'
      ) then
        select fo.funil_id into v_funil
        from public.funil_ofertas fo
        where fo.oferta_id = v_venda.oferta_id and fo.status = 'confirmado'
        order by (fo.papel = 'front') desc
        limit 1;
      end if;

      update public.vendas set transacao_id = v_trans_id where id = v_venda.id;
    end loop;

    if v_trans_id is not null then
      update public.transacoes
      set fim = v_fim, valor_total = v_total, quantidade_vendas = v_qtd, funil_id = v_funil
      where id = v_trans_id;
    end if;

    -- Primeira compra e funil de entrada vêm da primeira transação.
    update public.clientes c
    set primeira_compra_em = t.inicio,
        funil_entrada_id   = t.funil_id
    from public.transacoes t
    where c.id = v_cliente.id and t.cliente_id = c.id and t.ordem = 1;

    if not exists (select 1 from public.transacoes where cliente_id = v_cliente.id) then
      update public.clientes set primeira_compra_em = null, funil_entrada_id = null
      where id = v_cliente.id;
    end if;
  end loop;

  return v_criadas;
end;
$$;

comment on function public.recalcular_transacoes(uuid, uuid[]) is
  'Refaz as transações (janela da organização) dos clientes informados ou de todos. Devolve quantas transações criou.';

revoke all on function public.recalcular_transacoes(uuid, uuid[]) from public, anon;
grant execute on function public.recalcular_transacoes(uuid, uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sugerir_ofertas: sugere bumps e upsells pelo histórico
-- ---------------------------------------------------------------------------
-- Para cada funil com front confirmado: ofertas sem funil vendidas na MESMA
-- transação do front viram sugestão de bump; compradas pelo mesmo cliente em
-- até 7 dias depois (em outra transação) viram sugestão de upsell. Só sugere
-- com pelo menos 3 ocorrências e 20% das transações do front. Uma oferta só
-- pode estar em um funil: fica com o funil onde mais apareceu.
create or replace function public.sugerir_ofertas(p_organizacao_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_inseridas integer;
begin
  if v_user is not null and not exists (
    select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  with fronts as (
    select fo.funil_id, fo.oferta_id
    from public.funil_ofertas fo
    where fo.organizacao_id = p_organizacao_id
      and fo.papel = 'front' and fo.status = 'confirmado'
  ),
  vendas_front as (
    select f.funil_id, v.cliente_id, v.transacao_id, v.vendida_em
    from public.vendas v
    join fronts f on f.oferta_id = v.oferta_id
    where v.organizacao_id = p_organizacao_id and v.transacao_id is not null
  ),
  base_funil as (
    select funil_id, count(distinct transacao_id) as transacoes_front
    from vendas_front group by funil_id
  ),
  candidatas as (
    -- bump: outra oferta na mesma transação do front
    select vf.funil_id, v.oferta_id, 'bump'::text as papel, vf.transacao_id
    from vendas_front vf
    join public.vendas v on v.transacao_id = vf.transacao_id and v.cliente_id = vf.cliente_id
    where v.oferta_id not in (select oferta_id from fronts where funil_id = vf.funil_id)
    union all
    -- upsell: mesmo cliente, em outra transação, até 7 dias depois do front
    select vf.funil_id, v.oferta_id, 'upsell'::text, vf.transacao_id
    from vendas_front vf
    join public.vendas v
      on v.cliente_id = vf.cliente_id
     and v.transacao_id is distinct from vf.transacao_id
     and v.vendida_em > vf.vendida_em
     and v.vendida_em <= vf.vendida_em + interval '7 days'
    where v.oferta_id not in (select oferta_id from fronts where funil_id = vf.funil_id)
  ),
  contadas as (
    select c.funil_id, c.oferta_id, c.papel,
           count(distinct c.transacao_id) as ocorrencias,
           b.transacoes_front
    from candidatas c
    join base_funil b on b.funil_id = c.funil_id
    where not exists (select 1 from public.funil_ofertas fo where fo.oferta_id = c.oferta_id)
      and not exists (
        select 1 from public.ofertas_descartadas d
        where d.funil_id = c.funil_id and d.oferta_id = c.oferta_id and d.papel = c.papel
      )
    group by c.funil_id, c.oferta_id, c.papel, b.transacoes_front
  ),
  elegiveis as (
    select *, row_number() over (partition by oferta_id order by ocorrencias desc, papel) as rn
    from contadas
    where ocorrencias >= 3 and ocorrencias >= 0.2 * transacoes_front
  ),
  inseridas as (
    insert into public.funil_ofertas (organizacao_id, funil_id, oferta_id, papel, status, ordem)
    select p_organizacao_id, funil_id, oferta_id, papel, 'sugerido', 0
    from elegiveis where rn = 1
    on conflict (oferta_id) do nothing
    returning 1
  )
  select count(*) into v_inseridas from inseridas;

  return v_inseridas;
end;
$$;

comment on function public.sugerir_ofertas(uuid) is
  'Cria sugestões (funil_ofertas.status = sugerido) de bump e upsell pelo histórico de vendas. Devolve quantas criou.';

revoke all on function public.sugerir_ofertas(uuid) from public, anon;
grant execute on function public.sugerir_ofertas(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- recalcular_aliquota_historico: "recalcular todo o histórico" ao mudar a alíquota
-- ---------------------------------------------------------------------------
-- Substitui todas as vigências do produto por uma só, com a alíquota e a base
-- atuais, desde a primeira venda (ou a criação do produto).
create or replace function public.recalcular_aliquota_historico(p_produto_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_produto public.produtos%rowtype;
  v_inicio  timestamptz;
begin
  select * into v_produto from public.produtos where id = p_produto_id;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'no_data_found';
  end if;

  if v_user is not null and not exists (
    select 1 from public.membros where organizacao_id = v_produto.organizacao_id and user_id = v_user
  ) then
    raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
  end if;

  select least(min(v.vendida_em), v_produto.created_at) into v_inicio
  from public.vendas v where v.produto_id = p_produto_id;
  v_inicio := coalesce(v_inicio, v_produto.created_at);

  delete from public.historico_aliquotas where produto_id = p_produto_id;
  insert into public.historico_aliquotas (organizacao_id, produto_id, aliquota, base, vigencia_inicio)
  values (v_produto.organizacao_id, p_produto_id, v_produto.aliquota_imposto, v_produto.base_imposto, v_inicio);
end;
$$;

comment on function public.recalcular_aliquota_historico(uuid) is
  'Aplica a alíquota e a base atuais do produto a todo o histórico (uma vigência só desde a primeira venda).';

revoke all on function public.recalcular_aliquota_historico(uuid) from public, anon;
grant execute on function public.recalcular_aliquota_historico(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- conferencia_vendas_mensal: para bater com o relatório da Greenn
-- ---------------------------------------------------------------------------
-- security_invoker: a view respeita o RLS de quem consulta.
create view public.conferencia_vendas_mensal
with (security_invoker = true)
as
select
  v.organizacao_id,
  v.oferta_id,
  o.nome as oferta,
  v.plataforma,
  date_trunc('month', v.vendida_em at time zone org.fuso_horario)::date as mes,
  count(*) filter (where v.status = 'aprovada')                     as quantidade_aprovadas,
  count(*)                                                          as quantidade_total,
  coalesce(sum(v.valor_bruto), 0)::numeric(14,2)                    as faturamento_bruto,
  coalesce(sum(v.valor_bruto) filter (where v.status <> 'aprovada'), 0)::numeric(14,2) as reembolsos,
  coalesce(sum(v.taxa_gateway), 0)::numeric(14,2)                   as taxas_gateway,
  coalesce(sum(v.valor_parceiros), 0)::numeric(14,2)                as parceiros
from public.vendas v
join public.ofertas o on o.id = v.oferta_id
join public.organizacoes org on org.id = v.organizacao_id
group by v.organizacao_id, v.oferta_id, o.nome, v.plataforma, org.fuso_horario,
         date_trunc('month', v.vendida_em at time zone org.fuso_horario);

comment on view public.conferencia_vendas_mensal is
  'Faturamento por mês (fuso da organização) e por oferta, para conferir com o relatório do gateway.';

revoke all on public.conferencia_vendas_mensal from anon;
grant select on public.conferencia_vendas_mensal to authenticated, service_role;
