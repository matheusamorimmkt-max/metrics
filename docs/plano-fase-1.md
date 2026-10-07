# Plano da Fase 1 — Fundação

Status: **proposta, aguardando revisão** (2026-10-07)

## Objetivo

Sair do zero para um sistema em que um diretor faz login, cria a organização e cadastra a estrutura completa do negócio: categorias, funis, produtos (alíquota e base do imposto), ofertas e papéis das ofertas em cada funil, além da taxa sobre anúncios e da janela de transação.

**Pronto quando:** dá para cadastrar a estrutura completa do seu negócio, com duas organizações isoladas entre si por RLS, e um segundo diretor convidado vê os mesmos dados da sua organização.

## O que fica fora da Fase 1

- Conectores Meta e Greenn, tabelas de vendas, campanhas e métricas (fases 2 e 3).
- Visões agregadas, Home real, seletor de período e filtro (fase 4). A Home será só um placeholder.
- Cadastro self-service, cobrança, webhook (fase 7).
- Tela de Integrações mostra apenas um estado "em breve".

## Decisões propostas (confirmar antes do código)

| # | Tema | Proposta | Alternativa |
| --- | --- | --- | --- |
| 1 | Login | E-mail + senha via Supabase Auth. Sem cadastro aberto: o primeiro diretor cria a organização no primeiro acesso; os demais entram por convite por e-mail enviado pela tela de Usuários. | Magic link (sem senha) ou Google. Fácil de trocar depois. |
| 2 | Produtos e ofertas na Fase 1 | Cadastro manual, informando o ID da oferta na Greenn. Na Fase 2 o conector reconcilia pelo `id_externo` e preenche o que faltar. | Esperar a Fase 2 e importar tudo. Atrasa o critério de pronto. |
| 3 | Pilha web | Next.js 15 (App Router) + TypeScript estrito + Tailwind + shadcn/ui + Zod + pnpm. Gráficos com Recharts a partir da Fase 4. | Qualquer outra lib de UI; a escolha não afeta banco nem cálculos. |
| 4 | Nomes no código | Domínio em português, igual ao banco (`funis`, `funil_ofertas`). Técnico em inglês (`created_at`). | Tudo em inglês. Dificulta ler o PRD lado a lado. |
| 5 | Testes de RLS | pgTAP em `supabase/tests/`, rodado com `supabase test db`. | Script Node com dois usuários contra o projeto remoto. Fallback se não houver Docker. |
| 6 | Tabela `integracoes` | Criada já na Fase 1 (só schema, sem UI), com credenciais referenciando o Vault, para a Fase 2 não refazer estrutura. | Deixar para a Fase 2. |
| 7 | Mudança de alíquota | Já na Fase 1 a tela pergunta "só daqui para frente" ou "recalcular histórico" e grava a vigência em `historico_aliquotas`. O recálculo em si só existe na Fase 2, quando houver vendas. | Perguntar só a partir da Fase 2. |

## Etapas

Cada etapa termina com um commit nesta branch e algo que dá para conferir.

### Etapa 0 — Bootstrap do repositório

- Next.js + TypeScript + Tailwind + shadcn/ui, pnpm, ESLint, Prettier, Vitest.
- Supabase CLI configurado (`supabase/config.toml`), `.env.example`, `README.md` com passo a passo de setup.
- GitHub Actions: lint, typecheck, testes unitários a cada push.
- **Confere:** `pnpm lint && pnpm typecheck && pnpm test` passam; app sobe com uma página em branco.

### Etapa 1 — Schema do banco e RLS

Migrations em `supabase/migrations/`, nesta ordem:

1. **Base**: extensões, trigger `set_updated_at`, função `organizacoes_do_usuario()` (retorna os `organizacao_id` do usuário autenticado) usada por todas as políticas.
2. **Organização e acesso**: `organizacoes`, `membros`, `integracoes`. Função `criar_organizacao(nome)` que cria a organização, vincula o usuário como diretor e insere as 4 categorias padrão.
3. **Estrutura**: `categorias`, `produtos`, `historico_aliquotas`, `ofertas`, `funis`, `funil_ofertas`.
4. **Políticas RLS** em todas as tabelas: `select/insert/update/delete` permitidos só quando `organizacao_id` está em `organizacoes_do_usuario()`.
5. **Testes pgTAP**: usuário A não vê nem altera dados da organização B; usuário sem organização não vê nada; `funil_ofertas` rejeita a mesma oferta em dois funis.

- **Confere:** `supabase db reset` aplica tudo limpo; `supabase test db` passa.

### Etapa 2 — Autenticação e organização

- Cliente Supabase com `@supabase/ssr` (server e browser), middleware protegendo tudo exceto `/login` e `/convite`.
- Páginas: login, "criar organização" (quando o usuário não tem membro), aceitar convite.
- Server actions para convidar usuário (`inviteUserByEmail` com service role, só no servidor).
- Shell do app: navegação lateral (Home placeholder, Configurações), cabeçalho com nome da organização e usuário.
- **Confere:** dois usuários em organizações diferentes não enxergam nada um do outro na UI; convite funciona de ponta a ponta.

### Etapa 3 — Telas de Configurações

Todas com validação Zod no servidor, mensagens em português e estados vazios explicativos.

| Tela | Funções |
| --- | --- |
| Geral | nome, taxa sobre anúncios (padrão 12,15%), janela de transação (padrão 5 min), fuso horário, moeda |
| Categorias | listar, criar, renomear, reordenar, ativar/desativar semáforo, excluir (bloqueado se houver funis) |
| Produtos | listar, criar, editar nome, alíquota e base (`bruto`/`liquido`); ao mudar alíquota, modal "só daqui para frente" ou "recalcular histórico", gravando `historico_aliquotas` |
| Ofertas | listar, criar, editar: `id_externo` (ID na Greenn), produto, nome, preço; coluna "funil" e destaque para **ofertas não vinculadas** |
| Funis | listar agrupado por categoria; criar/editar: categoria, nome, tipo, meta de ROI (padrão 20%), datas quando `lancamento`; editor de ofertas por papel (front obrigatório ≥ 1; bumps, upsells, downsells opcionais) |
| Conflito de oferta | ao vincular oferta já usada em outro funil, aviso com o nome do funil atual e opção de mover |
| Usuários | listar membros, convidar por e-mail, remover (não pode remover a si mesmo se for o último) |
| Integrações | placeholder "disponível nas Fases 2 e 3" |

- **Confere:** roteiro de aceite abaixo executado manualmente e por um teste Playwright de fumaça.

### Etapa 4 — Qualidade e entrega

- Testes unitários dos schemas Zod e helpers; pgTAP de RLS; Playwright de fumaça do roteiro de aceite.
- `docs/setup.md`: criar projeto Supabase, aplicar migrations, variáveis de ambiente, deploy na Vercel.
- Revisão final de segurança: nenhuma chave de service role no cliente, RLS em 100% das tabelas.

## Modelo de dados da Fase 1

Convenções: `id uuid default gen_random_uuid()`, `organizacao_id uuid not null references organizacoes`, `created_at`/`updated_at timestamptz`. Dinheiro `numeric(14,2)`. Percentuais como fração (`0.1215`). Índice em `organizacao_id` em toda tabela.

| Tabela | Colunas além das convenções | Restrições e índices |
| --- | --- | --- |
| `organizacoes` | `nome text`, `taxa_anuncios numeric(6,4) default 0.1215`, `janela_transacao_min int default 5`, `fuso_horario text default 'America/Sao_Paulo'`, `moeda char(3) default 'BRL'` | `taxa_anuncios >= 0`, `janela_transacao_min > 0` |
| `membros` | `user_id uuid references auth.users`, `papel text default 'diretor'` | único `(organizacao_id, user_id)`; índice em `user_id` |
| `integracoes` | `tipo text` (`meta`, `greenn`, `crm`), `status text`, `credenciais_secret_id uuid` (referência ao Vault), `ultima_sincronizacao timestamptz`, `config jsonb` | único `(organizacao_id, tipo)` |
| `categorias` | `nome text`, `ordem int`, `tem_semaforo bool default false` | único `(organizacao_id, nome)` |
| `produtos` | `plataforma text` (`greenn`, `manual`), `id_externo text`, `nome text`, `aliquota_imposto numeric(6,4)`, `base_imposto text` (`bruto`/`liquido`) | único `(organizacao_id, plataforma, id_externo)` quando `id_externo` não nulo; `aliquota_imposto between 0 and 1` |
| `historico_aliquotas` | `produto_id`, `aliquota numeric(6,4)`, `base text`, `vigencia_inicio timestamptz`, `vigencia_fim timestamptz null` | índice `(produto_id, vigencia_inicio desc)`; sem sobreposição de vigências |
| `ofertas` | `plataforma text`, `id_externo text`, `produto_id`, `nome text`, `preco numeric(14,2)` | único `(organizacao_id, plataforma, id_externo)`; índice em `produto_id` |
| `funis` | `categoria_id`, `nome text`, `tipo text` (`venda_direta`, `lancamento`, `closer`, `isca`), `data_inicio date null`, `data_fim date null`, `meta_roi numeric(6,4) default 0.20`, `ativo bool default true` | datas obrigatórias quando `tipo = 'lancamento'`; índice em `categoria_id` |
| `funil_ofertas` | `funil_id`, `oferta_id`, `papel text` (`front`, `bump`, `upsell`, `downsell`), `status text` (`sugerido`, `confirmado`), `ordem int` | **único `oferta_id`** (uma oferta, um funil); índice em `funil_id` |

`organizacao_id` é redundante em `funil_ofertas` e `historico_aliquotas` (derivável pela FK), mas fica explícito para a política RLS ser uniforme e barata.

## Estrutura de pastas

```
.
├── CLAUDE.md
├── docs/                      PRD, planos de fase, setup
├── supabase/
│   ├── config.toml
│   ├── migrations/            SQL versionado
│   ├── tests/                 pgTAP
│   └── functions/             Edge Functions (a partir da Fase 2)
├── src/
│   ├── app/                   rotas Next.js (login, (app)/configuracoes/...)
│   ├── componentes/           UI compartilhada (shadcn em componentes/ui)
│   ├── dominio/               tipos, schemas Zod e regras puras (sem React, sem Supabase)
│   ├── servidor/              server actions, cliente Supabase, consultas
│   └── lib/                   utilitários
├── tests/                     Vitest e Playwright
└── .github/workflows/ci.yml
```

`src/dominio` é onde, nas fases seguintes, entram as fórmulas financeiras e a regra de transações, sem dependência de framework, para serem testadas isoladamente.

## Roteiro de aceite

1. Login com usuário novo, criar organização "Empresa A"; ver as 4 categorias padrão, Front-end com semáforo ligado.
2. Em Geral, alterar taxa sobre anúncios para 10% e janela para 7 min; recarregar e confirmar.
3. Criar produto "Curso X" com alíquota 6% sobre base líquida.
4. Criar ofertas 123 (Curso X, R$ 27), 124 (Curso X, R$ 37), 456 (Checklist, R$ 17); ver as três como "não vinculadas".
5. Criar funil "Funil Desafio" em Front-end com fronts 123 e 124 e bump 456; as três somem de "não vinculadas".
6. Criar funil B e tentar usar a oferta 456 como front: ver aviso de conflito citando "Funil Desafio"; mover; confirmar que saiu do Funil Desafio.
7. Tentar salvar funil sem front: bloqueado com mensagem.
8. Criar funil tipo lançamento sem datas: bloqueado; com datas: salvo.
9. Alterar alíquota do Curso X para 8%: ver a pergunta; escolher "só daqui para frente"; `historico_aliquotas` tem duas linhas com vigências encadeadas.
10. Convidar segundo usuário; ele entra e vê tudo igual.
11. Terceiro usuário cria "Empresa B": não vê nada da Empresa A; testes pgTAP confirmam o mesmo pelo banco.

## O que preciso de você

1. **Projeto Supabase**: criar o projeto (região São Paulo) e colocar no ambiente desta sessão as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ACCESS_TOKEN` (para o CLI aplicar migrations). Sem isso escrevo e testo o que der localmente, mas não valido contra o banco real.
2. **Confirmar as 7 decisões** da tabela acima, ou dizer o que muda.
3. **Confirmar o idioma**: UI em português do Brasil, código de domínio em português.
