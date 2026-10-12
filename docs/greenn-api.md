# API da Greenn — o que ela entrega (referência para o conector)

Levantado em 2026-10-09 a partir do spec OpenAPI publicado em `https://apiadm.greenn.com.br/docs/api` e da central de ajuda (`ajuda.greenn.com.br`, categoria Integrações). Resolve as pendências do PRD sobre a API. Tudo o que está marcado como **a confirmar** depende de uma chamada real com o token da conta (Etapa 0 do plano da Fase 2).

## Acesso

| Item         | Valor                                                                                                                                                                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base         | `https://apiadm.greenn.com.br/api/v1`                                                                                                                                                                                                                                                                                 |
| Autenticação | `Authorization: Bearer grn_live_…` (Personal Access Token gerado na conta Greenn)                                                                                                                                                                                                                                     |
| Escopos      | `sales:read`, `products:read`, `offers:read` (leitura). `sales:refund` não será pedido.                                                                                                                                                                                                                               |
| Limite       | **100 requisições por minuto, por token.** Cabeçalhos `X-RateLimit-Limit` e `X-RateLimit-Remaining` em toda resposta; `429` vem com `Retry-After` em segundos, que deve ser respeitado à risca. Sem `Retry-After` (erro de rede), backoff exponencial com jitter. Nunca chamadas em paralelo para contornar o limite. |
| Paginação    | `page` e `per_page` (máximo 100). Resposta `{ data: [...], meta: { current_page, per_page, total, last_page } }`.                                                                                                                                                                                                     |
| Datas        | Filtros `*_after` / `*_before` em formato `date` (AAAA-MM-DD). Campos de data em ISO 8601 (UTC).                                                                                                                                                                                                                      |
| Onde gerar   | Conta Greenn → Configurações do sistema → Integrações e Tokens.                                                                                                                                                                                                                                                       |

## Endpoints usados pelo conector

### `GET /products` e `GET /products/{id}`

Campos da lista: `id`, `nano_id` (identificador público alfanumérico), `name`, `type` (`DIGITAL`, `PHYSICALPRODUCT`, `EVENT`, `FILE`), `status`, `is_active`, `category_id`, `default_offer_id`, `offers_count`, `created_at`, `updated_at`. Filtros: `name`, `type`, `status`, `is_active`, `created_after/before`. Ordenação padrão `-created_at`.

Sem alíquota de imposto (esperado: é dado do usuário).

### `GET /offers`

Campos: `id` (numérico, **é o ID da oferta que define o funil**), `hash` (identificador público do checkout), `product_id`, `name`, `amount`, `method`, `period`, `trial`, `charges`, `default`, `status` (`approved`, `pending`, `disapproved`, `revision`), `active`, `currency_id`, `payment_methods`, `offer_group_id`, `max_installments` e afins, `created_at`, `updated_at`. Filtros: `product_id`, `active`, `status`, `hash`, `created_after/before`.

### `GET /sales` (lista)

Ordenada por `-created_at`. Filtros relevantes: `status`, `method`, `created_after/before`, `paid_after/before`, `refunded_after/before`, `product_id`, `offer_id`, `client_email`, `client_document`, `affiliate_id`, `co_seller`, `currency`, `search`. `sort` aceita `created_at`, `status`, `paid_at`, `total`, `refunded_at` (prefixo `-` para decrescente).

Campos de cada item: `id`, `status`, `amount`, `total`, `currency`, `method`, `installments`, `type` (`TRANSACTION` ou `SUBSCRIPTION`), `created_at`, `paid_at`, `refunded_at`, `product_id`, `client_id`, `offer_id`, `affiliate_id`, `transaction_id`, `coupon_id`, `coupon_code`, `participants_count`.

**O que a lista não traz:** taxa do gateway, valor líquido, e-mail e CPF do cliente, nome da oferta, comissões.

### `GET /sales/{id}` (detalhe)

Tudo da lista mais `participants` e os objetos `product`, `client`, `offer`, `affiliate` ("quando disponíveis"). O spec declara esses campos com tipo genérico, sem listar o conteúdo. **A confirmar na sonda:** se `client` traz `email` e `cpf_cnpj`; se existe `fee` / `seller_balance` como no webhook; a estrutura de `participants` (afiliado e coprodutores com valores).

### Status de venda

`paid`, `waiting_payment`, `refused`, `unpaid`, `refunded`, `chargedback`, `refund_pending`. `refunded_at` é a data do reembolso. **A confirmar:** se chargeback também preenche `refunded_at`; se não, a data do chargeback vem de `updated_at` da reconsulta.

### Valores

O spec da API declara `amount` e `total` como inteiros; o webhook documenta os mesmos campos como "valor em reais (R$)" com decimais (ex.: `97.0`, `fee: 2.91`). **A confirmar na sonda** se a API devolve reais ou centavos. O tradutor do conector normaliza para `numeric(14,2)` num único lugar.

## Webhook (fora do MVP, mas relevante)

`POST` para a URL do vendedor com `X-Webhook-Token`, `type: "sale"`, `event: "saleUpdated"`, `oldStatus`, `currentStatus` (usar só `currentStatus`; `oldStatus` pode vir igual). O objeto `sale` traz **`fee` (taxa em R$)**, **`seller_balance` (líquido para o vendedor em R$)**, `bump_id` (ID do order bump), `subscription_id`, `paid_at`, `coupon`; `client` traz `email`, `cpf_cnpj`, endereço; `offer` traz `{name, amount, method, hash}`; `affiliate` traz `{id, name, email}`; `saleMetas` traz UTMs. `productMetas`/`proposalMetas` vêm como `[]` quando vazios e como objeto quando preenchidos.

Se a sonda mostrar que o detalhe da venda **não** entrega `fee`, o webhook passa a ser a única fonte documentada da taxa do gateway por venda. O plano da Fase 2 trata esse caso (decisão 2).

## Respostas às pendências do PRD

| Pendência                 | Resposta                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ID da oferta por venda    | **Sim**: `offer_id` na lista e no detalhe. Pode vir `null` em vendas antigas ou sem oferta explícita (tratado no plano, decisão 6). |
| Taxa do gateway por venda | **Documentada só no webhook** (`fee`, `seller_balance`). No detalhe via API: a confirmar na sonda.                                  |
| Comissões por parceiro    | `affiliate_id` e `participants_count` na lista; `participants` e `affiliate` no detalhe. Estrutura e valores: a confirmar na sonda. |
| Data de reembolso         | **Sim**: `refunded_at`, com filtro `refunded_after/before` (base da reconsulta diária de 60 dias).                                  |
| Limite de chamadas        | **100/min por token**, com `Retry-After`. Ciclo de 15 min cabe com folga; a importação retroativa precisa ser fatiada e retomável.  |
