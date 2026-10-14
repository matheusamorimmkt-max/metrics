# Plano — Atualização contínua (dados quase em tempo real, tela estável)

Status: **proposto em 2026-10-14; aguarda revisão do usuário antes do código.**

## Objetivo

Os dados chegam ao banco o mais rápido que as plataformas permitem, em segundo plano,
sem o usuário fazer nada. A tela, porém, **só muda quando o usuário clica em
"Atualizar agora"**, para uma análise em andamento não mudar debaixo dos olhos dele. O
clique é instantâneo: mostra o que já está no banco, sem esperar sincronização.

**Pronto quando:** uma venda aprovada na Greenn está no banco em menos de 10 segundos;
o gasto do Meta está no banco com no máximo 2 minutos de atraso em relação ao que o
Meta libera; o botão "Atualizar agora" responde em menos de 1 segundo e nunca fica
bloqueado; a Home avisa que há dados novos sem redesenhar os números sozinha.

## Como é hoje

| Peça                    | Hoje                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Greenn                  | Consulta à API a cada 15 min (pg_cron) e ao entrar no app. Reconsulta diária de 60 dias. Sem webhook.                                             |
| Meta                    | Consulta a cada 15 min e ao entrar. Reconsulta diária de 7 dias. Importação do histórico a cada 1 min enquanto durar.                             |
| Botão "Atualizar agora" | Dispara um ciclo nas duas fontes e **espera o ciclo terminar** (segundos a dezenas de segundos). Bloqueado durante o ciclo e por 1 minuto depois. |
| Tela                    | Só muda ao recarregar ou ao clicar no botão. Não avisa que há dados novos.                                                                        |

## Princípios do plano

1. **Coleta e exibição são coisas separadas.** Conectores enchem o banco continuamente; a tela lê o banco quando o usuário pede.
2. **Empurrar quando a plataforma permite, puxar quando não permite.** Greenn tem webhook; Meta não.
3. **O clique nunca espera a plataforma.** "Atualizar agora" redesenha com o que há no banco e, por baixo, pede um ciclo novo se o último for antigo.
4. **O usuário sempre sabe de quando são os números.** Cada fonte mostra a hora do último dado e se há coisa nova esperando.
5. **Nada de recarregar sozinho.** Sem auto-refresh dos números. O aviso de "há dados novos" é o máximo que a tela faz por conta própria.

## Etapas

### Etapa 1 — Webhook da Greenn (vendas em segundos)

- Nova Edge Function `greenn-webhook` (`supabase/functions/greenn-webhook/`), pública, que recebe o `POST` da Greenn.
- **Segurança:** valida o cabeçalho `X-Webhook-Token` contra o token guardado no Vault da organização (nova credencial `greenn_webhook`, salva em Integrações → Greenn → "Token de webhook"; o token de API `grn_live_` continua separado). Rejeita sem token válido; nunca registra o token em log. Limita o corpo a 256 KB.
- **Roteamento por organização:** a URL cadastrada na Greenn leva um identificador opaco da organização (`/greenn-webhook?org=<uuid-curto>`), e o token tem que bater com o daquela organização. Assim o mesmo endpoint serve várias empresas na fase SaaS.
- **Idempotência:** cada evento é gravado em `webhook_eventos` (organização, plataforma, id externo da venda, `event`, `currentStatus`, corpo bruto, recebido_em, processado_em, erro). Evento repetido não duplica venda: a venda é feita por upsert pela chave `(organizacao_id, plataforma, id_externo)`, a mesma do conector.
- **Mesmo tradutor:** o corpo do webhook passa por `supabase/functions/_shared/greenn/tradutor.ts`, com um adaptador para as diferenças documentadas (`sale.fee`, `seller_balance`, `bump_id`, `client`, `offer`, `affiliate`, `saleMetas`). O webhook traz a **taxa do gateway** (`fee`), que a API não traz: o campo `taxa_gateway_origem` passa a `gateway` para vendas recebidas por webhook, e o lucro fica correto.
- Após gravar: chama `recalcular_transacoes` e `sugerir_ofertas` só para o cliente e a oferta envolvidos (versão incremental dessas funções, para não varrer tudo a cada venda).
- **A API continua como conferência:** o ciclo de 15 min e a reconsulta de 60 dias ficam como estão, corrigindo qualquer evento perdido. Se o webhook ficar 30 min sem receber nada enquanto a API traz vendas novas, o card da Greenn avisa "webhook sem receber eventos".
- **Confere:** uma venda de teste na Greenn aparece em `vendas` em menos de 10 s e a Home mostra ao clicar em "Atualizar agora".
- **Depende de você:** cadastrar a URL do painel na Greenn (Configurações do sistema → Integrações e Tokens → Webhook) e colar o token de webhook em Integrações. O formato exato do corpo é confirmado com os primeiros eventos reais (o corpo bruto fica guardado para ajuste do adaptador sem perder dados).

### Etapa 2 — Meta a cada 2 minutos, barato

- Novo modo `curto` no `meta-sync`: busca só **hoje e ontem** nas métricas, mais os status de campanhas, conjuntos e anúncios (para as chaves). Não busca criativos nem vídeos.
- pg_cron: `ciclo_curto` a cada 2 min (modo `curto`), `ciclo_incremental` a cada 15 min (7 dias, como hoje, com criativos), `ciclo_reconsulta` diário. `configurar_agendamento` cria os três.
- **Lock por modo:** o ciclo curto não entra na fila do incremental e vice-versa; dois ciclos da mesma integração podem correr juntos desde que sejam de modos diferentes (índice parcial passa a `(integracao_id, modo) where status = 'executando'`). Upserts são idempotentes, então a ordem não importa.
- **Orçamento de chamadas:** ciclo curto ≈ 4 a 6 chamadas (1 conta, 1 campanhas, 1 conjuntos, 1 anúncios, 1 a 2 de métricas). 30 ciclos/hora ≈ 180 chamadas/hora. Limite do Meta no nível básico: 600 + 400 × anúncios ativos por hora. Com 5 anúncios ativos, 2.600/hora. Folga de mais de 10 vezes. Se o cabeçalho de consumo do Meta passar de 80%, o ciclo curto pula uma rodada e registra em `sincronizacoes`.
- **Atraso que não some:** o próprio Meta revisa os números de hoje ao longo do dia e pode levar minutos para refletir um gasto. O painel mostra "Meta: dados de HH:MM" para deixar isso claro.
- **Confere:** gasto de hoje no painel bate com o Gerenciador com até 2 minutos de diferença, por 1 hora seguida.

### Etapa 3 — "Atualizar agora" instantâneo e sem bloqueio

- O clique faz **duas coisas, sem esperar uma pela outra**: (a) redesenha a tela com os dados que já estão no banco (`router.refresh()`), em menos de 1 s; (b) se o último dado de alguma fonte tem mais de 2 min, dispara um ciclo em segundo plano (`after()`), sem travar o botão.
- Sem bloqueio de 1 minuto. Cliques repetidos só redesenham; o ciclo em segundo plano não é duplicado (lock do banco).
- O cabeçalho passa a ter: **"Dados de 14h32"** (hora do dado mais recente no banco, por fonte, no fuso da organização) e, quando um ciclo terminou depois da última vez que a tela foi desenhada, um ponto azul com **"Há dados novos — Atualizar agora"**. Esse aviso é a única coisa que muda sozinha; os números, não.
- Como a tela descobre que há dados novos: consulta leve a cada 30 s (`sincronizacoes` concluídas depois de `desenhado_em`), ou Supabase Realtime na tabela `sincronizacoes`. Começa com a consulta leve (sem infraestrutura nova); Realtime fica como melhoria.
- **Confere:** clique responde em menos de 1 s; nunca aparece "Aguarde 1 minuto"; o ponto azul aparece em até 30 s depois de um ciclo terminar e some ao clicar.

### Etapa 4 — Frescor por fonte e falhas visíveis

- Card de cada integração mostra: hora do último dado, hora do último ciclo, modo, duração e erro. Na Home, ao lado da hora, um ícone discreto por fonte (verde ok, amarelo atrasado mais de 10 min, vermelho com erro).
- Se uma fonte falha, a outra continua: a Home mostra o último ciclo completo de cada uma e diz qual falhou (regra do PRD, já existe; aqui só ganha o detalhe por fonte).
- `sincronizacoes` ganha limpeza: registros com mais de 90 dias são apagados por um job diário, para a tabela não crescer sem fim com 30 ciclos/hora.

### Etapa 5 — Desempenho da Home com dados chegando o tempo todo

- `metricas_diarias` continua uma view comum enquanto a Home responder em menos de 1 s. Com o webhook e o ciclo de 2 min, o volume de vendas por dia não muda; o que muda é a frequência de escrita, que a view não sente.
- Gatilho de decisão: se a Home passar de 1 s em 3 medições seguidas, materializar a view por dia e funil e atualizar ao fim de cada ciclo e de cada lote de webhook (`refresh materialized view concurrently`).
- Índices a confirmar nesta etapa: `vendas (organizacao_id, vendida_em)`, `metricas_anuncio_diarias (organizacao_id, data)`, `sincronizacoes (integracao_id, status)`.

## Ordem e esforço

| Ordem | Etapa                                        | Esforço        | Ganho                                        |
| ----- | -------------------------------------------- | -------------- | -------------------------------------------- |
| 1     | 3 — Botão instantâneo e aviso de dados novos | pequeno        | Tira a espera e o bloqueio hoje mesmo        |
| 2     | 2 — Meta a cada 2 min                        | pequeno        | Gasto quase em tempo real                    |
| 3     | 1 — Webhook da Greenn                        | médio          | Vendas em segundos e taxa do gateway correta |
| 4     | 4 — Frescor por fonte                        | pequeno        | Confiança no que está na tela                |
| 5     | 5 — Desempenho                               | só se precisar | Mantém a Home rápida                         |

As etapas 3 e 2 não dependem de nada seu e podem ir ao ar primeiro. A etapa 1 depende do cadastro da URL e do token de webhook na Greenn.

## Custos e limites

- **Greenn:** webhook não conta no limite de 100 chamadas/min. A API continua em 1 ciclo a cada 15 min.
- **Meta:** ~180 chamadas/hora no ciclo curto + ~40/hora no incremental, contra um limite de milhares por hora. Monitorado pelo cabeçalho de consumo.
- **Supabase:** Edge Functions passam de ~200 para ~1.100 execuções/dia por organização (30/h × 24 + 4/h × 24 + webhooks). O plano gratuito permite 500 mil/mês; o Pro, 2 milhões. Com 10 empresas na fase SaaS, ~330 mil/mês: ainda cabe no gratuito, com folga no Pro.
- **Banco:** `sincronizacoes` cresce ~1.100 linhas/dia por organização; a limpeza de 90 dias segura em ~100 mil linhas por organização.

## Decisões a confirmar

1. **Ciclo curto do Meta a cada 2 min** (proposta) ou 5 min. Dois minutos é o menor intervalo que ainda deixa folga de 10 vezes no limite; abaixo disso o ganho é pequeno porque o próprio Meta revisa os números em janelas de minutos.
2. **Aviso "Há dados novos"** com ponto azul no cabeçalho (proposta), ou nenhum aviso (a tela só muda ao clicar, sem nenhum sinal). A proposta mantém os números parados e só sinaliza.
3. **Webhook agora** (antecipando a fase SaaS) ou só depois do token da API. A proposta é agora, porque o webhook também traz a taxa do gateway, que a API não entrega.
4. **Retenção de `sincronizacoes`**: 90 dias (proposta).

## O que preciso de você

1. Confirmar as 4 decisões acima.
2. Na Greenn, quando eu avisar: cadastrar a URL do webhook (eu mando a URL exata) e colar o token de webhook em Integrações → Greenn.
3. Aplicar os SQLs das migrations desta fase no SQL Editor (eu mando compactos, como sempre) e rodar `configurar_agendamento` de novo, porque os jobs do pg_cron mudam.

## Fora deste plano

- Google Ads, Hotmart, Kiwify e Eduzz: cada uma terá o próprio conector, seguindo o mesmo desenho (empurrar quando houver webhook, puxar quando não houver).
- Notificações por e-mail ou WhatsApp quando um funil ficar vermelho: depende do canal; fica para depois do uso interno.
