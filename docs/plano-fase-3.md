# Plano da Fase 3 — Conector Meta Ads

Status: **Etapas 1 a 3 implementadas e publicadas em 2026-10-12; Edge Function `meta-sync` no ar; falta aplicar as migrations 2 e 3 no projeto, conectar o token do Meta e conferir o gasto (Etapa 5). Agendamento pg_cron (Etapa 4) pendente.**

Fase anterior: `docs/plano-fase-2.md`. PRD: seções "Integrações", "Ciclo de atualização", "Vínculo de campanhas aos funis" e tabela "Tráfego".

## Objetivo

Trazer do Meta Ads, por campanha, conjunto, anúncio e dia: gasto, impressões, alcance, cliques, cliques no link, visualizações de página, inícios de checkout e leads. Vincular campanhas aos funis. Rodar o ciclo de atualização (ao entrar, pelo botão "Atualizar agora" e a cada 15 minutos) e a reconsulta diária dos últimos 7 dias.

**Pronto quando:** o gasto de um mês fechado, por campanha e no total, bate com o Gerenciador de Anúncios; cada campanha com gasto está em um funil ou aparece em "campanhas não vinculadas"; a Home mostra o investimento.

## Decisões

| #   | Tema                    | Decisão                                                                                                                                                                                                                                                                                                                                                    |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Credencial              | Token de **usuário do sistema** do Business Manager com permissão `ads_read`, colado na tela de Integrações (já existe), mais o ID da conta de anúncios (`act_…`). Guardado no Vault. App do Meta com revisão fica para a Fase 7 (SaaS).                                                                                                                   |
| 2   | Granularidade           | Insights no nível **anúncio** por dia (`level=ad`, `time_increment=1`). Campanha e conjunto são somas. Reach não é somável e fica só no nível em que veio.                                                                                                                                                                                                 |
| 3   | Ações do pixel          | `actions[]` do Meta mapeadas assim: `link_click` → cliques_link; `landing_page_view` → visualizacoes_pagina; `initiate_checkout` (e `omni_initiated_checkout`) → inicios_checkout; `lead` (e `onsite_conversion.lead_grouped`) → leads; `purchase`/`omni_purchase` → compras_plataforma (nunca métrica principal, princípio 1).                            |
| 4   | Janela de atribuição    | Padrão da conta (não enviamos `action_attribution_windows`). Quem quiser outra, muda na conta de anúncios.                                                                                                                                                                                                                                                 |
| 5   | Histórico               | Na primeira conexão, importa os últimos **365 dias**, em fatias de 30 dias, retomável (cursor em `sincronizacoes.cursor`). Depois, incremental: do último corte menos 1 dia até hoje. Reconsulta diária: últimos 7 dias (o Meta revisa números recentes).                                                                                                  |
| 6   | Idempotência            | Upsert por `(campanha_id, data, conjunto_id_externo, anuncio_id_externo)`; `''` quando o nível não se aplica. Dias reimportados substituem os valores.                                                                                                                                                                                                     |
| 7   | Moeda e fuso            | Guardados em `contas_anuncio` (vêm da API). Conta em moeda diferente da organização entra no banco mas fica fora dos totais, com aviso (mesma regra da Greenn).                                                                                                                                                                                            |
| 8   | Vínculo                 | Por campanha (`funil_campanhas`, campanha única). Tela Configurações → Campanhas: lista com gasto dos últimos 30 dias e seletor de funil; "não vinculadas" em destaque. Regras por nome ficam para depois.                                                                                                                                                 |
| 9   | Limites da API          | Resposta `429` ou erro com `code` 4/17/32/613 → espera com backoff (até 5 tentativas, 2^n segundos, teto 60 s). Paginação por `paging.next`. Nunca em paralelo.                                                                                                                                                                                            |
| 10  | Versão da Graph API     | Constante única em `supabase/functions/_shared/meta/cliente.ts` (`v23.0`). Trocar ali quando o Meta descontinuar.                                                                                                                                                                                                                                          |
| 11  | Ciclo                   | A Edge Function `meta-sync` recebe `{ organizacao_id, modo, origem, ciclo_id?, corte? }` autenticada com a service role. O app dispara pelo botão "Atualizar agora" (Server Action com o cliente admin) e no login quando a última sincronização tem mais de 15 min. O pg_cron a cada 15 min entra na Etapa 4, via `pg_net`, com a URL e a chave no Vault. |
| 12  | Validação da credencial | O primeiro ciclo valida: token recusado → `integracoes.status = 'erro'` com a mensagem do Meta; sucesso → `conectada`. É o "Testar conexão" sem chamada direta do app à plataforma (princípio 5).                                                                                                                                                          |

## Etapas

### Etapa 1 — Schema

`20261012000003_fase3_trafego.sql`: `contas_anuncio`, `campanhas`, `funil_campanhas`, `metricas_anuncio_diarias`, view `campanhas_resumo` (gasto 30 dias, gasto total, última data, funil). RLS: membro lê; conector escreve; membro gerencia `funil_campanhas`. Testes pgTAP.

### Etapa 2 — Conector

`supabase/functions/_shared/meta/` (`tipos.ts`, `cliente.ts`, `tradutor.ts`, sem Deno, testados no Vitest) e `supabase/functions/meta-sync/index.ts` (entrada HTTP, lock em `sincronizacoes`, cursor, gravação).

### Etapa 3 — Telas

- Configurações → Campanhas: vínculo campanha → funil, "não vinculadas" com gasto.
- Cabeçalho: "Atualizado às 14h32" e botão "Atualizar agora" (bloqueado durante um ciclo e por 1 min depois).
- Integrações: último erro e última sincronização já aparecem no cartão.

### Etapa 4 — Agendamento

pg_cron a cada 15 min e reconsulta diária, via `pg_net`, para toda organização com Meta configurado. Configuração única pelo SQL Editor (`configurar_agendamento(url, chave)`).

### Etapa 5 — Conferência

Gasto de um mês fechado comparado com o Gerenciador de Anúncios, por campanha.

## Modelo de dados

| Tabela                     | Colunas além das convenções                                                                                                                                                                                                                                                                                                     | Restrições e índices                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `contas_anuncio`           | `integracao_id → integracoes`, `plataforma`, `id_externo` (`act_…`), `nome`, `moeda char(3)`, `fuso_horario`, `ativo`                                                                                                                                                                                                           | único `(organizacao_id, plataforma, id_externo)`                                                                              |
| `campanhas`                | `conta_anuncio_id → contas_anuncio`, `plataforma`, `id_externo`, `nome`, `status`, `objetivo`, `ativo`                                                                                                                                                                                                                          | único `(organizacao_id, plataforma, id_externo)`; índice em `conta_anuncio_id`                                                |
| `funil_campanhas`          | `funil_id → funis`, `campanha_id → campanhas`                                                                                                                                                                                                                                                                                   | **único `campanha_id`**; índice em `funil_id`                                                                                 |
| `metricas_anuncio_diarias` | `campanha_id → campanhas`, `conjunto_id_externo` (`''` se não se aplica), `conjunto_nome`, `anuncio_id_externo` (`''`), `anuncio_nome`, `data date`, `gasto numeric(14,2)`, `impressoes`, `alcance`, `cliques`, `cliques_link`, `visualizacoes_pagina`, `inicios_checkout`, `leads`, `compras_plataforma`, `dados_brutos jsonb` | único `(campanha_id, data, conjunto_id_externo, anuncio_id_externo)`; índices `(organizacao_id, data)`, `(campanha_id, data)` |
