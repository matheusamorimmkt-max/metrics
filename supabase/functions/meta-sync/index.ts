/**
 * Edge Function meta-sync: importa conta, campanhas e métricas diárias do Meta Ads
 * para o Supabase. Entrada (POST, autenticada com a service role):
 *   { organizacao_id, modo: "retroativa" | "incremental" | "reconsulta", origem, ciclo_id?, corte? }
 *
 * Regras (docs/plano-fase-3.md): um ciclo por integração por vez (índice parcial em
 * sincronizacoes), retroativa fatiada e retomável (cursor), credencial lida do Vault
 * pela RPC ler_credencial_integracao, nunca registrada em log.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ClienteMeta, ErroMeta } from "../_shared/meta/cliente.ts";
import {
  fatiarPeriodo,
  iso,
  somarDias,
  traduzirCampanha,
  traduzirConta,
  traduzirInsight,
} from "../_shared/meta/tradutor.ts";
import type { MetricaDiariaImportada, ModoSincronizacao } from "../_shared/meta/tipos.ts";

const DIAS_RETROATIVA = 365;
const DIAS_RECONSULTA = 7;
const FATIA_DIAS = 30;
/** Quantas fatias por execução, para caber no tempo limite da Edge Function. */
const FATIAS_POR_EXECUCAO = 4;

type Entrada = {
  organizacao_id: string;
  modo: ModoSincronizacao;
  origem: "login" | "botao" | "agendado" | "manual";
  ciclo_id?: string;
  corte?: string;
};

type Cursor = { desde: string; ate: string; proxima_fatia: string | null };

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Só a service role chama o conector. O gateway do Supabase já validou a assinatura
 * do JWT; aqui conferimos o papel. Aceita também a chave injetada no ambiente
 * (formato novo sb_secret_…), que não é JWT.
 */
function autenticado(req: Request): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const credencial = auth.slice(7).trim();
  const chaveAmbiente = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (chaveAmbiente && credencial === chaveAmbiente) return true;
  const partes = credencial.split(".");
  if (partes.length !== 3) return false;
  try {
    const payload = JSON.parse(
      atob(partes[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  if (!autenticado(req)) return json({ erro: "Não autorizado." }, 401);

  let entrada: Entrada;
  try {
    entrada = (await req.json()) as Entrada;
  } catch {
    return json({ erro: "Corpo inválido." }, 400);
  }
  if (!entrada.organizacao_id || !entrada.modo || !entrada.origem) {
    return json({ erro: "Informe organizacao_id, modo e origem." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const resultado = await sincronizar(supabase, entrada);
    return json(resultado, resultado.status === "ocupado" ? 409 : 200);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return json({ status: "falhou", erro: mensagem }, 500);
  }
});

async function sincronizar(supabase: SupabaseClient, entrada: Entrada) {
  const { organizacao_id, modo, origem } = entrada;

  const { data: integracao, error: erroIntegracao } = await supabase
    .from("integracoes")
    .select("id, status, config, ultimo_corte, importacao_inicio, importacao_concluida_em")
    .eq("organizacao_id", organizacao_id)
    .eq("tipo", "meta")
    .maybeSingle();
  if (erroIntegracao) throw new Error(`integracoes: ${erroIntegracao.message}`);
  if (!integracao || integracao.status === "desconectada") {
    return { status: "ignorado", motivo: "Meta não configurado nesta organização." };
  }

  const contaId = (integracao.config as { conta_anuncios_id?: string })?.conta_anuncios_id;
  if (!contaId) {
    await marcarErro(supabase, integracao.id, "Falta o ID da conta de anúncios.");
    return { status: "falhou", erro: "Falta o ID da conta de anúncios." };
  }

  // Lock: um ciclo por integração por vez (índice parcial único).
  const corte = entrada.corte ?? new Date().toISOString();
  const { data: sync, error: erroSync } = await supabase
    .from("sincronizacoes")
    .insert({
      organizacao_id,
      integracao_id: integracao.id,
      ciclo_id: entrada.ciclo_id ?? crypto.randomUUID(),
      modo,
      origem,
      corte,
    })
    .select("id")
    .single();
  if (erroSync) {
    if (erroSync.code === "23505") return { status: "ocupado", motivo: "Já existe um ciclo em andamento." };
    throw new Error(`sincronizacoes: ${erroSync.message}`);
  }

  let registros = 0;
  const detalhes: Record<string, unknown> = {};
  try {
    const { data: token, error: erroToken } = await supabase.rpc("ler_credencial_integracao", {
      p_integracao_id: integracao.id,
    });
    if (erroToken || !token) throw new Error("Credencial do Meta não encontrada no cofre.");

    const meta = new ClienteMeta({ token });

    // 1. Conta
    const conta = traduzirConta(await meta.conta(contaId));
    const { data: contaLinha, error: erroConta } = await supabase
      .from("contas_anuncio")
      .upsert(
        {
          organizacao_id,
          integracao_id: integracao.id,
          plataforma: "meta",
          id_externo: conta.id_externo,
          nome: conta.nome,
          moeda: conta.moeda,
          fuso_horario: conta.fuso_horario,
        },
        { onConflict: "organizacao_id,plataforma,id_externo" },
      )
      .select("id")
      .single();
    if (erroConta) throw new Error(`contas_anuncio: ${erroConta.message}`);

    // 2. Campanhas
    const campanhaIdPorExterno = new Map<string, string>();
    const totalCampanhas = await meta.campanhas(contaId, async (lote) => {
      const linhas = lote.map(traduzirCampanha).map((c) => ({
        organizacao_id,
        conta_anuncio_id: contaLinha.id,
        plataforma: "meta",
        id_externo: c.id_externo,
        nome: c.nome,
        status: c.status,
        objetivo: c.objetivo,
        ativo: c.ativo,
      }));
      const { data, error } = await supabase
        .from("campanhas")
        .upsert(linhas, { onConflict: "organizacao_id,plataforma,id_externo" })
        .select("id, id_externo");
      if (error) throw new Error(`campanhas: ${error.message}`);
      for (const c of data ?? []) campanhaIdPorExterno.set(c.id_externo, c.id);
    });
    detalhes.campanhas = totalCampanhas;

    // 3. Período das métricas
    const hoje = iso(new Date());
    let periodos: { desde: string; ate: string }[];
    let cursorFinal: Cursor | null = null;

    if (modo === "retroativa") {
      const { data: anterior } = await supabase
        .from("sincronizacoes")
        .select("cursor")
        .eq("integracao_id", integracao.id)
        .eq("modo", "retroativa")
        .not("cursor", "is", null)
        .order("inicio", { ascending: false })
        .limit(1)
        .maybeSingle();
      const cursorAnterior = (anterior?.cursor as Cursor | null) ?? null;
      const desde =
        cursorAnterior?.proxima_fatia ??
        integracao.importacao_inicio ??
        somarDias(hoje, -DIAS_RETROATIVA);
      const todas = fatiarPeriodo(desde, hoje, FATIA_DIAS);
      periodos = todas.slice(0, FATIAS_POR_EXECUCAO);
      const restante = todas.slice(FATIAS_POR_EXECUCAO);
      cursorFinal = {
        desde,
        ate: hoje,
        proxima_fatia: restante.length ? restante[0].desde : null,
      };
    } else if (modo === "reconsulta") {
      periodos = [{ desde: somarDias(hoje, -DIAS_RECONSULTA), ate: hoje }];
    } else {
      const base = integracao.ultimo_corte ? iso(new Date(integracao.ultimo_corte)) : somarDias(hoje, -DIAS_RECONSULTA);
      periodos = [{ desde: somarDias(base, -1), ate: hoje }];
    }

    // 4. Métricas por anúncio e dia
    for (const periodo of periodos) {
      registros += await meta.insights(contaId, periodo.desde, periodo.ate, async (lote) => {
        const linhas: Record<string, unknown>[] = [];
        for (const insight of lote) {
          const m = traduzirInsight(insight);
          if (!m) continue;
          let campanhaId = campanhaIdPorExterno.get(m.campanha_id_externo);
          if (!campanhaId) {
            // Campanha que a listagem não trouxe (ex.: apagada): cria pelo insight.
            const { data, error } = await supabase
              .from("campanhas")
              .upsert(
                {
                  organizacao_id,
                  conta_anuncio_id: contaLinha.id,
                  plataforma: "meta",
                  id_externo: m.campanha_id_externo,
                  nome: m.campanha_nome,
                  ativo: false,
                },
                { onConflict: "organizacao_id,plataforma,id_externo" },
              )
              .select("id")
              .single();
            if (error) throw new Error(`campanhas (insight): ${error.message}`);
            campanhaId = data.id;
            campanhaIdPorExterno.set(m.campanha_id_externo, campanhaId);
          }
          linhas.push(linhaMetrica(organizacao_id, campanhaId, m));
        }
        if (linhas.length) {
          const { error } = await supabase
            .from("metricas_anuncio_diarias")
            .upsert(linhas, { onConflict: "campanha_id,data,conjunto_id_externo,anuncio_id_externo" });
          if (error) throw new Error(`metricas_anuncio_diarias: ${error.message}`);
        }
      });
    }
    detalhes.periodos = periodos;

    // 5. Fecha o ciclo
    const concluiuRetroativa = modo === "retroativa" && cursorFinal?.proxima_fatia === null;
    const atualizacao: Record<string, unknown> = {
      status: "conectada",
      erro: null,
      ultima_sincronizacao: new Date().toISOString(),
    };
    if (modo !== "retroativa") atualizacao.ultimo_corte = corte;
    if (concluiuRetroativa) atualizacao.importacao_concluida_em = new Date().toISOString();
    await supabase.from("integracoes").update(atualizacao).eq("id", integracao.id);

    await supabase
      .from("sincronizacoes")
      .update({ status: "concluida", fim: new Date().toISOString(), registros, cursor: cursorFinal, detalhes })
      .eq("id", sync.id);

    return {
      status: "concluida",
      registros,
      campanhas: totalCampanhas,
      retroativa_pendente: modo === "retroativa" && !concluiuRetroativa,
    };
  } catch (erro) {
    const mensagem = erro instanceof ErroMeta
      ? (erro.credencialInvalida ? `Token recusado pelo Meta: ${erro.message}` : `Meta: ${erro.message}`)
      : erro instanceof Error ? erro.message : String(erro);
    await supabase
      .from("sincronizacoes")
      .update({ status: "falhou", fim: new Date().toISOString(), registros, erro: mensagem, detalhes })
      .eq("id", sync.id);
    await marcarErro(supabase, integracao.id, mensagem);
    return { status: "falhou", erro: mensagem };
  }
}

function linhaMetrica(organizacao_id: string, campanha_id: string, m: MetricaDiariaImportada) {
  return {
    organizacao_id,
    campanha_id,
    conjunto_id_externo: m.conjunto_id_externo,
    conjunto_nome: m.conjunto_nome,
    anuncio_id_externo: m.anuncio_id_externo,
    anuncio_nome: m.anuncio_nome,
    data: m.data,
    gasto: m.gasto,
    impressoes: m.impressoes,
    alcance: m.alcance,
    cliques: m.cliques,
    cliques_link: m.cliques_link,
    visualizacoes_pagina: m.visualizacoes_pagina,
    inicios_checkout: m.inicios_checkout,
    leads: m.leads,
    compras_plataforma: m.compras_plataforma,
    dados_brutos: m.dados_brutos,
  };
}

async function marcarErro(supabase: SupabaseClient, integracaoId: string, mensagem: string) {
  await supabase
    .from("integracoes")
    .update({ status: "erro", erro: mensagem.slice(0, 500) })
    .eq("id", integracaoId);
}
