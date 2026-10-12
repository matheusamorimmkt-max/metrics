# Plano da Fase 2 — Conector Greenn

Status: **proposta, aguardando revisão do usuário** (2026-10-09)

Referência da API: `docs/greenn-api.md`. Fase anterior: `docs/plano-fase-1.md`.

## Objetivo

Conectar a conta Greenn da organização e trazer para o Supabase tudo o que o modelo financeiro precisa: produtos, ofertas, vendas com status, taxas e parceiros, reembolsos e chargebacks, clientes. Em cima disso, calcular transações e recompra pela janela da organização e sugerir bumps e upsells pelo histórico. O usuário passa a ver produtos e ofertas nas Configurações, informa alíquota e base do imposto e vincula ofertas aos funis por papel.

**Pronto quando:** o faturamento bruto de um mês fechado, por oferta e no total, bate com o relatório da Greenn; os reembolsos do mês também; as transações do exemplo canônico (10h00, 10h03, 10h07) saem como duas transações e uma recompra; cada oferta com venda está em um funil ou aparece em "ofertas não vinculadas".

## O que fica fora da Fase 2

- Meta Ads e o ciclo unificado com horário de corte compartilhado (Fase 3). Nesta fase o ciclo tem só a Greenn, mas já nasce com `ciclo_id` para a Fase 3 encaixar o Meta sem mudar o schema.
- Home, cards, gráficos e visões materializadas por dia e funil (Fase 4). Aqui entra só uma consulta de conferência (faturamento por mês e por oferta).
- Webhook da Greenn como fonte principal (Fase 7). Ver decisão 2 para o caso em que a API não entrega a taxa.
- Abas Vendas e Clientes (Fase 5).

## Decisões propostas (confirmar antes do código)

| #   | Tema                                     | Proposta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Alternativa                                                                                        |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Sonda antes do código                    | A Etapa 0 chama a API real com o token da conta e grava amostras anonimizadas (fora do repositório). Só depois escrevo o tradutor. Motivo: o spec não documenta o conteúdo de `client`, `participants`, `fee` no detalhe da venda, nem se valores vêm em reais ou centavos.                                                                                                                                                                                                                                                                                                  | Escrever o conector pelo spec e ajustar depois. Mais retrabalho.                                   |
| 2   | Taxa do gateway quando a API não trouxer | Se o detalhe da venda não entregar `fee`, duas coisas: (a) a organização ganha uma tabela de taxas do gateway (percentual + fixo, por faixa: padrão Greenn 4,99% + R$ 1,00; 8,99% + R$ 1,00 com afiliado; 3,99% + R$ 1,00 acima de R$ 4.000) e o conector **estima** a taxa venda a venda, marcando `taxa_gateway_origem = 'estimada'`; (b) o webhook da Greenn é antecipado da Fase 7 como **fonte complementar** só para sobrescrever a taxa com o valor real (`origem = 'gateway'`). O ciclo por API continua sendo a fonte de verdade de existência e status das vendas. | Só estimar (números nunca batem ao centavo) ou só webhook (sem histórico retroativo da taxa).      |
| 3   | Importação retroativa                    | Todo o histórico da conta, com data inicial configurável na tela de Integrações (padrão: desde a primeira venda). Roda fatiada e retomável: cada execução da Edge Function processa até ~80 chamadas e grava o cursor em `sincronizacoes.cursor`; o pg_cron chama de novo a cada minuto até terminar. A tela mostra o progresso (página X de Y, vendas importadas).                                                                                                                                                                                                          | Limitar a 12 meses. Perde recompra de clientes antigos.                                            |
| 4   | Ciclo incremental                        | A cada 15 min: `GET /sales?filter[paid_after]=<último corte − 1 dia>` paginado, mais `GET /offers` e `GET /products` (poucas páginas). Upsert idempotente por `(organizacao_id, plataforma, id_externo)`. Reconsulta diária (primeira execução após 03h no fuso da organização): últimos 60 dias por `refunded_after` e por `paid_after`, para pegar reembolsos, chargebacks e boletos pagos tarde.                                                                                                                                                                          | Só `created_after`. Perde boleto/PIX pago dias depois da criação.                                  |
| 5   | Transações e recompra em SQL             | Função `recalcular_transacoes(organizacao_id, desde)` em plpgsql, rodada ao fim de cada sincronização só para os clientes com vendas novas ou alteradas. Determinística e reexecutável (apaga e refaz as transações do cliente a partir de `desde`). Testada em pgTAP com o exemplo canônico e com mudança de janela.                                                                                                                                                                                                                                                        | Em TypeScript dentro da Edge Function. Mais código e duas fontes de verdade quando a janela mudar. |
| 6   | Venda sem `offer_id`                     | Cria uma oferta sintética por produto, `id_externo = 'produto:<id>'`, nome "Sem oferta — <produto>", `ativo = false`. Assim toda venda tem oferta e o vínculo a funil continua sendo por oferta. Oferta que a API de ofertas não devolve mais (excluída na Greenn) é criada a partir da venda com `ativo = false`.                                                                                                                                                                                                                                                           | Vincular essas vendas direto ao produto. Quebra o princípio "funil é definido pela oferta".        |
| 7   | Assinaturas                              | Cada cobrança paga é uma venda (receita real). A primeira cobrança do contrato entra nas regras de transação e recompra; as seguintes recebem `origem = 'recorrencia'` e ficam **fora** do cálculo de recompra, para não inflar a métrica. Entram no faturamento normalmente.                                                                                                                                                                                                                                                                                                | Tratar toda cobrança como recompra.                                                                |
| 8   | Status                                   | Só guarda vendas que já foram pagas em algum momento: `paid → aprovada`, `refunded → reembolsada`, `chargedback → chargeback`, `refund_pending → aprovada` (com `reembolso_pendente = true`). `waiting_payment`, `unpaid` e `refused` não entram (o ciclo as pega quando virarem `paid`). O status bruto fica em `status_externo`.                                                                                                                                                                                                                                           | Guardar tudo. Tabela cresce com boletos nunca pagos e sem uso nas métricas da Fase 4.              |
| 9   | Cliente único                            | Chave `(organizacao_id, email)` com e-mail em minúsculas e sem espaços. CPF só dígitos, usado para unir dois e-mails do mesmo CPF **apenas sinalizando** (`clientes.cpf_duplicado`), sem mesclar automaticamente nesta fase.                                                                                                                                                                                                                                                                                                                                                 | Mesclar automaticamente por CPF. Arriscado sem revisão.                                            |
| 10  | Moeda                                    | Guarda `moeda` por venda. Vendas em moeda diferente da organização entram no banco, mas ficam fora dos totais e aparecem num aviso na tela de Integrações. Conversão fica para depois.                                                                                                                                                                                                                                                                                                                                                                                       | Converter por cotação do dia. Fora do escopo.                                                      |
| 11  | Token no Vault                           | O token é enviado pela Server Action ao RPC `guardar_credencial_integracao` (SECURITY DEFINER, só `service_role`), que grava em `vault.secrets` e guarda o id em `integracoes.credenciais_secret_id`. A Edge Function lê `vault.decrypted_secrets` com a service role. O token nunca volta ao navegador; a tela mostra só os 4 últimos caracteres e a data. Nos testes locais o schema `vault` é emulado como o `auth` já é.                                                                                                                                                 | Guardar criptografado numa coluna. Fere a regra do PRD.                                            |
| 12  | Mudança de alíquota                      | Ao salvar nova alíquota ou base na tela de Produtos, um diálogo pergunta "Só daqui para frente" (padrão; o trigger da Fase 1 já cuida) ou "Recalcular todo o histórico" (RPC `recalcular_aliquota_historico`, que fecha as vigências anteriores e abre uma única desde a primeira venda). O imposto é sempre calculado na leitura, venda a venda, pela vigência da data da venda; não fica gravado na venda.                                                                                                                                                                 | Gravar o imposto em `vendas`. Exigiria recálculo em massa a cada mudança.                          |
| 13  | Sugestão de bumps e upsells              | Após cada sincronização, para cada funil com front confirmado: ofertas vendidas na **mesma transação** do front viram sugestão de `bump`; ofertas compradas pelo **mesmo cliente** em até 7 dias depois viram sugestão de `upsell`. Só sugere ofertas sem funil, com pelo menos 3 ocorrências e 20% das transações do front. O usuário confirma, troca o papel ou descarta (`funil_ofertas.status`). Sugestão descartada não volta (`ofertas_descartadas`).                                                                                                                  | Sugerir sempre, sem limiar. Muito ruído.                                                           |

## Etapas

Cada etapa termina com um commit e algo conferível.

### Etapa 0 — Sonda da API (precisa do token)

- Script `scripts/greenn-sonda.ts` (roda local, `pnpm greenn:sonda`): lista 2 produtos, 2 ofertas, 5 vendas e o detalhe de 3 vendas (uma paga, uma reembolsada, uma com afiliado se houver). Imprime a estrutura com valores mascarados (e-mail, CPF, nome) e grava amostras anonimizadas na pasta de rascunho da sessão, nunca no repositório.
- Registra em `docs/greenn-api.md` as respostas às perguntas "a confirmar" e fecha as decisões 1, 2 e a questão reais × centavos.
- **Confere:** `docs/greenn-api.md` sem nenhum "a confirmar".

### Etapa 1 — Schema

Migrations em `supabase/migrations/` com RLS e testes pgTAP:

1. `clientes`, `vendas`, `comissoes`, `transacoes`, `sincronizacoes`, `ofertas_descartadas`; colunas novas em `integracoes` (`ultimo_corte`, `importacao_inicio`, `erro`).
2. Emulação do schema `vault` em `supabase/tests/setup-local-auth.sql` e RPCs `guardar_credencial_integracao`, `ler_credencial_integracao` (só `service_role`).
3. `recalcular_transacoes(organizacao_id, desde)` e `sugerir_ofertas(organizacao_id)`.
4. `recalcular_aliquota_historico(produto_id)`.
5. View `conferencia_vendas_mensal` (mês, oferta, quantidade, bruto, reembolsos, taxa, parceiros).

- **Confere:** `pnpm db:test` com testes de RLS para cada tabela nova, exemplo canônico de transações, janela alterada, recorrência fora da recompra, sugestão com limiar.

### Etapa 2 — Conector (Edge Function)

`supabase/functions/greenn-sync/` em Deno, com código puro em `supabase/functions/_shared/greenn/`:

- `cliente.ts`: chamadas com paginação, leitura de `X-RateLimit-Remaining`, espera por `Retry-After`, backoff com jitter, nunca em paralelo.
- `tradutor.ts`: API → formato interno (`VendaImportada`, `OfertaImportada`, `ProdutoImportado`, `ClienteImportado`). Sem Supabase, sem Deno: testado no Vitest com as amostras da sonda como fixtures.
- `sincronizar.ts`: modos `retroativa` (fatiada, cursor), `incremental` e `reconsulta`; upserts idempotentes; registro em `sincronizacoes`; ao final chama `recalcular_transacoes` e `sugerir_ofertas`.
- Entrada: `POST` com `{ organizacao_id, modo, origem }` autenticado pela service role (pg_cron via `pg_net` e Server Action via cliente admin). Um ciclo por organização por vez (lock em `sincronizacoes`).
- pg_cron: a cada 15 min para organizações com Greenn conectada; a cada 1 min enquanto houver importação retroativa em andamento.
- **Confere:** rodar a retroativa na conta real e comparar `conferencia_vendas_mensal` com o relatório da Greenn.

### Etapa 3 — Tela de Integrações

- Card Greenn: colar token, "Testar conexão" (chama `GET /products?per_page=1` pela Edge Function), data inicial da importação, "Importar histórico", progresso, última sincronização, último erro, "Desconectar" (apaga o segredo do Vault).
- Botão **Atualizar agora** no cabeçalho (só Greenn nesta fase), bloqueado durante um ciclo e por 1 min após concluir; indicador "Atualizado às 14h32".
- Disparo no login: ao abrir o app, se a última sincronização tem mais de 15 min, dispara um ciclo em segundo plano.
- Vendas em moeda diferente e ofertas sintéticas aparecem como avisos aqui.

### Etapa 4 — Produtos e ofertas nas Configurações

- **Produtos**: lista importada (nome, plataforma, ofertas, vendas no mês); editar alíquota e base com o diálogo da decisão 12.
- **Ofertas**: lista com produto, preço, funil e papel; filtro "não vinculadas" com faturamento acumulado.
- **Funil → Ofertas do funil**: substitui o aviso da Fase 1 por um editor por papel (front, bump, upsell, downsell), com busca de ofertas, sugestões pendentes para confirmar/descartar e aviso de conflito quando a oferta já está em outro funil (com link para o outro funil).
- Validação: ao vincular, o funil passa a exigir pelo menos um front confirmado para ser considerado "configurado" (badge na lista de funis).

### Etapa 5 — Conferência e entrega

- Roteiro de aceite abaixo executado na conta real; `docs/setup.md` ganha a seção "Conectar a Greenn"; CLAUDE.md ganha as decisões tomadas.
- Teste Playwright da tela de Integrações sem token real (estado desconectada → erro de token inválido) e do editor de ofertas com dados de semente.

## Modelo de dados da Fase 2

Convenções da Fase 1 mantidas: `id uuid`, `organizacao_id` com RLS, `created_at`/`updated_at`, dinheiro `numeric(14,2)`, percentuais em fração, `plataforma` + `id_externo` únicos por organização, trigger `valida_mesma_organizacao` em toda FK para tabela de negócio.

| Tabela                | Colunas além das convenções                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Restrições e índices                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clientes`            | `email text`, `cpf text null`, `nome text`, `plataforma`, `id_externo` (id do cliente na Greenn), `primeira_compra_em timestamptz`, `funil_entrada_id uuid null → funis`, `cpf_duplicado bool`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | único `(organizacao_id, email)`; único `(organizacao_id, plataforma, id_externo)`; índice em `cpf`                                                                      |
| `vendas`              | `plataforma`, `id_externo`, `cliente_id → clientes`, `oferta_id → ofertas`, `produto_id → produtos`, `transacao_id null → transacoes`, `status` (`aprovada`, `reembolsada`, `chargeback`), `status_externo text`, `reembolso_pendente bool`, `origem` (`unica`, `assinatura_primeira`, `recorrencia`), `assinatura_id_externo text null`, `valor_bruto`, `taxa_gateway`, `taxa_gateway_origem` (`gateway`, `estimada`), `valor_parceiros`, `moeda char(3)`, `meio_pagamento text`, `parcelas int`, `cupom text null`, `afiliado_id_externo text null`, `utm jsonb`, `vendida_em timestamptz` (= `paid_at`), `criada_em timestamptz`, `reembolsada_em timestamptz null`, `dados_brutos jsonb` | único `(organizacao_id, plataforma, id_externo)`; índices `(organizacao_id, vendida_em)`, `(cliente_id, vendida_em)`, `(oferta_id)`, `(organizacao_id, reembolsada_em)` |
| `comissoes`           | `venda_id → vendas`, `tipo` (`afiliado`, `coprodutor`, `outro`), `parceiro_id_externo text`, `parceiro_nome text`, `valor numeric(14,2)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | índice em `venda_id`                                                                                                                                                    |
| `transacoes`          | `cliente_id → clientes`, `funil_id null → funis` (funil da oferta front da transação; senão da primeira venda), `inicio timestamptz`, `fim timestamptz`, `valor_total`, `quantidade_vendas int`, `ordem int` (1 = primeira do cliente), `eh_recompra bool`                                                                                                                                                                                                                                                                                                                                                                                                                                   | índices `(organizacao_id, inicio)`, `(cliente_id, ordem)`                                                                                                               |
| `sincronizacoes`      | `integracao_id → integracoes`, `ciclo_id uuid`, `modo` (`retroativa`, `incremental`, `reconsulta`), `origem` (`login`, `botao`, `agendado`), `corte timestamptz`, `inicio`, `fim`, `status` (`executando`, `concluida`, `falhou`), `registros int`, `cursor jsonb`, `erro text null`, `detalhes jsonb`                                                                                                                                                                                                                                                                                                                                                                                       | índice `(organizacao_id, inicio desc)`; índice parcial único `(organizacao_id, integracao_id) where status = 'executando'` (um ciclo por vez)                           |
| `ofertas_descartadas` | `funil_id`, `oferta_id`, `papel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | único `(funil_id, oferta_id, papel)`                                                                                                                                    |
| `integracoes` (+)     | `ultimo_corte timestamptz`, `importacao_inicio date`, `importacao_concluida_em timestamptz`, `credencial_sufixo text` (4 últimos caracteres), `erro text`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                       |

`dados_brutos` guarda o JSON da venda como veio da API, para auditoria e para reprocessar sem chamar a Greenn de novo quando o tradutor mudar.

## Estrutura de pastas nova

```
supabase/functions/
├── _shared/greenn/        cliente.ts, tradutor.ts, tipos.ts (puros, testados no Vitest)
├── _shared/supabase.ts    cliente service role da Edge Function
└── greenn-sync/index.ts   entrada HTTP: modo, organização, lock, cursor
scripts/greenn-sonda.ts    Etapa 0
src/app/(app)/configuracoes/integracoes/     tela
src/app/(app)/configuracoes/produtos/        tela
src/app/(app)/configuracoes/ofertas/         tela
src/app/(app)/configuracoes/funis/[id]/ofertas/   editor por papel
src/servidor/acoes/integracoes.ts, produtos.ts, ofertas.ts, funil-ofertas.ts
src/dominio/schemas/integracao.ts, produto.ts, funil-oferta.ts
```

## Roteiro de aceite

1. Em Integrações, colar um token inválido: "Token recusado pela Greenn". Colar o token válido: "Conectada", com o sufixo do token e a data.
2. Clicar em "Importar histórico" com data inicial há 3 meses: progresso avança, termina com a contagem de produtos, ofertas, vendas e clientes.
3. Em Produtos, os produtos da conta aparecem; definir alíquota 6% base líquida em um deles com "só daqui para frente"; a vigência aparece no histórico.
4. Em Ofertas, as ofertas aparecem com preço; filtro "não vinculadas" lista todas (nenhum funil tem oferta ainda) com o faturamento acumulado.
5. Abrir um funil, adicionar uma oferta como front; tentar adicioná-la a outro funil: aviso de conflito com link.
6. Após o próximo ciclo (ou "Atualizar agora"), o funil mostra sugestões de bump e upsell; confirmar uma e descartar outra; a descartada não volta no ciclo seguinte.
7. `conferencia_vendas_mensal` do mês passado bate com o relatório de vendas da Greenn em quantidade e valor bruto, e os reembolsos do mês batem.
8. Um cliente com compras às 10h00, 10h03 e 10h07 (dados de semente no teste) resulta em duas transações, a segunda marcada como recompra, com `funil_entrada` igual ao funil da primeira.
9. Mudar a janela de transação para 10 min e reprocessar: vira uma transação só.
10. Fazer um reembolso de teste na Greenn: na reconsulta seguinte a venda muda para `reembolsada` com `reembolsada_em` preenchida.

## O que preciso de você

1. **Token da Greenn** com escopos de leitura (`sales:read`, `products:read`, `offers:read`), gerado em Configurações do sistema → Integrações e Tokens. Coloque no ambiente desta sessão como `GREENN_TOKEN_SONDA` (só para a Etapa 0; o token de produção entra pela tela de Integrações e vai para o Vault). Sem ele, escrevo a Etapa 1 inteira e a Etapa 2 pelo spec, mas não fecho as decisões 1 e 2.
2. **Confirmar as 13 decisões** da tabela, em especial a 2 (webhook antecipado como fonte complementar da taxa), a 7 (assinaturas) e a 8 (não guardar vendas nunca pagas).
3. **Período da importação retroativa** na primeira conexão (proposta: tudo).
4. **Supabase**: confirmar que o projeto é do plano Pro ou superior se a conta tiver mais de ~20 mil vendas (limite de tempo das Edge Functions no plano gratuito torna a importação muito lenta, embora continue funcionando por ser retomável).
