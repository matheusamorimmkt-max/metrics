-- Fase 1 / Etapa 1 — Estrutura do negócio
-- Categoria → Funil → Oferta → Produto, com histórico de alíquotas.
-- Produtos e ofertas são preenchidos pelos conectores (Fase 2); as tabelas já nascem aqui.

-- ---------------------------------------------------------------------------
-- categorias
-- ---------------------------------------------------------------------------
create table public.categorias (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  nome            text not null check (length(trim(nome)) between 1 and 80),
  ordem           integer not null default 0,
  tem_semaforo    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organizacao_id, nome)
);

comment on table public.categorias is 'Agrupa funis. Padrão: Iscas gratuitas, Front-end, Back-end, High-end.';
comment on column public.categorias.tem_semaforo is 'Só funis desta categoria mostram o semáforo de ROI (padrão: Front-end).';

create index categorias_organizacao_idx on public.categorias (organizacao_id, ordem);

create trigger categorias_updated_at
  before update on public.categorias
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- produtos
-- ---------------------------------------------------------------------------
create table public.produtos (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references public.organizacoes(id) on delete cascade,
  plataforma        text not null check (length(plataforma) between 1 and 40),
  id_externo        text not null check (length(id_externo) between 1 and 120),
  nome              text not null check (length(trim(nome)) between 1 and 200),
  -- Alíquota vigente, como fração (0.06 = 6%). O histórico completo fica em historico_aliquotas.
  aliquota_imposto  numeric(6,4) not null default 0
                    check (aliquota_imposto >= 0 and aliquota_imposto <= 1),
  base_imposto      text not null default 'bruto' check (base_imposto in ('bruto', 'liquido')),
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organizacao_id, plataforma, id_externo)
);

comment on table public.produtos is 'O que é entregue. Importado do gateway; alíquota e base são informadas pelo usuário.';
comment on column public.produtos.base_imposto is 'bruto: alíquota × (bruto − reembolsos). liquido: também desconta taxas do gateway e parceiros.';

create index produtos_organizacao_idx on public.produtos (organizacao_id);

create trigger produtos_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- historico_aliquotas
-- ---------------------------------------------------------------------------
create table public.historico_aliquotas (
  id               uuid primary key default gen_random_uuid(),
  organizacao_id   uuid not null references public.organizacoes(id) on delete cascade,
  produto_id       uuid not null references public.produtos(id) on delete cascade,
  aliquota         numeric(6,4) not null check (aliquota >= 0 and aliquota <= 1),
  base             text not null check (base in ('bruto', 'liquido')),
  vigencia_inicio  timestamptz not null default now(),
  vigencia_fim     timestamptz,
  created_at       timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim > vigencia_inicio),
  -- Um produto nunca tem duas vigências sobrepostas.
  exclude using gist (
    produto_id with =,
    tstzrange(vigencia_inicio, vigencia_fim, '[)') with &&
  )
);

comment on table public.historico_aliquotas is
  'Alíquota e base vigentes por período. O imposto de cada venda usa a linha vigente na data da venda.';

create index historico_aliquotas_produto_idx
  on public.historico_aliquotas (produto_id, vigencia_inicio desc);

-- Todo produto nasce com uma vigência aberta; mudar alíquota/base fecha a atual e abre outra
-- a partir de agora ("só daqui para frente"). O modo "recalcular histórico" (Fase 2) ajusta
-- vigencia_inicio da nova linha para trás.
create or replace function public.registra_historico_aliquota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- clock_timestamp(), e não now(): now() é fixo na transação e duas mudanças na mesma
  -- transação gerariam vigências de duração zero, violando a restrição.
  v_agora   timestamptz := clock_timestamp();
  v_aberta  public.historico_aliquotas%rowtype;
begin
  if tg_op = 'UPDATE'
     and new.aliquota_imposto = old.aliquota_imposto
     and new.base_imposto = old.base_imposto then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select * into v_aberta
    from public.historico_aliquotas
    where produto_id = new.id and vigencia_fim is null
    for update;

    -- Vigência aberta que começou "agora": corrige em vez de criar uma de duração zero.
    if found and v_aberta.vigencia_inicio >= v_agora then
      update public.historico_aliquotas
      set aliquota = new.aliquota_imposto, base = new.base_imposto
      where id = v_aberta.id;
      return new;
    end if;

    if found then
      update public.historico_aliquotas
      set vigencia_fim = v_agora
      where id = v_aberta.id;
    end if;
  end if;

  insert into public.historico_aliquotas (organizacao_id, produto_id, aliquota, base, vigencia_inicio)
  values (new.organizacao_id, new.id, new.aliquota_imposto, new.base_imposto, v_agora);

  return new;
end;
$$;

-- SECURITY DEFINER: o usuário só lê historico_aliquotas; quem escreve é este trigger.
revoke all on function public.registra_historico_aliquota() from public, anon, authenticated;

create trigger produtos_historico_aliquota
  after insert or update of aliquota_imposto, base_imposto on public.produtos
  for each row execute function public.registra_historico_aliquota();

-- ---------------------------------------------------------------------------
-- ofertas
-- ---------------------------------------------------------------------------
create table public.ofertas (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  plataforma      text not null check (length(plataforma) between 1 and 40),
  id_externo      text not null check (length(id_externo) between 1 and 120),
  produto_id      uuid not null references public.produtos(id) on delete restrict,
  nome            text not null check (length(trim(nome)) between 1 and 200),
  preco           numeric(14,2) not null default 0 check (preco >= 0),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organizacao_id, plataforma, id_externo)
);

comment on table public.ofertas is 'ID da oferta no gateway. Decide a qual funil uma venda pertence.';

create index ofertas_organizacao_idx on public.ofertas (organizacao_id);
create index ofertas_produto_idx on public.ofertas (produto_id);

create trigger ofertas_updated_at
  before update on public.ofertas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- funis
-- ---------------------------------------------------------------------------
create table public.funis (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  categoria_id    uuid not null references public.categorias(id) on delete restrict,
  nome            text not null check (length(trim(nome)) between 1 and 120),
  tipo            text not null default 'venda_direta'
                  check (tipo in ('venda_direta', 'lancamento', 'closer', 'isca')),
  data_inicio     date,
  data_fim        date,
  -- Meta de ROI do semáforo, como fração (0.20 = 20%).
  meta_roi        numeric(6,4) not null default 0.20 check (meta_roi >= -1 and meta_roi <= 100),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organizacao_id, nome),
  -- Lançamento exige período; os demais tipos não têm período.
  check (
    (tipo = 'lancamento' and data_inicio is not null and data_fim is not null and data_fim >= data_inicio)
    or (tipo <> 'lancamento' and data_inicio is null and data_fim is null)
  )
);

comment on table public.funis is 'Conjunto de ofertas com papéis. Lançamento é um funil com período, não uma categoria.';

create index funis_organizacao_idx on public.funis (organizacao_id);
create index funis_categoria_idx on public.funis (categoria_id);

create trigger funis_updated_at
  before update on public.funis
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- funil_ofertas
-- ---------------------------------------------------------------------------
create table public.funil_ofertas (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  funil_id        uuid not null references public.funis(id) on delete cascade,
  oferta_id       uuid not null references public.ofertas(id) on delete cascade,
  papel           text not null check (papel in ('front', 'bump', 'upsell', 'downsell')),
  status          text not null default 'confirmado' check (status in ('sugerido', 'confirmado')),
  ordem           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Uma oferta pertence a um único funil.
  unique (oferta_id)
);

comment on table public.funil_ofertas is 'Papel de cada oferta dentro do funil. Uma oferta só pode estar em um funil.';

create index funil_ofertas_funil_idx on public.funil_ofertas (funil_id);

create trigger funil_ofertas_updated_at
  before update on public.funil_ofertas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Consistência entre organizações: uma linha nunca aponta para pai de outra organização.
-- ---------------------------------------------------------------------------
create or replace function public.valida_mesma_organizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  org_pai uuid;
begin
  -- tg_argv[0] = tabela pai, tg_argv[1] = coluna FK nesta tabela
  execute format(
    'select organizacao_id from public.%I where id = $1', tg_argv[0]
  ) into org_pai using (to_jsonb(new) ->> tg_argv[1])::uuid;

  if org_pai is distinct from new.organizacao_id then
    raise exception '% pertence a outra organização.', tg_argv[1]
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger funis_mesma_org_categoria
  before insert or update of categoria_id, organizacao_id on public.funis
  for each row execute function public.valida_mesma_organizacao('categorias', 'categoria_id');

create trigger ofertas_mesma_org_produto
  before insert or update of produto_id, organizacao_id on public.ofertas
  for each row execute function public.valida_mesma_organizacao('produtos', 'produto_id');

create trigger historico_aliquotas_mesma_org_produto
  before insert or update of produto_id, organizacao_id on public.historico_aliquotas
  for each row execute function public.valida_mesma_organizacao('produtos', 'produto_id');

create trigger funil_ofertas_mesma_org_funil
  before insert or update of funil_id, organizacao_id on public.funil_ofertas
  for each row execute function public.valida_mesma_organizacao('funis', 'funil_id');

create trigger funil_ofertas_mesma_org_oferta
  before insert or update of oferta_id, organizacao_id on public.funil_ofertas
  for each row execute function public.valida_mesma_organizacao('ofertas', 'oferta_id');

-- ---------------------------------------------------------------------------
-- RLS: membro da organização gerencia tudo da própria organização.
-- ---------------------------------------------------------------------------
alter table public.categorias          enable row level security;
alter table public.produtos            enable row level security;
alter table public.historico_aliquotas enable row level security;
alter table public.ofertas             enable row level security;
alter table public.funis               enable row level security;
alter table public.funil_ofertas       enable row level security;

revoke all on
  public.categorias, public.produtos, public.historico_aliquotas,
  public.ofertas, public.funis, public.funil_ofertas
from anon;

create policy "membro gerencia categorias"
  on public.categorias for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro gerencia produtos"
  on public.produtos for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));

-- Histórico é escrito só pelo trigger e pela função de recálculo (Fase 2); o membro só lê.
create policy "membro ve historico de aliquotas"
  on public.historico_aliquotas for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro gerencia ofertas"
  on public.ofertas for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro gerencia funis"
  on public.funis for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro gerencia funil_ofertas"
  on public.funil_ofertas for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));
