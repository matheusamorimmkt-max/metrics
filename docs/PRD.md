# Painel de Funis — Especificação do Produto

Oct 7, 2026 · @ricardo

## Visão geral

Um painel web que junta gasto em anúncios e vendas do gateway para mostrar, por funil e no negócio inteiro, quanto entrou, quanto saiu e quanto sobrou. Começa como ferramenta interna e depois vira SaaS.

**Para quem:** diretores de negócios de infoprodutos que vendem por funis. Na versão interna, só os diretores acessam.

**Princípios de produto**

- **Simples e resumido:** a Home responde em 5 segundos se o negócio está dando lucro e onde agir. Métricas secundárias ficam em abas.
- **Venda real, não venda do Meta:** a receita vem sempre do gateway. As compras reportadas pelo gerenciador nunca são métrica principal.
- **Lucro de verdade:** todos os custos variáveis entram no cálculo (taxa sobre anúncios, impostos, taxas do gateway, parceiros, reembolsos).
- **Funil definido por oferta:** o que define a qual funil uma venda pertence é o ID da oferta, não o nome do produto.
- **Independente de plataforma:** Meta e Greenn são os primeiros conectores; a base aceita outros gerenciadores e gateways sem refazer o sistema.

## Estrutura do negócio

O sistema organiza tudo em quatro níveis: **Categoria → Funil → Oferta → Produto**. A Home soma tudo; os filtros descem para uma categoria ou um funil.

### Categorias padrão

Cada empresa pode renomear as categorias ou criar novas. Dentro de cada uma, o usuário cria funis com o nome que quiser ("Funil Desafio", "Imersão X", "Mentoria Elite").

| Categoria | Exemplos de funis | Faturamento | Semáforo |
| --- | --- | --- | --- |
| Iscas gratuitas | e-books, aulas e eventos gratuitos | não | não |
| Front-end | funis de low ticket | sim | sim |
| Back-end | cursos, imersões, lançamentos | sim | não |
| High-end | mentorias, imersões de alto valor | sim | não |

**Lançamento** não é categoria: é um funil (geralmente no Back-end) com data de início e fim. A análise é sempre do período inteiro do lançamento.

### Produtos e ofertas

- **Produto:** o que é entregue. Guarda a alíquota de imposto e a base do imposto (bruto ou líquido), escolhidas pelo usuário.
- **Oferta:** o ID da oferta no gateway. Aponta para um produto e tem preço próprio. O mesmo produto pode ter várias ofertas.
- **Funil:** um conjunto de ofertas, cada uma com um papel.

| Papel | IDs de oferta por funil | Exemplo |
| --- | --- | --- |
| Produto principal (front) | 1 ou mais | Curso X por R$ 27 e por R$ 37 (teste de preço) |
| Order bump | 0 ou mais | Checklist por R$ 17 |
| Upsell | 0 ou mais | Curso Y por R$ 97 |
| Downsell | 0 ou mais | Curso Y por R$ 47 |

O curso X pode ser o produto principal do Funil A (oferta 123) e order bump do Funil B (oferta 456). Cada venda vai para o funil da sua oferta, e o imposto vem do produto.

### Regras de configuração do funil

1. O usuário cria o funil, escolhe a categoria e informa o produto principal, os order bumps e os upsells. Cada papel aceita um ou mais IDs de oferta (por exemplo, o mesmo front em checkouts ou preços diferentes).
2. O sistema **sugere** a estrutura a partir do histórico de vendas: ofertas no mesmo pedido do front são prováveis order bumps; ofertas compradas pelo mesmo cliente logo depois do front são prováveis upsells.
3. O usuário confirma ou troca cada sugestão.
4. Uma oferta pertence a um único funil. Se o usuário tentar colocar a mesma oferta em dois funis, o sistema avisa o conflito.
5. Ofertas com vendas que não estão em nenhum funil aparecem como **"ofertas não vinculadas"**, com o faturamento acumulado.

## Integrações

O MVP conecta Meta Ads e Greenn. Cada integração é um **conector** que traduz os dados da plataforma para um formato interno padrão; o resto do sistema só enxerga esse formato.

| Conector | O que traz | Como |
| --- | --- | --- |
| Meta Ads | gasto, impressões, cliques, visualizações de página, inícios de checkout e leads (pixel), por campanha, conjunto, anúncio e dia | API de Marketing; histórico na primeira conexão |
| Greenn | vendas, ofertas, produtos, clientes, status, taxas do gateway, comissões de parceiros, reembolsos e chargebacks | API (sem webhook no MVP); histórico retroativo na primeira conexão |
| CRM (futuro) | leads, agendamentos, comparecimentos e vendas por closer | conector a definir |

Todos os conectores rodam juntos, no mesmo ciclo de atualização.

### Ciclo de atualização (Meta e gateway juntos)

Meta e Greenn são sempre atualizados no mesmo ciclo, com o mesmo horário de corte. Assim o gasto e as vendas na tela correspondem ao mesmo momento.

- **Quando roda:** sempre que o usuário entra no sistema, quando clica em **Atualizar agora** e automaticamente a cada 15 minutos.
- **Horário de corte:** o ciclo marca um horário e busca gasto e vendas até ele. A tela só passa a mostrar o novo ciclo quando as duas fontes terminam.
- **Falha em uma fonte:** a tela mantém o último ciclo completo e avisa qual fonte falhou, em vez de misturar gasto novo com vendas antigas.
- **Um ciclo por vez:** se já há um ciclo rodando, o botão mostra o andamento em vez de iniciar outro. Depois de concluído, o botão volta a ficar disponível após 1 minuto, para respeitar os limites das APIs.
- **Indicador no topo:** "Atualizado às 14h32", com o estado do ciclo (atualizando, concluído, falhou).
- **Limite do Meta:** o próprio Meta leva alguns minutos para consolidar o gasto e revisa os números dos últimos dias. "Tempo real" significa o dado mais recente que as APIs entregam naquele momento.
- **Reconsulta diária:** uma vez por dia, o ciclo também reprocessa os últimos 60 dias da Greenn (reembolsos e chargebacks) e os últimos 7 dias do Meta (números revisados).

### Greenn só por API

- O sistema consulta a API a cada ciclo e grava apenas o que é novo ou mudou, identificado pelo ID da venda.
- Uma venda aprovada pode virar reembolso ou chargeback dias depois; a reconsulta diária atualiza esses status.
- Quando houver muitos clientes no SaaS, somar o webhook para reduzir chamadas à API. O ciclo continua como garantia e mantém Meta e gateway alinhados.

### Vínculo de campanhas aos funis

- Tela em Configurações lista todas as campanhas importadas, com um seletor de funil em cada uma.
- Campanhas sem vínculo aparecem destacadas como **"não vinculadas"**, com o gasto acumulado, para que nenhum gasto fique de fora sem o usuário perceber.
- O gasto de campanhas não vinculadas **entra no total da Home**, mas não em nenhum funil.
- Opcional: regras de nome sugerem o vínculo automaticamente (ex.: campanhas com "\[FE-A\]" vão para o Funil A). O usuário confirma.
- O vínculo é por campanha no MVP; a estrutura permite descer para conjunto de anúncios no futuro.

### Plataformas futuras

Novos conectores entram sem mexer nas telas nem nos cálculos: Google Ads, TikTok Ads e YouTube no lado do tráfego; Hotmart, Kiwify, Eduzz, Stripe e outros no lado do pagamento; CRMs no lado comercial.

## Modelo financeiro

O lucro desconta todos os custos variáveis. O ROAS mede o faturamento por real investido; o ROI mede o lucro por real investido.

### Investimento

```latex
\text{Investimento total} = \text{Gasto em anúncios} \times (1 + 12{,}15\%)
```

Os 12,15% são configuráveis por empresa, já que no SaaS cada cliente pode ter um percentual diferente.

### Do faturamento ao lucro

| Linha | Origem | Observação |
| --- | --- | --- |
| Faturamento bruto | Greenn | soma das vendas aprovadas no período |
| (−) Reembolsos e chargebacks | Greenn | descontados na data em que acontecem |
| (−) Taxas do gateway | Greenn | valor por venda, vindo da API |
| (−) Parceiros | Greenn | afiliados, coprodutores e demais comissões, por venda |
| (−) Impostos | cálculo | alíquota do produto de cada oferta, sobre a base escolhida |
| = Receita líquida | cálculo |  |
| (−) Investimento total | cálculo | gasto em anúncios + 12,15% |
| = Lucro | cálculo |  |

```latex
\text{ROAS} = \frac{\text{Faturamento bruto}}{\text{Investimento total}} \qquad \text{ROI} = \frac{\text{Lucro}}{\text{Investimento total}}
```

### Base do imposto (escolha por produto)

- **Bruto:** alíquota × (faturamento bruto − reembolsos).
- **Líquido:** alíquota × (faturamento bruto − reembolsos − taxas do gateway − parceiros).

O imposto é calculado venda a venda, com a alíquota e a base vigentes do produto. Quando o usuário muda a alíquota, o sistema pergunta se vale só daqui para frente ou se recalcula o histórico.

### Outras métricas financeiras

- **CAC:** investimento total ÷ clientes novos no período.
- **Margem:** lucro ÷ faturamento bruto.
- **Lucro por transação:** lucro ÷ número de transações.
- Todas as métricas são calculadas para o negócio, para cada categoria e para cada funil, com o mesmo método.

## Clientes, transações, recompra e reembolso

Todas as compras do mesmo cliente dentro de 5 minutos formam uma transação; qualquer compra depois disso é recompra.

### Definições

| Métrica | Regra |
| --- | --- |
| Cliente único | identificado por e-mail; CPF como reforço quando disponível |
| Venda | cada item aprovado no gateway (front, bump e upsell contam separados) |
| Transação | grupo de compras do mesmo cliente em até 5 minutos, contados a partir da primeira compra do grupo |
| Ticket médio | soma dos valores das vendas ÷ número de transações |
| Recompra | qualquer compra feita mais de 5 minutos depois da primeira compra da transação anterior do cliente |
| Cliente recorrente | cliente com 2 ou mais transações |
| Taxa de recompra | clientes recorrentes ÷ clientes únicos |
| Taxa de reembolso | reembolsos ÷ vendas aprovadas, em quantidade e em valor |

Exemplo: compras às 10h00, 10h03 e 10h07 geram duas transações. A primeira junta 10h00 e 10h03; a de 10h07 é uma recompra.

A janela de 5 minutos é padrão, mas configurável. Risco a acompanhar: um cliente que leva mais de 5 minutos para aceitar o upsell vira recompra e infla essa métrica.

### Recompra dos front-ends (métrica essencial)

- **% dos compradores de front-end que voltaram a comprar**, no geral e por funil de front-end.
- **Para onde subiram:** quantos compraram outro front-end, Back-end ou High-end depois. Mostra se o front-end funciona como porta de entrada.
- **Tempo até a recompra:** mediana de dias entre a primeira transação e a recompra.
- A recompra é sempre atribuída ao funil da **primeira** transação do cliente, para medir o valor gerado por cada porta de entrada.

### Reembolso

- Taxa geral, por categoria, por funil e por produto.
- Separação entre reembolso e chargeback.
- Lista dos produtos com maior taxa de reembolso no período, para agir rápido.

## Etapas do funil

Cada funil mostra suas etapas como um funil visual, com o número absoluto de cada etapa e a taxa de conversão para a próxima. As etapas dependem da categoria.

### Front-end e Back-end (venda direta)

| # | Etapa | Fonte | Taxa exibida |
| --- | --- | --- | --- |
| 1 | Impressões | Meta | — |
| 2 | Cliques no link | Meta | CTR |
| 3 | Visualizações da página | Meta (pixel) | connect rate |
| 4 | Início de checkout | Meta (pixel) | conversão da página |
| 5 | Compras | Greenn | conversão do checkout |
| 6 | Order bump | Greenn | take rate do bump (sobre compras) |
| 7 | Upsell | Greenn | take rate do upsell (sobre compras) |

As etapas 3 e 4 vêm do pixel reportado pelo Meta e servem para enxergar o caminho. A etapa de compras sempre vem do gateway.

### Lançamentos (dentro do Back-end)

Impressões → Cliques → Leads → Compras, com custo por lead e conversão de lead em compra, no período do lançamento.

### High-end e eventos com closer

Impressões → Cliques → Leads → Agendamentos → Comparecimentos → Vendas

Sem CRM conectado, o funil mostra apenas as etapas de tráfego e as vendas da Greenn. As etapas comerciais aparecem quando o CRM for conectado. **Não há lançamento manual.**

### Iscas gratuitas

Impressões → Cliques → Visualizações da página → Leads, com custo por lead. A conversão de lead em cliente depende da lista de e-mails dos leads e fica para quando houver CRM ou ferramenta de e-mail conectada.

## Telas

São sete telas. A Home concentra o essencial; as demais aprofundam. Todas têm o mesmo seletor de período e o mesmo filtro (Negócio / Categoria / Funil) no topo, junto com o horário da última atualização e o botão "Atualizar agora".

### 1. Home (visão geral do negócio)

- **Cards principais**, cada um com a variação contra o período anterior: Investimento, Faturamento bruto, Receita líquida, Lucro, ROAS, ROI, Transações, Ticket médio, CAC.
- **Gráfico de pizza "Para onde foi o dinheiro":** o faturamento bruto dividido em Investimento (com 12,15%), Parceiros, Taxas do gateway, Impostos, Reembolsos e Lucro. Se o período der prejuízo, a pizza é trocada por barras empilhadas com o prejuízo em destaque.
- **Gráfico de linha:** investimento × faturamento × lucro por dia.
- **Tabela por categoria e funil:** investimento, faturamento, lucro, ROAS e ROI de cada um, com o semáforo nos funis de front-end.
- **Alertas:** campanhas e ofertas não vinculadas, com o valor envolvido.

### Semáforo (só Front-end)

- Calculado sobre **ontem e anteontem**, independentemente do período selecionado.
- Baseado no ROI: **verde** acima da meta do funil, **amarelo** entre 0% e a meta, **vermelho** abaixo de 0%.
- A meta de ROI é definida por funil (padrão sugerido: 20%).

### 2. Funis

- Lista de funis agrupada por categoria, com as métricas principais.
- Ao abrir um funil: cards do funil, funil visual de etapas com taxas, desempenho por oferta (front, bumps, upsell) e campanhas vinculadas.

### 3. Tráfego

CPM, CTR, CPC, custo por visualização de página, connect rate e custo por lead, por campanha, conjunto e anúncio, com os criativos que mais trouxeram vendas reais (por UTM, quando disponível).

### 4. Vendas

Vendas por oferta e produto, reembolsos e chargebacks, meios de pagamento, parcelamento e valores pagos a cada parceiro.

### 5. Clientes

Clientes únicos, transações, ticket médio, taxa de recompra, recompra dos front-ends com o destino da ascensão e tempo até a recompra.

### 6. Comercial

Reservada para o CRM: leads, agendamentos, comparecimentos e vendas por closer. Fica oculta até haver um CRM conectado.

### 7. Configurações

- Integrações (Meta, Greenn e futuras)
- Categorias e funis
- Produtos (alíquota e base do imposto) e ofertas
- Vínculo de campanhas aos funis
- Taxa sobre anúncios (padrão 12,15%), metas do semáforo, janela de transação (padrão 5 minutos)
- Usuários da empresa

## Modelo de dados no Supabase

Todas as tabelas de negócio têm `organizacao_id`, e o Row Level Security garante que cada empresa só veja os próprios dados. Os nomes abaixo são a proposta inicial; o Claude Code detalha tipos e índices na construção.

### Organização e acesso

| Tabela | Campos principais |
| --- | --- |
| `organizacoes` | nome, taxa\_anuncios (padrão 0,1215), janela\_transacao\_min (padrão 5), fuso horário, moeda |
| `membros` | usuário (Supabase Auth), organização, papel (diretor) |
| `integracoes` | tipo (meta, greenn, crm…), status, credenciais (criptografadas no Vault), última sincronização |

### Estrutura

| Tabela | Campos principais |
| --- | --- |
| `categorias` | nome, ordem, tem\_semaforo |
| `funis` | categoria, nome, tipo (venda direta, lançamento, closer, isca), data início/fim (lançamentos), meta\_roi |
| `produtos` | id externo, nome, aliquota\_imposto, base\_imposto (bruto ou líquido) |
| `ofertas` | id externo, produto, nome, preço |
| `funil_ofertas` | funil, oferta (única), papel (front, bump, upsell, downsell), sugerido/confirmado |

### Tráfego

| Tabela | Campos principais |
| --- | --- |
| `contas_anuncio` | plataforma, id externo, nome |
| `campanhas` | conta, id externo, nome, status |
| `funil_campanhas` | funil, campanha (única) |
| `metricas_anuncio_diarias` | data, campanha, conjunto, anúncio, gasto, impressões, cliques no link, visualizações de página, inícios de checkout, leads |

### Vendas e clientes

| Tabela | Campos principais |
| --- | --- |
| `clientes` | e-mail, CPF, nome, primeira compra, funil de entrada |
| `vendas` | id externo, cliente, oferta, valor bruto, taxa do gateway, status (aprovada, reembolsada, chargeback), data da venda, data do reembolso, meio de pagamento, parcelas, UTMs |
| `comissoes` | venda, parceiro, tipo (afiliado, coprodutor…), valor |
| `transacoes` | cliente, início, vendas agrupadas, é\_recompra (calculada pela janela de 5 minutos) |

### Apoio

| Tabela | Campos principais |
| --- | --- |
| `historico_aliquotas` | produto, alíquota, base, vigência |
| `sincronizacoes` | ciclo, integração, horário de corte, origem (login, botão ou agendado), início, fim, registros, erros |

Os indicadores da Home vêm de **visões agregadas por dia e por funil**, atualizadas após cada sincronização, para a tela abrir rápido mesmo com muitos dados.

## Arquitetura técnica e segurança

O painel nunca consulta as plataformas diretamente: os conectores gravam tudo no Supabase, e o app lê só de lá.

&#91;embedded content: fluxo de dados · 3 fontes, conectores, Supabase, app\]

O CRM entra tracejado porque será conectado depois, pelo mesmo caminho.

### Stack sugerida

- **Banco, login e segurança:** Supabase (Postgres, Auth, Row Level Security, Vault).
- **Rotinas de sincronização:** Supabase Edge Functions, agendadas com pg\_cron e acionadas pelo app no login e no botão Atualizar agora.
- **Aplicação web:** Next.js, hospedada na Vercel, com uma biblioteca de gráficos.
- **Código:** repositório no GitHub, com o Claude Code fazendo a construção.

### Multiempresa e segurança

- Cada cliente do SaaS é uma organização isolada por Row Level Security em todas as tabelas.
- Tokens do Meta e da Greenn ficam criptografados no Vault e nunca aparecem no navegador.
- As integrações pedem só permissão de leitura (no Meta, leitura de anúncios).
- Toda sincronização gera registro de início, fim, quantidade e erros, para auditoria.
- **LGPD:** o sistema guarda e-mail e CPF de compradores. Antes do lançamento do SaaS, é preciso termos de uso, política de privacidade e contrato de tratamento de dados com os clientes.
- **Meta para SaaS:** para uso próprio, basta um token do Business Manager. Para clientes externos, é preciso um app do Meta aprovado na revisão de apps, com verificação de empresa. Esse processo leva semanas e deve começar antes do lançamento.

## Fases de construção

A construção vai em sete fases. Cada fase termina com algo que funciona e pode ser conferido antes de seguir.

1. **Fundação:** projeto no Supabase, tabelas, login, organização, Row Level Security e telas de configuração de categorias, funis, produtos (alíquota e base), ofertas e taxa sobre anúncios.
   - Pronto quando: dá para cadastrar a estrutura completa do seu negócio.
2. **Conector Greenn:** importação retroativa, busca de vendas a cada 15 minutos, reconsulta diária, cálculo de transações e recompra pela janela de 5 minutos, sugestão automática de bumps e upsells.
   - Pronto quando: o faturamento de um mês bate com o relatório da Greenn.
3. **Conector Meta:** contas, campanhas e métricas diárias, tela de vínculo de campanhas aos funis, alerta de não vinculadas, ciclo de atualização unificado (agendado, ao entrar e pelo botão).
   - Pronto quando: o gasto de um mês bate com o gerenciador.
4. **Home e Funis:** cards, pizza, linha do tempo, tabela por categoria e funil, semáforo dos front-ends, etapas do funil com taxas.
   - Pronto quando: os diretores conseguem tomar uma decisão só olhando a Home.
5. **Abas secundárias:** Tráfego, Vendas e Clientes.
6. **Uso interno:** 2 a 4 semanas usando no seu negócio, conferindo números e ajustando regras (janela de 5 minutos, metas do semáforo, alíquotas).
7. **Preparação para SaaS:** cadastro e onboarding self-service, app do Meta aprovado, cobrança dos assinantes, termos e LGPD, webhook da Greenn.

Depois do lançamento: conector de CRM e aba Comercial, novos gerenciadores e gateways.

### Pendências

- [ ] Confirmar na documentação da Greenn que a API entrega, por venda: ID da oferta, taxa do gateway, comissões de cada parceiro e data de reembolso
- [ ] Confirmar os limites de chamadas da API da Greenn para definir o intervalo de busca
- [ ] Escolher o CRM e verificar se ele tem API
- [ ] Definir o nome do produto SaaS e o modelo de cobrança
- [ ] Iniciar o processo de verificação de empresa no Meta antes da fase 7
