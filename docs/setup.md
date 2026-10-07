# Setup do zero

Passo a passo para colocar o Painel de Funis no ar pela primeira vez. Nada aqui exige saber programar; os comandos são copiados e colados.

## 1. Projeto no Supabase

1. Crie uma conta em supabase.com e um projeto na região **South America (São Paulo)**. Guarde a senha do banco.
2. Em **Project Settings → API** copie:
   - **Project URL** (ou monte: `https://<project-id>.supabase.co`)
   - chave **anon** (nos projetos novos chama-se **Publishable**)
   - chave **service_role** (nos projetos novos chama-se **Secret**)
3. Em **Account → Access Tokens** gere um token (ex.: "claude-code").
4. Em **Authentication → Providers → Email** desligue **Allow new users to sign up**. O cadastro aberto fica desligado: o primeiro diretor é criado por você (passo 4) e os demais entram por convite.
5. Em **Authentication → URL Configuration** coloque a URL do app em **Site URL** (em desenvolvimento, `http://localhost:3000`) e adicione em **Redirect URLs**: `http://localhost:3000/**` e, depois do deploy, `https://seu-dominio/**`.

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

## 4. Primeiro usuário

No painel do Supabase: **Authentication → Users → Add user → Create new user**. Informe e-mail e senha e marque **Auto Confirm User**. Esse é o primeiro diretor. Ao entrar no app ele verá a tela "Criar organização".

## 5. Rodar

```bash
pnpm dev
```

Abra `http://localhost:3000`, entre com o usuário do passo 4, crie a organização e siga o roteiro de aceite em `docs/plano-fase-1.md`.

## 6. Convites

Na tela **Configurações → Usuários**, "Convidar diretor" dispara o e-mail padrão do Supabase. O link leva para `/auth/callback`, que grava a sessão e abre "Definir senha".

Se quiser que o link funcione sem JavaScript no navegador, troque o template **Invite user** (Authentication → Email Templates) para apontar para
`{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite`. O app aceita os dois formatos.

Em produção, troque o SMTP padrão do Supabase (limite baixo de e-mails) por um provedor próprio em **Project Settings → Auth → SMTP**.

## 7. Deploy na Vercel

1. Importe o repositório na Vercel.
2. Cadastre as mesmas variáveis do passo 2 (menos `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_ID`, que só o CLI usa) e também `NEXT_PUBLIC_SITE_URL=https://seu-dominio`.
3. Volte ao Supabase e atualize **Site URL** e **Redirect URLs** com o domínio da Vercel.

## Problemas comuns

- **"Variáveis de ambiente do Supabase ausentes"**: faltou alguma chave em `.env.local` ou no ambiente. Reinicie o `pnpm dev` depois de editar.
- **Login dá "E-mail ou senha incorretos" para um usuário que existe**: confira se o usuário está confirmado (Auto Confirm) e se a senha tem 8+ caracteres.
- **Convite não chega**: veja Authentication → Logs no Supabase; o SMTP padrão tem limite por hora.
- **Página em branco após o login**: confira se as migrations foram aplicadas (`pnpm db:push`), senão a tabela `membros` não existe.
