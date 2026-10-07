-- Fase 1 / Etapa 1 — Organização e acesso
-- organizacoes, membros, integracoes, função de apoio para RLS e políticas.

-- ---------------------------------------------------------------------------
-- organizacoes
-- ---------------------------------------------------------------------------
create table public.organizacoes (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null check (length(trim(nome)) between 1 and 120),
  -- Percentual sobre o gasto em anúncios, como fração (0.1215 = 12,15%).
  taxa_anuncios         numeric(6,4) not null default 0.1215
                        check (taxa_anuncios >= 0 and taxa_anuncios <= 1),
  -- Janela que agrupa compras do mesmo cliente numa transação.
  janela_transacao_min  integer not null default 5
                        check (janela_transacao_min between 1 and 1440),
  fuso_horario          text not null default 'America/Sao_Paulo',
  moeda                 char(3) not null default 'BRL',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.organizacoes is 'Uma empresa (tenant). Toda tabela de negócio aponta para cá.';
comment on column public.organizacoes.taxa_anuncios is 'Fração decimal. Investimento total = gasto × (1 + taxa_anuncios).';
comment on column public.organizacoes.janela_transacao_min is 'Minutos a partir da primeira compra que agrupam compras numa transação.';

create trigger organizacoes_updated_at
  before update on public.organizacoes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- membros
-- ---------------------------------------------------------------------------
create table public.membros (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  papel           text not null default 'diretor' check (papel in ('diretor')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organizacao_id, user_id)
);

comment on table public.membros is 'Vínculo entre usuário do Supabase Auth e organização.';

create index membros_user_id_idx on public.membros (user_id);

create trigger membros_updated_at
  before update on public.membros
  for each row execute function public.set_updated_at();

-- Impede que a organização fique sem nenhum membro.
create or replace function public.impede_remover_ultimo_membro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.membros
    where organizacao_id = old.organizacao_id and id <> old.id
  ) then
    raise exception 'A organização precisa ter pelo menos um membro.'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger membros_ultimo_membro
  before delete on public.membros
  for each row execute function public.impede_remover_ultimo_membro();

-- ---------------------------------------------------------------------------
-- integracoes (só o schema; as telas vêm nas Fases 2 e 3)
-- ---------------------------------------------------------------------------
create table public.integracoes (
  id                      uuid primary key default gen_random_uuid(),
  organizacao_id          uuid not null references public.organizacoes(id) on delete cascade,
  tipo                    text not null check (tipo in ('meta', 'greenn', 'crm')),
  status                  text not null default 'desconectada'
                          check (status in ('desconectada', 'conectada', 'erro')),
  -- Referência ao segredo no Vault (vault.secrets.id). O token nunca fica nesta tabela.
  credenciais_secret_id   uuid,
  config                  jsonb not null default '{}'::jsonb,
  ultima_sincronizacao    timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (organizacao_id, tipo)
);

comment on table public.integracoes is 'Conectores por organização. Credenciais ficam no Vault; aqui só a referência.';

create trigger integracoes_updated_at
  before update on public.integracoes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Função de apoio para RLS
-- SECURITY DEFINER para ler membros sem recursão de política.
-- ---------------------------------------------------------------------------
create or replace function public.organizacoes_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organizacao_id
  from public.membros
  where user_id = auth.uid();
$$;

comment on function public.organizacoes_do_usuario() is
  'IDs das organizações do usuário autenticado. Usada em todas as políticas de RLS.';

revoke all on function public.organizacoes_do_usuario() from public, anon;
grant execute on function public.organizacoes_do_usuario() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizacoes enable row level security;
alter table public.membros       enable row level security;
alter table public.integracoes   enable row level security;

-- Usuário anônimo nunca acessa dados de negócio.
revoke all on public.organizacoes, public.membros, public.integracoes from anon;

-- organizacoes: membro vê e edita a própria; criação só via criar_organizacao(); sem exclusão na Fase 1.
create policy "membro ve organizacao"
  on public.organizacoes for select to authenticated
  using (id in (select public.organizacoes_do_usuario()));

create policy "membro edita organizacao"
  on public.organizacoes for update to authenticated
  using (id in (select public.organizacoes_do_usuario()))
  with check (id in (select public.organizacoes_do_usuario()));

-- membros: membro vê os colegas; pode adicionar e remover membros da própria organização,
-- exceto a si mesmo (sair da organização fica para depois).
create policy "membro ve membros"
  on public.membros for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro adiciona membros"
  on public.membros for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_do_usuario()));

create policy "membro remove outros membros"
  on public.membros for delete to authenticated
  using (
    organizacao_id in (select public.organizacoes_do_usuario())
    and user_id <> auth.uid()
  );

-- integracoes: membro gerencia as da própria organização.
create policy "membro gerencia integracoes"
  on public.integracoes for all to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()))
  with check (organizacao_id in (select public.organizacoes_do_usuario()));
