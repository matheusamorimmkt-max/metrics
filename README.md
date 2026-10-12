# Metric Analytics

Painel web que junta gasto em anúncios (Meta) e vendas do gateway (Greenn) para mostrar, por funil e no negócio inteiro, quanto entrou, quanto saiu e quanto sobrou.

- Especificação: `docs/PRD.md`
- Regras do projeto: `CLAUDE.md`
- Plano da fase atual: `docs/plano-fase-2.md` (Fase 1 em `docs/plano-fase-1.md`)
- API da Greenn, o que entrega e limites: `docs/greenn-api.md`
- Como configurar do zero: `docs/setup.md`

## Stack

Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Zod, Supabase (Postgres, Auth, RLS), pnpm.

## Comandos

| Comando          | O que faz                                                             |
| ---------------- | --------------------------------------------------------------------- |
| `pnpm dev`       | sobe o app em `http://localhost:3000`                                 |
| `pnpm lint`      | ESLint                                                                |
| `pnpm typecheck` | TypeScript sem emitir arquivos                                        |
| `pnpm test`      | testes unitários (Vitest)                                             |
| `pnpm db:test`   | aplica as migrations num Postgres local e roda os testes pgTAP de RLS |
| `pnpm db:link`   | vincula o CLI ao projeto Supabase (`SUPABASE_PROJECT_ID`)             |
| `pnpm db:push`   | aplica as migrations no projeto Supabase vinculado                    |
| `pnpm db:types`  | gera os tipos TypeScript a partir do banco vinculado                  |

## Variáveis de ambiente

Veja `.env.example`. Em desenvolvimento local, copie para `.env.local`.

## Estrutura

```
supabase/migrations/   SQL versionado (nunca alterar o schema pelo dashboard)
supabase/tests/        testes pgTAP de RLS e regras do banco
src/app/               rotas Next.js
src/components/        UI compartilhada (shadcn em components/ui)
src/dominio/           tipos, schemas Zod e regras puras (sem React, sem Supabase)
src/servidor/          server actions, cliente Supabase, consultas
src/lib/               utilitários
tests/                 Vitest e Playwright
```
