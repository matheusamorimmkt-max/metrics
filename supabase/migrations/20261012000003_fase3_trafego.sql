-- Fase 3 / Etapa 1 — Tráfego: contas de anúncio, campanhas, vínculo e métricas diárias
--
-- Preenchido pelo conector do Meta (service_role). O app lê e só escreve o
-- vínculo campanha → funil (funil_campanhas).

-- ---------------------------------------------------------------------------
-- contas_anuncio
-- ---------------------------------------------------------------------------
create table public.contas_anuncio (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  integracao_id   uuid not null references public.integracoes(id) on delete cascade,
  plataforma      text not null check (length(plataforma) between 1 and 40),
  id_externo      text not null check (length(id_externo) between 1 and 120),
  nome            text not null default '',
  moeda           char(3) not null default 'BRL',
  fuso_horario    text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organizacao_id, plataforma, id_externo)
);

comment on table public.contas_anuncio is 'Conta de anúncios de uma plataforma (Meta: act_…). Moeda e fuso vêm da API.';

create index contas_anuncio_organizacao_idx on public.contas_anuncio (organizacao_id);

create trigger contas_anuncio_updated_at
  before update on public.contas_anuncio
  for each row execute function public.set_updated_at();

create trigger contas_anuncio_mesma_org_integracao
  before insert or update of integracao_id, organizacao_id on public.contas_anuncio
  for each row execute function public.valida_mesma_organizacao('integracoes', 'integracao_id');

-- ---------------------------------------------------------------------------
-- campanhas
-- ---------------------------------------------------------------------------
create table public.campanhas (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references public.organizacoes(id) on delete cascade,
  conta_anuncio_id  uuid not null references public.contas_anuncio(id) on delete cascade,
  plataforma        text not null check (length(plataforma) between 1 and 40),
  id_externo        text not null check (length(id_externo) between 1 and 120),
  nome              text not null default '',
  status            text,
  objetivo          text,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organizacao_id, plataforma, id_externo)
);

comment on table public.campanhas is 'Campanhas importadas. O vínculo com funil fica em funil_campanhas.';

create index campanhas_organizacao_idx on public.campanhas (organizacao_id);
create index campanhas_conta_idx on public.campanhas (conta_anuncio_id);

create trigger campanhas_updated_at
  before update on public.campanhas
  for each row execute function public.set_updated_at();

create trigger campanhas_mesma_org_conta
  before insert or update of conta_anuncio_id, organizacao_id on public.campanhas
  for each row execute function public.valida_mesma_organizacao('contas_anuncio', 'conta_anuncio_id');

-- ---------------------------------------------------------------------------
-- funil_campanhas (uma campanha pertence a um único funil)
-- ---------------------------------------------------------------------------
create table public.funil_campanhas (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  funil_id        uuid not null references public.funis(id) on delete cascade,
  campanha_id     uuid not null references public.campanhas(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (campanha_id)
);

comment on table public.funil_campanhas is 'Vínculo campanha → funil. Campanha sem linha aqui é "não vinculada": gasto entra no total, em nenhum funil.';

create index funil_campanhas_funil_idx on public.funil_campanhas (funil_id);

create trigger funil_campanhas_updated_at
  before update on public.funil_campanhas
  for each row execute function public.set_updated_at();

create trigger funil_campanhas_mesma_org_funil
  before insert or update of funil_id, organizacao_id on public.funil_campanhas
  for each row execute function public.valida_mesma_organizacao('funis', 'funil_id');

create trigger funil_campanhas_mesma_org_campanha
  before insert or update of campanha_id, organizacao_id on public.funil_campanhas
  for each row execute function public.valida_mesma_organizacao('campanhas', 'campanha_id');

-- ---------------------------------------------------------------------------
-- metricas_anuncio_diarias
-- ---------------------------------------------------------------------------
create table public.metricas_anuncio_diarias (
  id                     uuid primary key default gen_random_uuid(),
  organizacao_id         uuid not null references public.organizacoes(id) on delete cascade,
  campanha_id            uuid not null references public.campanhas(id) on delete cascade,
  -- '' quando o nível não se aplica (linha no nível da campanha).
  conjunto_id_externo    text not null default '',
  conjunto_nome          text,
  anuncio_id_externo     text not null default '',
  anuncio_nome           text,
  data                   date not null,
  gasto                  numeric(14,2) not null default 0 check (gasto >= 0),
  impressoes             bigint not null default 0,
  alcance                bigint not null default 0,
  cliques                bigint not null default 0,
  cliques_link           bigint not null default 0,
  visualizacoes_pagina   bigint not null default 0,
  inicios_checkout       bigint not null default 0,
  leads                  bigint not null default 0,
  -- Compras reportadas pela plataforma de anúncios: nunca métrica principal (princípio 1).
  compras_plataforma     bigint not null default 0,
  dados_brutos           jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (campanha_id, data, conjunto_id_externo, anuncio_id_externo)
);

comment on table public.metricas_anuncio_diarias is
  'Métricas por anúncio e dia (nível mais fino). Campanha e conjunto são somas; alcance não é somável.';

create index metricas_anuncio_organizacao_data_idx on public.metricas_anuncio_diarias (organizacao_id, data);
create index metricas_anuncio_campanha_data_idx on public.metricas_anuncio_diarias (campanha_id, data);

create trigger metricas_anuncio_diarias_updated_at
  before update on public.metricas_anuncio_diarias
  for each row execute function public.set_updated_at();

create trigger metricas_anuncio_mesma_org_campanha
  before insert or update of campanha_id, organizacao_id on public.metricas_anuncio_diarias
  for each row execute function public.valida_mesma_organizacao('campanhas', 'campanha_id');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.contas_anuncio           enable row level security;
alter table public.campanhas                enable row level security;
alter table public.funil_campanhas          enable row level security;
alter table public.metricas_anuncio_diarias enable row level security;

revoke all on
  public.contas_anuncio, public.campanhas, public.funil_campanhas, public.metricas_anuncio_diarias
from anon;

create policy "membro ve contas_anuncio"
  on public.contas_anuncio for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro ve campanhas"
  on public.campanhas for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro ve metricas_anuncio_diarias"
  on public.metricas_anuncio_diarias for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro gerencia funil_campanhas"
  on public.funil_campanhas for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));

-- ---------------------------------------------------------------------------
-- campanhas_resumo: lista da tela de vínculo (gasto 30 dias, total, última data)
-- ---------------------------------------------------------------------------
create view public.campanhas_resumo
with (security_invoker = true)
as
select
  c.id,
  c.organizacao_id,
  c.conta_anuncio_id,
  ca.nome        as conta_nome,
  ca.moeda,
  c.plataforma,
  c.id_externo,
  c.nome,
  c.status,
  c.objetivo,
  c.ativo,
  fc.funil_id,
  coalesce(sum(m.gasto), 0)::numeric(14,2) as gasto_total,
  coalesce(sum(m.gasto) filter (where m.data >= current_date - 30), 0)::numeric(14,2) as gasto_30d,
  max(m.data) as ultima_data
from public.campanhas c
join public.contas_anuncio ca on ca.id = c.conta_anuncio_id
left join public.funil_campanhas fc on fc.campanha_id = c.id
left join public.metricas_anuncio_diarias m on m.campanha_id = c.id
group by c.id, ca.nome, ca.moeda, fc.funil_id;

comment on view public.campanhas_resumo is 'Campanhas com gasto acumulado e funil vinculado, para a tela de vínculo.';

revoke all on public.campanhas_resumo from anon;
grant select on public.campanhas_resumo to authenticated, service_role;
