# Metric Analytics — guia do projeto

Painel web que junta gasto em anúncios (Meta) e vendas do gateway (Greenn) para mostrar, por funil e no negócio inteiro, quanto entrou, quanto saiu e quanto sobrou. Começa como ferramenta interna e depois vira SaaS multiempresa.

A especificação completa está em `docs/PRD.md`. Este arquivo resume as decisões que todo código deve respeitar. Em caso de dúvida entre os dois, o PRD manda; se algo aqui contradiz o PRD, avise o usuário antes de seguir.

## Princípios inegociáveis

1. **Receita vem só do gateway.** Compras reportadas pelo Meta nunca são métrica principal. A etapa "Compras" de qualquer funil vem da Greenn.
2. **Lucro de verdade.** Lucro desconta todos os custos variáveis: taxa sobre anúncios, impostos, taxas do gateway, parceiros, reembolsos e chargebacks.
3. **Funil é definido pela oferta.** O ID da oferta no gateway decide a qual funil uma venda pertence, nunca o nome do produto. Uma oferta pertence a um único funil.
4. **Independente de plataforma.** Meta e Greenn são conectores que traduzem dados externos para o formato interno. Telas e cálculos nunca conhecem a API de origem. Novos conectores (Google Ads, Hotmart, CRM) entram sem mexer em telas nem cálculos.
5. **O app nunca consulta as plataformas diretamente.** Conectores gravam no Supabase; o app lê só do Supabase.
6. **Simples e resumido.** A Home responde em 5 segundos se o negócio dá lucro e onde agir. Métricas secundárias ficam em abas.

## Modelo de domínio

Hierarquia: **Categoria → Funil → Oferta → Produto**.

- **Produto**: o que é entregue. Guarda `aliquota_imposto` e `base_imposto` (`bruto` ou `liquido`).
- **Oferta**: ID da oferta no gateway. Aponta para um produto e tem preço próprio. O mesmo produto pode ter várias ofertas.
- **Funil**: conjunto de ofertas, cada uma com um papel: `front` (1 ou mais), `bump`, `upsell`, `downsell` (0 ou mais). Tem `tipo` (`venda_direta`, `lancamento`, `closer`, `isca`), `meta_roi` (padrão 20%) e, para lançamentos, data de início e fim.
- **Categoria**: agrupa funis. Padrão por organização: Iscas gratuitas, Front-end, Back-end, High-end. Renomeável e extensível. Só Front-end tem semáforo (`tem_semaforo`).
- **Lançamento não é categoria**: é um funil (geralmente no Back-end) com período.
- Ofertas com vendas e sem funil aparecem como **"ofertas não vinculadas"**. Campanhas sem funil aparecem como **"campanhas não vinculadas"**; o gasto delas entra no total da Home, mas em nenhum funil.
- O sistema **sugere** bumps e upsells pelo histórico; o usuário confirma (`funil_ofertas.status`: `sugerido` ou `confirmado`).

## Modelo financeiro (fonte da verdade para qualquer cálculo)

```
Investimento total = gasto em anúncios × (1 + taxa_anuncios)        # taxa_anuncios padrão 0,1215, por organização
Faturamento bruto  = soma das vendas aprovadas no período
(−) reembolsos e chargebacks        # descontados na data em que acontecem
(−) taxas do gateway                 # por venda, vindas da API
(−) parceiros                        # afiliados, coprodutores e demais comissões, por venda
(−) impostos                         # alíquota do produto da oferta, sobre a base escolhida, venda a venda
= Receita líquida
(−) Investimento total
= Lucro

ROAS = Faturamento bruto / Investimento total
ROI  = Lucro / Investimento total
CAC  = Investimento total / clientes novos no período
Margem = Lucro / Faturamento bruto
Lucro por transação = Lucro / número de transações
```

Base do imposto, por produto:

- `bruto`: alíquota × (faturamento bruto − reembolsos)
- `liquido`: alíquota × (faturamento bruto − reembolsos − taxas do gateway − parceiros)

O imposto é calculado **venda a venda** com a alíquota vigente na data (tabela `historico_aliquotas`). Ao mudar a alíquota, perguntar se vale só daqui para frente ou se recalcula o histórico.

Todas as métricas são calculadas com o mesmo método para o negócio, cada categoria e cada funil. Uma única implementação, parametrizada pelo filtro.

## Clientes, transações e recompra

- **Cliente único**: e-mail (normalizado em minúsculas); CPF como reforço quando disponível.
- **Venda**: cada item aprovado no gateway (front, bump e upsell contam separados).
- **Transação**: compras do mesmo cliente em até N minutos a partir da **primeira** compra do grupo (`janela_transacao_min`, padrão 5, por organização).
- **Recompra**: qualquer compra fora da janela da transação anterior. Atribuída sempre ao funil da **primeira** transação do cliente (`clientes.funil_entrada`).
- **Cliente recorrente**: 2 ou mais transações. **Taxa de recompra** = recorrentes ÷ únicos.
- **Ticket médio** = soma das vendas ÷ número de transações.
- Exemplo canônico: compras às 10h00, 10h03 e 10h07 geram duas transações; 10h07 é recompra.

## Ciclo de atualização

- Meta e Greenn rodam **no mesmo ciclo, com o mesmo horário de corte**. A tela só mostra um ciclo quando as duas fontes terminam; se uma falha, mantém o último ciclo completo e avisa qual fonte falhou.
- Dispara: no login, no botão "Atualizar agora" e a cada 15 minutos (pg_cron). Um ciclo por vez; após concluir, o botão libera depois de 1 minuto.
- Reconsulta diária: últimos 60 dias da Greenn (reembolsos e chargebacks) e últimos 7 dias do Meta (números revisados).
- Greenn só por API no MVP, idempotente pelo ID da venda. Webhook fica para a fase SaaS.
- Toda sincronização gera registro em `sincronizacoes` (ciclo, integração, corte, origem, início, fim, registros, erros).

## Semáforo (só Front-end)

Calculado sobre **ontem e anteontem**, independente do período selecionado. Verde: ROI acima da `meta_roi` do funil. Amarelo: entre 0% e a meta. Vermelho: abaixo de 0%.

## Stack e convenções técnicas

- **Banco, auth, segurança**: Supabase (Postgres, Auth, Row Level Security, Vault). Migrations versionadas via Supabase CLI em `supabase/migrations/`. Nunca alterar schema direto no dashboard.
- **Sincronização**: Supabase Edge Functions (Deno/TypeScript) em `supabase/functions/`, agendadas por pg_cron e acionadas pelo app.
- **Web**: Next.js (App Router, TypeScript estrito), Tailwind CSS, shadcn/ui, Recharts. Hospedagem na Vercel. Gerenciador de pacotes: pnpm.
- **Validação**: Zod em todo input de formulário e de API.
- **Idioma**: UI, tabelas, colunas e nomes de domínio no código em **português** (como no PRD: `organizacoes`, `funis`, `funil_ofertas`). Termos puramente técnicos ficam em inglês (`created_at`, `updated_at`, `id`, `status`).
- **Multiempresa desde o dia 1**: toda tabela de negócio tem `organizacao_id` com RLS. Nunca criar tabela de negócio sem RLS e sem política por organização. Testes de RLS acompanham cada migration que cria tabela.
- **Dinheiro**: `numeric(14,2)` no banco, na moeda da organização. Percentuais como fração decimal (`0.1215`, nunca `12.15`).
- **Datas**: `timestamptz` no banco. Agregações "por dia" usam o fuso da organização (`organizacoes.fuso_horario`, padrão `America/Sao_Paulo`).
- **IDs externos**: toda entidade importada guarda `id_externo` + `plataforma` com unicidade por organização. Upserts são idempotentes por essa chave.
- **Segredos**: tokens de Meta e Greenn ficam no Vault e só são lidos por Edge Functions. Nunca chegam ao navegador nem a logs. Permissões de leitura apenas.
- **Agregados**: indicadores da Home vêm de visões materializadas por dia e por funil, atualizadas após cada sincronização.

## Segurança e LGPD

- O sistema guarda e-mail e CPF de compradores. Minimizar exposição: CPF nunca aparece em listagens, só em detalhe quando necessário.
- Antes do lançamento SaaS: termos de uso, política de privacidade, contrato de tratamento de dados, app do Meta aprovado com verificação de empresa.

## Fases de construção

1. **Fundação** (atual): Supabase, tabelas, login, organização, RLS, telas de configuração gerais, categorias e funis. Produtos e ofertas **não** são cadastrados à mão: as tabelas existem, mas as telas ficam para a Fase 2. Pronto quando dá para entrar, criar a organização, convidar diretores e cadastrar categorias e funis.
2. **Conector Greenn**: importação retroativa de produtos, ofertas e vendas, telas de produtos (alíquota e base) e ofertas, vínculo de ofertas aos funis por papel, busca a cada 15 min, reconsulta diária, transações e recompra, sugestão de bumps e upsells. Pronto quando o faturamento de um mês bate com a Greenn.
3. **Conector Meta**: contas, campanhas, métricas diárias, vínculo campanha→funil, ciclo unificado. Pronto quando o gasto de um mês bate com o gerenciador.
4. **Home e Funis**: cards, pizza, linha do tempo, tabela por categoria/funil, semáforo, etapas do funil.
5. **Abas secundárias**: Tráfego, Vendas, Clientes.
6. **Uso interno**: 2 a 4 semanas conferindo números.
7. **Preparação para SaaS**: onboarding, app Meta, cobrança, LGPD, webhook Greenn.

Cada fase termina com algo funcionando e conferível. Não antecipar trabalho de fases futuras, mas não bloquear o caminho delas (ex.: vínculo de campanha é por campanha no MVP, mas o schema permite descer para conjunto de anúncios).

## Pendências que afetam decisões técnicas

- Confirmar na documentação da Greenn que a API entrega, por venda: ID da oferta, taxa do gateway, comissões por parceiro e data de reembolso.
- Confirmar limites de chamadas da API da Greenn.
- CRM ainda não escolhido; a aba Comercial fica oculta até existir conector.

## Como trabalhar neste repositório

- Comandos: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright; na sessão de desenvolvimento usar o Chromium pré-instalado com `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` e, com o app já no ar, `PLAYWRIGHT_BASE_URL=http://localhost:3000`), `pnpm db:test` (migrations + pgTAP num Postgres local; na sessão de desenvolvimento rodar como usuário `postgres`: `su postgres -c "cd $PWD && bash supabase/tests/run-local.sh"`), `pnpm build`.
- Toda rota autenticada usa `obterContexto()` de `src/servidor/sessao.ts` e filtra por `organizacao.id` além do RLS (um usuário pode ter mais de uma organização).
- Server Actions devolvem `Resultado` (`src/servidor/acoes/resultado.ts`) e validam com Zod no servidor; formulários usam `useActionState`.
- Percentuais entram e saem das telas por `src/dominio/percentual.ts` (texto "12,15" ↔ fração 0.1215).

- Antes de implementar algo que o PRD deixa aberto, registrar a decisão aqui (seção "Decisões tomadas durante a construção") e seguir.
- Cada fase tem um plano em `docs/` revisado pelo usuário antes do código.
- Commits pequenos e descritivos, em português.
- Rodar lint, typecheck e testes antes de qualquer push.

## Decisões tomadas durante a construção

- **2026-10-07 — Next.js 16 sem Cache Components.** O scaffold veio com `cacheComponents: true`, que exige Suspense em volta de toda leitura de cookie e pré-renderiza uma casca estática. Como todo o app é autenticado e filtrado por organização, isso só adiciona complexidade. Fica `cacheComponents: false`. O middleware de autenticação em Next 16 chama-se `src/proxy.ts` (função `proxy`), não `middleware.ts`. Antes de usar uma API do Next, consultar `node_modules/next/dist/docs/` (esta versão tem mudanças em relação ao conhecimento prévio).
- **2026-10-07 — shadcn/ui estilo `base-nova`, cor base neutra, ícones lucide.** Componentes em `src/components/ui` não são editados à mão; para customizar, envolver em componente próprio.
- **2026-10-07 — Primeiro usuário e cadastro.** Cadastro aberto fica desligado no Supabase Auth. O primeiro diretor é criado pelo administrador no painel do Supabase (Authentication > Users > Add user). Os demais entram por convite enviado pela tela de Usuários. No primeiro acesso, quem não tem organização vê a tela "Criar organização".
- **2026-10-07 — Testes de banco no Postgres local com pgTAP.** Sem Docker na sessão de desenvolvimento, `supabase start` não roda. O script `supabase/tests/run-local.sh` cria um banco descartável num Postgres local (16 ou 17), emula o schema `auth` do Supabase (`auth.users`, `auth.uid()`), aplica as migrations e roda os testes pgTAP. O mesmo script roda no CI. O Supabase hospedado usa Postgres 17: escrever SQL compatível com 16 e 17.
- **2026-10-07 — Produtos e ofertas só via API.** O usuário decidiu que produtos e ofertas nunca são cadastrados à mão. Eles entram pelo conector da Greenn (Fase 2) e, no futuro, por outros gateways. O usuário só edita o que a API não traz: alíquota e base do imposto do produto, e o papel de cada oferta no funil. Consequência: as telas de Produtos e Ofertas e o editor de ofertas do funil saem da Fase 1 e entram na Fase 2; as tabelas continuam sendo criadas na Fase 1.
- **2026-10-09 — Nome do produto: Metric Analytics.** O nome "Painel de Funis" foi substituído em telas, README, PRD e setup. O domínio (`funis`, `funil_ofertas`) não muda.
- **2026-10-09 — Recuperação de senha.** Tela pública `/esqueci-senha` chama `resetPasswordForEmail` com retorno em `/auth/recuperar`, que reaproveita o mesmo validador de links de e-mail do `/auth/confirmar` (`src/servidor/links-email.ts`) e leva para `/definir-senha`. A resposta é sempre "se o e-mail tiver conta, você receberá o link", sem revelar cadastros. Campos de senha usam `InputSenha` (`src/components/formulario/input-senha.tsx`), com botão de mostrar/ocultar. A URL pública do app vem de `origemDoApp()` (`src/servidor/origem.ts`), compartilhada com o convite.
- **2026-10-09 — E-mail no Zod 4.** `z.email().trim()` valida antes de aparar e rejeita espaços nas pontas. Todo campo de e-mail usa `z.string().trim().toLowerCase().pipe(z.email())` (`campoEmail` em `src/dominio/schemas/auth.ts`).
