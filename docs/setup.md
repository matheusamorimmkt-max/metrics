# Setup do zero

Passo a passo para colocar o Metric Analytics no ar pela primeira vez. Nada aqui exige saber programar; os comandos são copiados e colados.

## 1. Projeto no Supabase

1. Crie uma conta em supabase.com e um projeto na região **South America (São Paulo)**. Guarde a senha do banco.
2. Em **Project Settings → API** copie:
   - **Project URL** (ou monte: `https://<project-id>.supabase.co`)
   - chave **anon** (nos projetos novos chama-se **Publishable**)
   - chave **service_role** (nos projetos novos chama-se **Secret**)
3. Em **Account → Access Tokens** gere um token (ex.: "claude-code").
4. Em **Authentication → Providers → Email** desligue **Allow new users to sign up**. O cadastro aberto fica desligado: o primeiro diretor é criado por você (passo 4) e os demais entram por convite.
5. Em **Authentication → URL Configuration** coloque a URL do app em **Site URL** (em desenvolvimento, `http://localhost:3000`) e adicione em **Redirect URLs**: `http://localhost:3000/**` e, depois do deploy, `https://seu-dominio/**`. Sem isso, os links de convite e de recuperação de senha são redirecionados para a Site URL e param de funcionar fora dela.

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` (desenvolvimento) ou cadastre no ambiente (Vercel, Claude Code):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret>
SUPABASE_ACCESS_TOKEN=<token pessoal do CLI>
SUPABASE_PROJECT_ID=<project-id>
```

A `SUPABASE_SERVICE_ROLE_KEY` ignora a segurança por linha. Ela só é usada no servidor e nunca pode ganhar o prefixo `NEXT_PUBLIC_`.

## 3. Aplicar o banco

```bash
pnpm install
pnpm db:link   # vincula o CLI ao projeto (usa SUPABASE_PROJECT_ID e SUPABASE_ACCESS_TOKEN)
pnpm db:push   # aplica as migrations de supabase/migrations
pnpm db:types  # regenera src/servidor/supabase/tipos-banco.ts a partir do banco
```

Para conferir as migrations sem tocar no projeto real (precisa de um Postgres local com pgTAP):

```bash
pnpm db:test
```

Sem a senha do banco (o `db push` precisa dela), as migrations também podem ser aplicadas pelo **SQL Editor** do painel ou pela Management API (`POST /v1/projects/<project-id>/database/query` com o token pessoal), uma a uma e em ordem. Nesse caso registre cada uma em `supabase_migrations.schema_migrations` (`version`, `name`, `statements`) para o CLI saber que já foram aplicadas e o próximo `pnpm db:push` não repeti-las.

## 4. Primeiro usuário

No painel do Supabase: **Authentication → Users → Add user → Create new user**. Informe e-mail e senha e marque **Auto Confirm User**. Esse é o primeiro diretor. Ao entrar no app ele verá a tela "Criar organização".

## 5. Rodar

```bash
pnpm dev
```

Abra `http://localhost:3000`, entre com o usuário do passo 4, crie a organização e siga o roteiro de aceite em `docs/plano-fase-1.md`.

Testes de ponta a ponta (Playwright): `pnpm test:e2e` com `E2E_EMAIL` e `E2E_SENHA` no `.env.local`. Os roteiros `tests/e2e/fase-1.spec.ts` e `tests/e2e/fases-2-a-5.spec.ts` entram com esse usuário, criam a organização dele no primeiro acesso e percorrem todas as telas sem precisar de conector ligado. No projeto hospedado existe o usuário `e2e@metric-analytics.test` só para isso (senha redefinível em Authentication → Users); ele tem a própria organização e não vê os dados das outras.

## 6. Convites

Na tela **Configurações → Usuários**, "Convidar diretor" dispara o e-mail padrão do Supabase. O link leva para `/auth/callback`, que grava a sessão e abre "Definir senha".

Se quiser que o link funcione sem JavaScript no navegador, troque o template **Invite user** (Authentication → Email Templates) para apontar para
`{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite`. O app aceita os dois formatos.

## 6a. Recuperação de senha

Na tela de login, "Esqueci minha senha" leva para `/esqueci-senha`. O app pede ao Supabase o e-mail de recuperação com o link voltando para `/auth/recuperar`, que valida o link, cria a sessão e abre "Definir senha". A resposta na tela é a mesma exista ou não a conta, para não revelar quais e-mails estão cadastrados.

Com o template padrão **Reset Password** o link só funciona no mesmo navegador em que a recuperação foi pedida (fluxo PKCE). Para funcionar em qualquer navegador (por exemplo, pedir no computador e abrir no celular), troque o template em **Authentication → Email Templates → Reset Password** para apontar para
`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`. O app aceita os dois formatos.

O SMTP padrão do Supabase envia poucos e-mails por hora; se o link não chegar, veja **Authentication → Logs** ou configure um SMTP próprio.

## 7. Deploy na Vercel

1. Importe o repositório na Vercel.
2. Cadastre as mesmas variáveis do passo 2 (menos `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_ID`, que só o CLI usa) e também `NEXT_PUBLIC_SITE_URL=https://seu-dominio`. Cole cada valor sem aspas, sem espaços e sem quebra de linha, e marque os ambientes Production e Preview.
3. As variáveis `NEXT_PUBLIC_*` são embutidas no build. Depois de criar ou corrigir qualquer uma delas, faça um novo deploy (Deployments → Redeploy); só salvar a variável não muda o site que já está no ar.
4. Volte ao Supabase e atualize **Site URL** e **Redirect URLs** com o domínio da Vercel.

## 8. Conectar Greenn e Meta

Em **Configurações → Integrações** cada organização conecta as próprias contas. Nada disso vai em variável de ambiente.

- **Greenn**: na conta Greenn, Configurações do sistema → Integrações e Tokens → gerar um token com as permissões de leitura `sales:read`, `products:read` e `offers:read`. Cole em "Token da API" e clique em "Conectar Greenn".
- **Meta Ads**: no Meta Business, Configurações do negócio → Usuários → Usuários do sistema → gerar token com a permissão `ads_read` para a conta de anúncios. Cole o token e informe o ID da conta de anúncios (o número que aparece no Gerenciador de Anúncios, com ou sem `act_`).

**Token do Meta Ads, passo a passo:** em business.facebook.com → Configurações do negócio → Usuários → Usuários do sistema → Adicionar (tipo Funcionário basta) → Adicionar ativos → Contas de anúncios → marque a conta com permissão "Gerenciar campanhas" (ou "Ver desempenho", se não quiser ligar/desligar campanhas pelo painel) → Gerar token → escolha o app do negócio, validade "Nunca expira" e as permissões `ads_read` e `ads_management`. Copie o token (começa com `EAA`). O ID da conta de anúncios aparece no Gerenciador de Anúncios, no seletor de contas (número; o app aceita com ou sem `act_`).

`ads_read` basta para importar campanhas, métricas e criativos. A chave liga/desliga de campanha, conjunto e anúncio (Tráfego e Configurações → Campanhas) é a única escrita que o painel faz no Meta e precisa de `ads_management` com "Gerenciar campanhas" na conta; sem isso a chave mostra o motivo da recusa e nada muda.

A credencial vai para o Vault do Supabase e nunca volta ao navegador: a tela mostra só os 4 últimos caracteres e a data. "Trocar credenciais" substitui o token; "Desconectar" apaga o segredo. A primeira sincronização (conector da Fase 2 para a Greenn, da Fase 3 para o Meta) é que confirma se o acesso está correto; até lá o status fica em "Credenciais salvas".

## 9. Conectores (Edge Functions)

Cada integração tem uma Edge Function em `supabase/functions/`: `meta-sync` (Meta Ads) e `greenn-sync` (Greenn). Publicar cada uma com `pnpm dlx supabase functions deploy <nome> --project-ref <project-id>` (usa `SUPABASE_ACCESS_TOKEN`). Elas leem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, que o Supabase injeta sozinho, e pegam o token da organização no Vault por `ler_credencial_integracao`.

O app chama as duas no mesmo ciclo (mesmo `ciclo_id` e corte) pelo botão "Atualizar agora" e ao entrar, quando a última atualização tem mais de 15 min. O primeiro ciclo de cada integração valida o token: se a plataforma recusar, o card em Integrações mostra o status `erro` com a mensagem; se aceitar, passa a `conectada` e começa a importação retroativa (fatiada; continua a cada minuto pelo pg_cron até terminar).

**Greenn**: o conector foi escrito a partir do spec público (`docs/greenn-api.md`) e tem pontos marcados `[SONDA]` em `supabase/functions/_shared/greenn/` (unidade dos valores, campos do comprador, participantes e taxa). Com o primeiro token `grn_live_` em mãos, rode `pnpm greenn:sonda` (token em `GREENN_TOKEN_SONDA`, só na sessão de desenvolvimento), confirme esses pontos, ajuste o tradutor e publique a função de novo. Depois confira um mês fechado em `conferencia_vendas_mensal` contra o relatório da Greenn.

## 10. Atualização automática (pg_cron)

Depois de aplicar as migrations `20261013000003_agendamento.sql` e `20261013000004_conector_greenn.sql`, rode uma vez no SQL Editor, trocando a chave pela **service_role** de Project Settings → API:

```sql
select public.configurar_agendamento(
  'https://<project-id>.supabase.co/functions/v1',
  '<service_role_key>'
);
```

Isso guarda a URL e a chave no Vault e cria três jobs no pg_cron: `ciclo_incremental` (a cada 15 min), `ciclo_reconsulta` (06:00 UTC) e `ciclo_retroativa` (a cada minuto, só para integrações cuja importação inicial ainda não terminou). Se a migration 4 foi aplicada depois de já ter rodado a função, rode de novo: ela recria os jobs. Para conferir: `select jobname, schedule, active from cron.job;`. As extensões pg_cron e pg_net precisam estar ativas em Database → Extensions (a migration tenta ativá-las).

## Problemas comuns

- **"Variáveis de ambiente do Supabase ausentes"**: faltou alguma chave em `.env.local` ou no ambiente. Reinicie o `pnpm dev` depois de editar.
- **Login dá "Invalid API key"**: a `NEXT_PUBLIC_SUPABASE_ANON_KEY` do ambiente não pertence ao projeto da `NEXT_PUBLIC_SUPABASE_URL`. É a resposta do próprio Supabase a uma chave que ele não reconhece. Causas comuns: chave copiada pela metade ou com aspas, chave de outro projeto, ou variável corrigida na Vercel sem novo deploy. Compare o valor com Project Settings → API (a anon é um JWT longo que começa com `eyJ`, ou `sb_publishable_` nos projetos novos), salve e faça Redeploy.
- **Login dá "E-mail ou senha incorretos" para um usuário que existe**: confira se o usuário está confirmado (Auto Confirm) e se a senha tem 8+ caracteres.
- **Convite ou e-mail de recuperação não chega**: veja Authentication → Logs no Supabase; o SMTP padrão tem limite por hora.
- **Link do e-mail abre em `localhost:3000` mesmo em produção**: a URL do app não está em **Redirect URLs** (passo 1.5) ou falta `NEXT_PUBLIC_SITE_URL` na Vercel.
- **Link de recuperação dá "expirou ou já foi usado" logo de cara**: o link foi aberto em outro navegador com o template padrão. Troque o template como descrito em 6a.
- **Link de convite dá "expirou ou já foi usado" logo de cara, mesmo recém-enviado**: até 2026-10-23 o `/auth/callback` recusava os tokens que o Supabase manda no fragmento da URL (o cliente do `@supabase/ssr` só aceita o fluxo PKCE). Corrigido no app; se ainda acontecer, confira se o domínio do app está em **Redirect URLs** e se o e-mail não foi aberto por um verificador de links (alguns antivírus e o Outlook abrem o link antes da pessoa, o que o consome).
- **Convite falha com "User not allowed" (`not_admin`)**: a `SUPABASE_SERVICE_ROLE_KEY` está com a chave anon/publishable em vez da service_role/secret. Confira em Project Settings → API; a service_role é a que o painel esconde por padrão. Para checar, decodifique o JWT: o campo `role` precisa ser `service_role`.
- **Página em branco após o login**: confira se as migrations foram aplicadas (`pnpm db:push`), senão a tabela `membros` não existe.
