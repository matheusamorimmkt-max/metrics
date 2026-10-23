-- Papéis de acesso: administrador (vê e edita tudo) e visualizador (só vê).
-- Todo membro existente vira administrador. Escrita nas tabelas de configuração, nos
-- membros, na organização e nas funções SECURITY DEFINER de escrita passa a exigir
-- administrador; leitura continua para qualquer membro.

-- ---------------------------------------------------------------------------
-- membros.papel
-- ---------------------------------------------------------------------------
alter table public.membros drop constraint if exists membros_papel_check;
update public.membros set papel = 'administrador' where papel = 'diretor';
alter table public.membros alter column papel set default 'administrador';
alter table public.membros
  add constraint membros_papel_check check (papel in ('administrador', 'visualizador'));

comment on column public.membros.papel is
  'administrador vê e edita tudo; visualizador só vê (sem Configurações).';

-- Organizações em que o usuário é administrador. Usada nas políticas de escrita.
create or replace function public.organizacoes_administradas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organizacao_id
  from public.membros
  where user_id = auth.uid() and papel = 'administrador';
$$;

comment on function public.organizacoes_administradas() is
  'IDs das organizações em que o usuário autenticado é administrador. Usada nas políticas de escrita.';

revoke all on function public.organizacoes_administradas() from public, anon;
grant execute on function public.organizacoes_administradas() to authenticated, service_role;

-- Quem cria a organização entra como administrador.
create or replace function public.criar_organizacao(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org  uuid;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado para criar uma organização.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Informe o nome da organização.' using errcode = 'check_violation';
  end if;

  insert into public.organizacoes (nome)
  values (trim(p_nome))
  returning id into v_org;

  insert into public.membros (organizacao_id, user_id, papel)
  values (v_org, v_user, 'administrador');

  insert into public.categorias (organizacao_id, nome, ordem, tem_semaforo) values
    (v_org, 'Iscas gratuitas', 1, false),
    (v_org, 'Front-end',       2, true),
    (v_org, 'Back-end',        3, false),
    (v_org, 'High-end',        4, false);

  return v_org;
end;
$$;

-- A organização nunca fica sem administrador (remoção ou rebaixamento do último).
create or replace function public.impede_remover_ultimo_membro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (
    select 1 from public.membros
    where organizacao_id = old.organizacao_id and id <> old.id
  ) then
    raise exception 'A organização precisa ter pelo menos um membro.'
      using errcode = 'check_violation';
  end if;

  if old.papel = 'administrador'
     and (tg_op = 'DELETE' or new.papel <> 'administrador')
     and not exists (
       select 1 from public.membros
       where organizacao_id = old.organizacao_id and id <> old.id and papel = 'administrador'
     ) then
    raise exception 'A organização precisa ter pelo menos um administrador.'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists membros_ultimo_membro on public.membros;
create trigger membros_ultimo_membro
  before delete or update of papel on public.membros
  for each row execute function public.impede_remover_ultimo_membro();

-- ---------------------------------------------------------------------------
-- Políticas: organização e membros
-- ---------------------------------------------------------------------------
drop policy if exists "membro edita organizacao" on public.organizacoes;
create policy "administrador edita organizacao"
  on public.organizacoes for update to authenticated
  using (id in (select public.organizacoes_administradas()))
  with check (id in (select public.organizacoes_administradas()));

drop policy if exists "membro adiciona membros" on public.membros;
create policy "administrador adiciona membros"
  on public.membros for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));

create policy "administrador altera papel"
  on public.membros for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));

drop policy if exists "membro remove outros membros" on public.membros;
create policy "administrador remove outros membros"
  on public.membros for delete to authenticated
  using (
    organizacao_id in (select public.organizacoes_administradas())
    and user_id <> auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Políticas: tabelas de configuração (leitura para membro, escrita para administrador)
-- ---------------------------------------------------------------------------
-- integracoes: o app só lê (política de 20261012000001); escrita é das funções abaixo.

drop policy if exists "membro gerencia categorias" on public.categorias;
create policy "membro ve categorias"
  on public.categorias for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));
create policy "administrador insere categorias"
  on public.categorias for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador edita categorias"
  on public.categorias for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador remove categorias"
  on public.categorias for delete to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()));
drop policy if exists "membro gerencia produtos" on public.produtos;
create policy "membro ve produtos"
  on public.produtos for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));
create policy "administrador insere produtos"
  on public.produtos for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador edita produtos"
  on public.produtos for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador remove produtos"
  on public.produtos for delete to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()));
drop policy if exists "membro gerencia ofertas" on public.ofertas;
create policy "membro ve ofertas"
  on public.ofertas for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));
create policy "administrador insere ofertas"
  on public.ofertas for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador edita ofertas"
  on public.ofertas for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador remove ofertas"
  on public.ofertas for delete to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()));
drop policy if exists "membro gerencia funis" on public.funis;
create policy "membro ve funis"
  on public.funis for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));
create policy "administrador insere funis"
  on public.funis for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador edita funis"
  on public.funis for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador remove funis"
  on public.funis for delete to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()));
drop policy if exists "membro gerencia funil_ofertas" on public.funil_ofertas;
create policy "membro ve funil_ofertas"
  on public.funil_ofertas for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));
create policy "administrador insere funil_ofertas"
  on public.funil_ofertas for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador edita funil_ofertas"
  on public.funil_ofertas for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador remove funil_ofertas"
  on public.funil_ofertas for delete to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()));
drop policy if exists "membro gerencia ofertas_descartadas" on public.ofertas_descartadas;
create policy "membro ve ofertas_descartadas"
  on public.ofertas_descartadas for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));
create policy "administrador insere ofertas_descartadas"
  on public.ofertas_descartadas for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador edita ofertas_descartadas"
  on public.ofertas_descartadas for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador remove ofertas_descartadas"
  on public.ofertas_descartadas for delete to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()));
drop policy if exists "membro gerencia funil_campanhas" on public.funil_campanhas;
create policy "membro ve funil_campanhas"
  on public.funil_campanhas for select to authenticated
  using (organizacao_id in (select public.organizacoes_do_usuario()));
create policy "administrador insere funil_campanhas"
  on public.funil_campanhas for insert to authenticated
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador edita funil_campanhas"
  on public.funil_campanhas for update to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()))
  with check (organizacao_id in (select public.organizacoes_administradas()));
create policy "administrador remove funil_campanhas"
  on public.funil_campanhas for delete to authenticated
  using (organizacao_id in (select public.organizacoes_administradas()));

-- ---------------------------------------------------------------------------
-- Funções SECURITY DEFINER de escrita: só administrador
-- ---------------------------------------------------------------------------
-- guardar_credencial_integracao: só administrador
create or replace function public.guardar_credencial_integracao(
  p_organizacao_id uuid,
  p_tipo           text,
  p_credencial     text,
  p_config         jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_integracao uuid;
  v_secret     uuid;
  v_nome       text;
  v_credencial text := trim(p_credencial);
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.membros
    where organizacao_id = p_organizacao_id and user_id = v_user and papel = 'administrador'
  ) then
    if not exists (select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user) then
      raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'Só administradores podem alterar isso.' using errcode = 'insufficient_privilege';
  end if;

  if p_tipo is null or p_tipo not in ('greenn', 'meta') then
    raise exception 'Integração desconhecida.' using errcode = 'check_violation';
  end if;

  if v_credencial is null or length(v_credencial) < 8 then
    raise exception 'Informe a credencial da integração.' using errcode = 'check_violation';
  end if;

  -- Uma linha por (organização, tipo); criada na primeira conexão.
  insert into public.integracoes (organizacao_id, tipo)
  values (p_organizacao_id, p_tipo)
  on conflict (organizacao_id, tipo) do nothing;

  select id into v_integracao
  from public.integracoes
  where organizacao_id = p_organizacao_id and tipo = p_tipo;

  -- Nome único no Vault por (organização, tipo). Reaproveita o segredo se já existir,
  -- mesmo que a referência na tabela tenha se perdido.
  v_nome := 'integracao/' || p_organizacao_id::text || '/' || p_tipo;

  select id into v_secret from vault.secrets where name = v_nome;

  if v_secret is not null then
    perform vault.update_secret(v_secret, v_credencial);
  else
    v_secret := vault.create_secret(
      v_credencial,
      v_nome,
      'Credencial da integração ' || p_tipo || ' da organização ' || p_organizacao_id::text
    );
  end if;

  update public.integracoes
  set credenciais_secret_id      = v_secret,
      credencial_sufixo          = right(v_credencial, 4),
      credenciais_atualizadas_em = now(),
      status                     = 'configurada',
      erro                       = null,
      config                     = coalesce(p_config, '{}'::jsonb)
  where id = v_integracao;

  return v_integracao;
end;
$$;

-- remover_credencial_integracao: só administrador
create or replace function public.remover_credencial_integracao(
  p_organizacao_id uuid,
  p_tipo           text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_secret uuid;
  v_nome   text := 'integracao/' || p_organizacao_id::text || '/' || p_tipo;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.membros
    where organizacao_id = p_organizacao_id and user_id = v_user and papel = 'administrador'
  ) then
    if not exists (select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user) then
      raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'Só administradores podem alterar isso.' using errcode = 'insufficient_privilege';
  end if;

  select credenciais_secret_id into v_secret
  from public.integracoes
  where organizacao_id = p_organizacao_id and tipo = p_tipo;

  delete from vault.secrets where id = v_secret or name = v_nome;

  update public.integracoes
  set credenciais_secret_id      = null,
      credencial_sufixo          = null,
      credenciais_atualizadas_em = null,
      status                     = 'desconectada',
      erro                       = null,
      config                     = '{}'::jsonb
  where organizacao_id = p_organizacao_id and tipo = p_tipo;
end;
$$;

-- recalcular_aliquota_historico: só administrador
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
    select 1 from public.membros where organizacao_id = v_produto.organizacao_id and user_id = v_user and papel = 'administrador'
  ) then
    if not exists (select 1 from public.membros where organizacao_id = v_produto.organizacao_id and user_id = v_user) then
      raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'Só administradores podem alterar isso.' using errcode = 'insufficient_privilege';
  end if;

  select least(min(v.vendida_em), v_produto.created_at) into v_inicio
  from public.vendas v where v.produto_id = p_produto_id;
  v_inicio := coalesce(v_inicio, v_produto.created_at);

  delete from public.historico_aliquotas where produto_id = p_produto_id;
  insert into public.historico_aliquotas (organizacao_id, produto_id, aliquota, base, vigencia_inicio)
  values (v_produto.organizacao_id, p_produto_id, v_produto.aliquota_imposto, v_produto.base_imposto, v_inicio);
end;
$$;

-- definir_imposto_organizacao: só administrador
create or replace function public.definir_imposto_organizacao(
  p_organizacao_id uuid,
  p_aliquota numeric,
  p_base text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_produto uuid;
  v_total integer := 0;
begin
  if v_user is null or not exists (
    select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user and papel = 'administrador'
  ) then
    if not exists (select 1 from public.membros where organizacao_id = p_organizacao_id and user_id = v_user) then
      raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'Só administradores podem alterar isso.' using errcode = 'insufficient_privilege';
  end if;
  if p_aliquota is null or p_aliquota < 0 or p_aliquota > 1 then
    raise exception 'Alíquota inválida.' using errcode = 'check_violation';
  end if;
  if p_base not in ('bruto', 'liquido') then
    raise exception 'Base inválida.' using errcode = 'check_violation';
  end if;

  update public.organizacoes
  set aliquota_imposto = p_aliquota, base_imposto = p_base
  where id = p_organizacao_id;

  for v_produto in
    select id from public.produtos
    where organizacao_id = p_organizacao_id and not imposto_personalizado
  loop
    update public.produtos
    set aliquota_imposto = p_aliquota, base_imposto = p_base
    where id = v_produto;
    perform public.recalcular_aliquota_historico(v_produto);
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

-- definir_imposto_produto: só administrador
create or replace function public.definir_imposto_produto(
  p_produto_id uuid,
  p_personalizado boolean,
  p_aliquota numeric default null,
  p_base text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org  uuid;
  v_aliquota numeric;
  v_base text;
begin
  select organizacao_id into v_org from public.produtos where id = p_produto_id;
  if v_org is null then
    raise exception 'Produto não encontrado.' using errcode = 'no_data_found';
  end if;
  if v_user is null or not exists (
    select 1 from public.membros where organizacao_id = v_org and user_id = v_user and papel = 'administrador'
  ) then
    if not exists (select 1 from public.membros where organizacao_id = v_org and user_id = v_user) then
      raise exception 'Você não faz parte desta organização.' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'Só administradores podem alterar isso.' using errcode = 'insufficient_privilege';
  end if;

  if p_personalizado then
    if p_aliquota is null or p_aliquota < 0 or p_aliquota > 1 then
      raise exception 'Alíquota inválida.' using errcode = 'check_violation';
    end if;
    if p_base not in ('bruto', 'liquido') then
      raise exception 'Base inválida.' using errcode = 'check_violation';
    end if;
    v_aliquota := p_aliquota;
    v_base := p_base;
  else
    select aliquota_imposto, base_imposto into v_aliquota, v_base
    from public.organizacoes where id = v_org;
  end if;

  update public.produtos
  set aliquota_imposto = v_aliquota, base_imposto = v_base, imposto_personalizado = p_personalizado
  where id = p_produto_id;
  perform public.recalcular_aliquota_historico(p_produto_id);
end;
$$;
