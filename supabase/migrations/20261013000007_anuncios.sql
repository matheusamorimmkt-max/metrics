-- Anúncios (nível mais fino do Meta) com o criativo: miniatura, imagem ou vídeo.
-- Preenchido pelo conector a cada ciclo; as URLs do Meta expiram e são renovadas.

create table public.anuncios (
  id                    uuid primary key default gen_random_uuid(),
  organizacao_id        uuid not null references public.organizacoes(id) on delete cascade,
  campanha_id           uuid not null references public.campanhas(id) on delete cascade,
  plataforma            text not null check (length(plataforma) between 1 and 40),
  id_externo            text not null check (length(id_externo) between 1 and 120),
  conjunto_id_externo   text not null default '',
  conjunto_nome         text,
  nome                  text not null default '',
  status                text,
  ativo                 boolean not null default true,
  criativo_tipo         text check (criativo_tipo is null or criativo_tipo in ('imagem', 'video', 'carrossel', 'outro')),
  miniatura_url         text,
  imagem_url            text,
  video_url             text,
  permalink_url         text,
  criativo_atualizado_em timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organizacao_id, plataforma, id_externo)
);

create index anuncios_campanha_idx on public.anuncios (campanha_id);

create trigger anuncios_updated_at
  before update on public.anuncios
  for each row execute function public.set_updated_at();

create trigger anuncios_mesma_org_campanha
  before insert or update on public.anuncios
  for each row execute function public.valida_mesma_organizacao('campanhas', 'campanha_id');

alter table public.anuncios enable row level security;

create policy "membro ve anuncios"
  on public.anuncios for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));

-- Escrita só pelo conector (service_role ignora RLS).

comment on table public.anuncios is
  'Anúncios importados com o criativo. Só o conector escreve; as URLs de mídia do Meta expiram e são renovadas a cada ciclo.';

revoke all on public.anuncios from anon;
grant select on public.anuncios to authenticated;
grant all on public.anuncios to service_role;
