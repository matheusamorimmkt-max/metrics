# Plano da Fase 2 — Conector Greenn

Status: **proposta, aguardando revisão do usuário** (2026-10-07)

Pré-requisito: a Fase 1 está no ar, com o banco aplicado no Supabase. Falta só o roteiro de aceite pela interface, que depende de corrigir a `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel (ver `docs/setup.md`, "Login dá Invalid API key").

## Objetivo

Trazer da Greenn, sem cadastro manual, tudo o que o painel precisa para calcular receita de verdade: produtos, ofertas, vendas, clientes, reembolsos e chargebacks. A partir disso o usuário informa só o que a API não traz (alíquota e base do imposto por produto, papel de cada oferta no funil) e o sistema calcula transações, recompra e sugere bumps e upsells.

**Pronto quando:** o faturamento bruto, os reembolsos e a quantidade de vendas de um mês fechado batem com o relatório da Greenn, e a tela de cada funil mostra as ofertas vinculadas por papel.

## O que a API da Greenn entrega (conferido na documentação oficial)

Fonte: `https://apiadm.greenn.com.br/docs/api` (OpenAPI 3.1, API Pública v1).

| Item                                  | Situação                                                                                                                                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação                          | Token pessoal `grn_live_…` em `Authorization: Bearer`. Escopos `sales:read`, `products:read`, `offers:read`. Só leitura, como o PRD pede.                                                                                                                  |
| Limite de chamadas                    | **100 por minuto por token.** Cabeçalhos `X-RateLimit-Limit` e `X-RateLimit-Remaining`; ao estourar, `429` com `Retry-After` (segundos). A doc proíbe chamadas em paralelo para contornar.                                                                 |
| `GET /sales`                          | Paginado (`per_page` até 100, `meta.last_page`). Filtros `created_after/before`, `paid_after/before`, `refunded_after/before`, `status`, `offer_id`, `product_id`. Ordenação `-paid_at`.                                                                   |
| Campos por venda (lista)              | `id`, `status`, `amount`, `total`, `currency`, `method`, `installments`, `type`, `created_at`, `paid_at`, **`refunded_at`**, `product_id`, `client_id`, **`offer_id`**, `affiliate_id`, `transaction_id`, `coupon_id`, `coupon_code`, `participants_count` |
| `GET /sales/{id}`                     | Acrescenta `product`, `client`, `offer`, `affiliate`, `participants` (estrutura interna não detalhada no schema).                                                                                                                                          |
| Status possíveis                      | `paid`, `refused`, `refunded`, `chargedback`, `waiting_payment`, `unpaid`                                                                                                                                                                                  |
| `GET /products`, `GET /products/{id}` | Paginado. `id`, `nano_id`, `name`, `type`, `status`, `is_active`, `default_offer_id`, `offers_count`.                                                                                                                                                      |
| `GET /offers`                         | Paginado. `id`, `hash`, `product_id`, `name`, `amount`, `method`, `status`, `active`, `default`, parcelamento.                                                                                                                                             |
| **Taxa do gateway**                   | **Não documentada no REST.** Só o webhook `saleUpdated` traz `fee` e `seller_balance` (líquido do vendedor).                                                                                                                                               |
| **Comissões por parceiro**            | **Não documentadas no REST.** Há `affiliate_id` e `participants` no detalhe, sem valores no schema. A API de pagamento registra comissão em percentual por participante.                                                                                   |
| ID da oferta no webhook               | O objeto `offer` do webhook traz `name`, `amount`, `method`, `hash`, mas **não o `id`**. O REST traz o `offer_id`; por isso o REST continua sendo a fonte principal.                                                                                       |
| Unidade de `amount`                   | Schema do REST diz `integer`; o webhook documenta `float` em reais. **Ambíguo**: confirmar com o token real.                                                                                                                                               |
| Order bump                            | O webhook tem `bump_id`; no REST não aparece. Confirmar se cada bump é uma venda própria (com `id` e `offer_id`) ou se vem embutido.                                                                                                                       |
| UTMs                                  | `saleMetas` (lista `meta_key`/`meta_value`) no webhook. No REST, confirmar se o detalhe traz.                                                                                                                                                              |
| Cliente                               | `client_id` na lista; e-mail, nome, `document` (CPF/CNPJ) no detalhe e no webhook.                                                                                                                                                                         |

Conclusão: a API resolve funil (pelo `offer_id`), faturamento, status e data de reembolso. **Taxa do gateway e comissões são o risco**: se o detalhe da venda não trouxer esses valores, o lucro precisa de uma estimativa configurável (decisão 1).

## O que fica fora da Fase 2

- Conector Meta e ciclo unificado Meta + Greenn (Fase 3). O ciclo desta fase já grava `ciclo_id` e corte para a Fase 3 só acrescentar a segunda fonte.
- Home real, visões materializadas e semáforo (Fase 4). Aqui entram só as telas de Configurações e uma listagem simples de vendas para conferência.
- Webhook da Greenn (Fase 7), salvo se a decisão 1 pedir antecipação.
- Assinaturas: vendas com `type = SUBSCRIPTION` são importadas e contam como venda na data de cada cobrança paga; não há tela de assinaturas.

## Decisões propostas (confirmar antes do código)

| #   | Tema                        | Proposta                                                                                                                                                                                                                                                                                                                                                                                   | Alternativa                                                                                                   |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | Taxa do gateway e comissões | Etapa 0 sonda a API com o token real. Se `GET /sales/{id}` trouxer `fee` e valores por participante, usa. Se não trouxer, a taxa é **estimada** por regra da integração (padrão da tabela pública da Greenn: 4,99% + R$ 1,00; 8,99% + R$ 1,00 com afiliado), gravada com `origem = 'estimada'` e visível na tela como "estimada"; comissões entram por percentual cadastrado por parceiro. | Antecipar o webhook da Greenn (traz `fee` e `seller_balance` reais) para esta fase, como complemento ao REST. |
| 2   | Token no Vault              | A tela Integrações envia o token para a Edge Function `greenn-conectar`, que testa (`GET /products?per_page=1`), grava no Vault e salva só o `secret_id` em `integracoes`. O Next.js nunca persiste nem devolve o token.                                                                                                                                                                   | Gravar via RPC `security definer` a partir do server action. Mais simples, mas o token passa pelo Node.       |
| 3   | Período retroativo          | Primeira importação busca **12 meses**, configurável na tela ("importar desde"). A 100 vendas por chamada e 100 chamadas por minuto, 10 mil vendas levam cerca de 1 minuto.                                                                                                                                                                                                                | Importar tudo desde o início da conta.                                                                        |
| 4   | Mapeamento de status        | `paid → aprovada`, `refunded → reembolsada`, `chargedback → chargeback`, `refused → recusada`, `waiting_payment → aguardando`, `unpaid → nao_paga`. Só `aprovada`, `reembolsada` e `chargeback` entram no faturamento (as duas últimas são descontadas em `data_reembolso`). As demais ficam guardadas para a aba Vendas.                                                                  | Descartar recusadas e aguardando. Perde a taxa de aprovação do checkout.                                      |
| 5   | Funil sem front             | Aviso visível ("sem oferta front") em vez de bloqueio: um funil novo começa sem ofertas. Só bloqueia confirmar bump, upsell ou downsell num funil sem front.                                                                                                                                                                                                                               | Bloquear salvar funil sem front, como o PRD sugere literalmente.                                              |
| 6   | Mudança de alíquota         | Ao salvar, pergunta "só daqui para frente" (fecha a vigência atual e abre outra) ou "recalcular o histórico" (altera a vigência atual). O imposto é calculado na leitura, venda a venda, pela vigência da `data_venda`; não há coluna de imposto em `vendas`.                                                                                                                              | Gravar o imposto em cada venda. Rápido de ler, mas exige reprocessar ao recalcular.                           |
| 7   | Transações e recompra       | Função SQL `recalcular_transacoes(organizacao_id, desde)` roda após cada sincronização, só sobre os clientes com vendas novas. Regra: janela de `janela_transacao_min` a partir da **primeira** compra do grupo; recompra atribuída ao `funil_entrada` do cliente. Testada em pgTAP com o exemplo canônico (10h00, 10h03, 10h07).                                                          | Calcular em TypeScript na Edge Function. Mais difícil de testar e de reprocessar.                             |
| 8   | Sugestão de bumps e upsells | Função SQL `sugerir_funil_ofertas(organizacao_id)`: oferta não vinculada que aparece na **mesma transação** de um front em ≥ 70% das vezes vira sugestão de `bump` nesse funil; comprada pelo mesmo cliente em até 7 dias depois do front, sem estar na transação, vira sugestão de `upsell`. Nunca sobrescreve vínculo confirmado.                                                        | Limiares diferentes; sugerir também downsell (não há sinal claro no histórico).                               |
| 9   | Código do conector          | Mapeamento Greenn → formato interno em funções puras, sem dependência de Deno nem de Node, em `supabase/functions/_shared/greenn/`. A Edge Function importa por caminho relativo; o Vitest testa o mesmo arquivo com payloads gravados pela sonda (anonimizados).                                                                                                                          | Duplicar tipos em `src/dominio`. Diverge com o tempo.                                                         |
| 10  | Moeda                       | Importa todas as vendas com `moeda`; só as da moeda da organização entram nos cálculos. Vendas em outra moeda aparecem na listagem com aviso.                                                                                                                                                                                                                                              | Converter pela cotação do dia. Fora do MVP.                                                                   |
| 11  | Disparo e trava             | Um ciclo por vez por organização, garantido por `sincronizacoes` (linha `executando` única por organização, índice parcial). Dispara pelo botão "Atualizar agora", no login (no máximo uma vez a cada 15 min) e pelo pg_cron a cada 15 min via `pg_net`. Reconsulta diária (60 dias de `refunded_after` e `paid_after`) na primeira execução depois das 3h no fuso da organização.         | pg_cron direto no banco sem Edge Function. Não dá: a chamada HTTP à Greenn precisa sair de fora do Postgres.  |

## Etapas

Cada etapa termina com um commit e algo conferível.

### Etapa 0 — Sonda da API (1 sessão)

- Script `scripts/sonda-greenn.ts` roda com `GREENN_TOKEN` do ambiente: lista 1 página de produtos, ofertas e vendas; busca o detalhe de 5 vendas (uma paga com afiliado, uma com bump, uma reembolsada, uma chargeback, uma de assinatura, se existirem); mede os cabeçalhos de rate limit.
- Grava em `docs/greenn-amostra.md` os payloads **anonimizados** (sem e-mail, CPF, nome) e a conclusão sobre: unidade de `amount`, presença de `fee` e comissões, forma do bump, UTMs no REST.
- **Confere:** a tabela "O que a API entrega" acima é atualizada com "confirmado" ou "ausente" em cada linha, e a decisão 1 é fechada.

### Etapa 1 — Schema de vendas (migrations + pgTAP)

Tabelas novas, todas com `organizacao_id`, RLS por organização e testes de isolamento:

| Tabela           | Colunas além das convenções                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Restrições e índices                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `clientes`       | `email text` (minúsculas), `cpf text null`, `nome text null`, `plataforma`, `id_externo`, `primeira_compra_em timestamptz null`, `funil_entrada_id uuid null → funis`                                                                                                                                                                                                                                                                                                                                             | único `(organizacao_id, email)`; único `(organizacao_id, plataforma, id_externo)`; índice em `cpf`                                        |
| `vendas`         | `plataforma`, `id_externo`, `cliente_id`, `oferta_id null → ofertas`, `produto_id null → produtos`, `valor_bruto numeric(14,2)`, `taxa_gateway numeric(14,2) null`, `taxa_gateway_origem text` (`api`, `estimada`), `status text`, `data_venda timestamptz`, `data_reembolso timestamptz null`, `meio_pagamento text`, `parcelas int`, `moeda char(3)`, `tipo text` (`transacao`, `assinatura`), `afiliado_id_externo text null`, `cupom text null`, `utms jsonb`, `transacao_id uuid null`, `dados_brutos jsonb` | único `(organizacao_id, plataforma, id_externo)`; índices `(organizacao_id, data_venda)`, `(oferta_id)`, `(cliente_id)`, `(transacao_id)` |
| `comissoes`      | `venda_id`, `parceiro_nome text`, `parceiro_id_externo text null`, `tipo text` (`afiliado`, `coprodutor`, `outro`), `valor numeric(14,2)`, `origem text` (`api`, `estimada`)                                                                                                                                                                                                                                                                                                                                      | índice em `venda_id`                                                                                                                      |
| `transacoes`     | `cliente_id`, `inicio timestamptz`, `fim timestamptz`, `funil_id uuid null`, `eh_recompra bool`, `qtd_vendas int`, `valor_total numeric(14,2)`                                                                                                                                                                                                                                                                                                                                                                    | índices `(organizacao_id, inicio)`, `(cliente_id, inicio)`                                                                                |
| `sincronizacoes` | `ciclo_id uuid`, `integracao_id → integracoes`, `corte timestamptz`, `origem text` (`login`, `botao`, `agendado`, `retroativa`, `reconsulta`), `inicio`, `fim null`, `status text` (`executando`, `concluida`, `falhou`), `registros int`, `erros jsonb`                                                                                                                                                                                                                                                          | índice parcial único `(organizacao_id) where status = 'executando'` (trava de um ciclo por vez); índice `(organizacao_id, inicio desc)`   |

Também: `integracoes.config` ganha `importar_desde`, `taxa_percentual`, `taxa_fixa`, `taxa_percentual_afiliado` (decisão 1); funções `recalcular_transacoes` e `sugerir_funil_ofertas` (decisões 7 e 8) com testes pgTAP; `historico_aliquotas` passa a ser alimentada por trigger ao mudar `produtos.aliquota_imposto`/`base_imposto`.

- **Confere:** `pnpm db:test` passa, incluindo o exemplo canônico de transação e um caso de sugestão de bump.

### Etapa 2 — Edge Functions do conector

- `supabase/functions/_shared/greenn/`: cliente HTTP com paginação, respeito a `Retry-After` e `X-RateLimit-Remaining` (pausa antes de zerar), e funções puras de mapeamento (venda, produto, oferta, cliente → formato interno).
- `greenn-conectar`: valida o token, grava no Vault, cria/atualiza a linha em `integracoes`.
- `greenn-sincronizar`: abre registro em `sincronizacoes`, importa produtos → ofertas → vendas (incremental por `created_after` desde o último corte menos 1 dia; na reconsulta, `paid_after` e `refunded_after` de 60 dias), faz upsert idempotente por `(organizacao_id, plataforma, id_externo)`, chama `recalcular_transacoes` e `sugerir_funil_ofertas`, fecha o registro com contagens e erros. Falha em qualquer passo marca `falhou` sem apagar o ciclo anterior.
- **Confere:** rodando a função contra a conta real, a contagem de vendas aprovadas e o faturamento de um mês fechado batem com o relatório da Greenn (diferença zero ou explicada venda a venda).

### Etapa 3 — Agendamento e botão "Atualizar agora"

- pg_cron a cada 15 min chama `greenn-sincronizar` por `pg_net` para cada organização com integração ativa.
- No app: server action `sincronizarAgora` (respeita a trava e o intervalo de 1 min), disparo no login (no máximo um a cada 15 min por organização) e indicador no cabeçalho ("Atualizado às 14h32", "Atualizando…", "Falhou: Greenn").
- **Confere:** dois cliques seguidos não geram dois ciclos; `sincronizacoes` registra origem, início, fim e contagens.

### Etapa 4 — Telas

| Tela                     | Funções                                                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integrações → Greenn     | colar token (nunca exibido depois), "importar desde", regra de taxa (se decisão 1 pedir), status, última sincronização, histórico das 20 últimas, botões "Testar conexão", "Sincronizar agora", "Desconectar".                               |
| Produtos                 | lista importada (nome, ofertas, vendas 30 dias, alíquota, base); editar alíquota e base com a pergunta da decisão 6; produto inativo na Greenn aparece esmaecido.                                                                            |
| Ofertas                  | lista com produto, preço, funil e papel; seção **"Ofertas não vinculadas"** com faturamento acumulado; filtro por produto; link para o funil.                                                                                                |
| Funil → Ofertas do funil | substitui o aviso da Fase 1: adicionar oferta por papel (`front`, `bump`, `upsell`, `downsell`), reordenar, remover; sugestões com "Confirmar" e "Ignorar"; aviso de conflito quando a oferta já está em outro funil (uma oferta, um funil). |
| Vendas (conferência)     | listagem simples por período: data, cliente (e-mail), oferta, funil, valor, taxa, status. Sem CPF. É a base da aba Vendas da Fase 5, serve para conferir com a Greenn.                                                                       |

- **Confere:** roteiro de aceite abaixo.

### Etapa 5 — Qualidade

- Vitest: mapeamentos com payloads da sonda, cálculo da taxa estimada, normalização de e-mail e CPF.
- pgTAP: RLS das 5 tabelas, trava de ciclo, transações, sugestões, vigência de alíquota.
- Playwright: conectar (com token de teste), ver produtos, vincular oferta a funil, ver venda na listagem.
- Script `scripts/conferir-greenn.ts`: compara, para um mês, totais do banco com um CSV exportado da Greenn e lista as divergências.

## Roteiro de aceite

1. Em Integrações, colar o token da Greenn: "Testar conexão" mostra o nome da conta e a quantidade de produtos.
2. "Sincronizar agora": a tela mostra o andamento e, ao terminar, a contagem de produtos, ofertas, vendas e clientes importados.
3. Em Produtos, informar alíquota 6% base bruta num produto; a venda mais antiga dele mostra imposto calculado.
4. Alterar a alíquota para 8% escolhendo "só daqui para frente"; vendas antigas continuam com 6%.
5. Em Ofertas, a seção "não vinculadas" lista as ofertas com venda; vincular uma como `front` do "Funil Desafio".
6. Abrir o funil: a sugestão de bump aparece com o percentual de coincidência; confirmar. Tentar vincular a mesma oferta em outro funil: bloqueado com aviso.
7. Em Vendas, filtrar o mês passado: faturamento bruto e quantidade iguais ao relatório da Greenn.
8. Reembolsar uma venda de teste na Greenn; após a próxima sincronização (ou reconsulta), o status muda para reembolsada com a data.
9. Cliente com compras às 10h00, 10h03 e 10h07 (simulado por fixture) aparece com 2 transações e 1 recompra atribuída ao funil de entrada.
10. Segunda organização não vê produtos, ofertas nem vendas da primeira.

## O que preciso de você

1. **Token da Greenn** com escopos `sales:read`, `products:read` e `offers:read`, colocado no ambiente desta sessão como `GREENN_TOKEN` (nunca no repositório). Sem ele a Etapa 0 não roda e a decisão 1 fica em aberto.
2. **Confirmar as 11 decisões** acima, ou dizer o que muda. A 1 é a que mais afeta o lucro mostrado.
3. **Corrigir a chave anon na Vercel** e refazer o deploy, para o roteiro da Fase 1 poder rodar (`docs/setup.md`, "Login dá Invalid API key").
4. Um **relatório de vendas de um mês fechado** exportado da Greenn (CSV), para a conferência final da fase.
