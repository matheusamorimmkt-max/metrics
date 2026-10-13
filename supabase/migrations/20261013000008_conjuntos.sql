-- Conjuntos de anúncios (nível intermediário do Meta), com status, para a chave
-- liga/desliga da aba Tráfego. Preenchido pelo conector a cada ciclo.

create table public.conjuntos (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  campanha_id     uuid not null references public.campanhas(id) on delete cascade,
  plataforma      text not null check (length(plataforma) between 1 and 40),
  id_externo      text not null check (length(id_externo) between 1 and 120),
  nome            text not null default '',
  status          text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organizacao_id, plataforma, id_externo)
);

create index conjuntos_campanha_idx on public.conjuntos (campanha_id);

create trigger conjuntos_updated_at
  before update on public.conjuntos
  for each row execute function public.set_updated_at();

create trigger conjuntos_mesma_org_campanha
  before insert or update on public.conjuntos
  for each row execute function public.valida_mesma_organizacao('campanhas', 'campanha_id');

alter table public.conjuntos enable row level security;

create policy "membro ve conjuntos"
  on public.conjuntos for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

revoke all on public.conjuntos from anon;
grant select on public.conjuntos to authenticated;
grant all on public.conjuntos to service_role;

comment on table public.conjuntos is
  'Conjuntos de anúncios importados com status. Só o conector escreve.';
