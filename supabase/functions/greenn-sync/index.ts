/**
 * Edge Function greenn-sync: importa produtos, ofertas, vendas e clientes da Greenn.
 * Entrada (POST, autenticada com a service role):
 *   { organizacao_id, modo: "retroativa" | "incremental" | "reconsulta", origem, ciclo_id?, corte? }
 *
 * Regras (docs/plano-fase-2.md): um ciclo por integração por vez; retroativa fatiada e
 * retomável (cursor = página da lista de vendas); incremental = vendas pagas desde o
 * último corte menos 1 dia; reconsulta = últimos 60 dias (pagas e reembolsadas).
 * Ao final: recalcular_transacoes dos clientes afetados e sugerir_ofertas.
 * A credencial é lida do Vault pela RPC ler_credencial_integracao e nunca vai para log.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ClienteGreenn, ErroGreenn } from "../_shared/greenn/cliente.ts";
import {
  DETALHE_TRAZ_TAXA,
  diaIso,
  somarDias,
  traduzirOferta,
  traduzirProduto,
  traduzirVenda,
  type OfertaGreenn,
  type ProdutoGreenn,
  type VendaGreenn,
} from "../_shared/greenn/tradutor.ts";
import type { ModoSincronizacao, VendaImportada } from "../_shared/greenn/tipos.ts";

const PLATAFORMA = "greenn";
const DIAS_RECONSULTA = 60;
/** Orçamento de tempo por execução; o resto fica para a próxima (cursor). */
const ORCAMENTO_MS = 100_000;

type Entrada = {
  organizacao_id: string;
  modo: ModoSincronizacao;
  origem: "login" | "botao" | "agendado" | "manual";
  ciclo_id?: string;
  corte?: string;
};

type Cursor = { pagina: number; paid_after: string | null };

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function autenticado(req: Request): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const credencial = auth.slice(7).trim();
  const chaveAmbiente = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (chaveAmbiente && credencial === chaveAmbiente) return true;
  const partes = credencial.split(".");
  if (partes.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(partes[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      role?: string;
    };
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
    return json(
      { status: "falhou", erro: erro instanceof Error ? erro.message : String(erro) },
      500,
    );
  }
});

async function sincronizar(supabase: SupabaseClient, entrada: Entrada) {
  const { organizacao_id, modo, origem } = entrada;
  const inicioExecucao = Date.now();

  const { data: integracao, error: erroIntegracao } = await supabase
    .from("integracoes")
    .select("id, status, ultimo_corte, importacao_inicio, importacao_concluida_em")
    .eq("organizacao_id", organizacao_id)
    .eq("tipo", PLATAFORMA)
    .maybeSingle();
  if (erroIntegracao) throw new Error(`integracoes: ${erroIntegracao.message}`);
  if (!integracao || integracao.status === "desconectada") {
    return { status: "ignorado", motivo: "Greenn não configurada nesta organização." };
  }

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
    if (erroSync.code === "23505")
      return { status: "ocupado", motivo: "Já existe um ciclo em andamento." };
    throw new Error(`sincronizacoes: ${erroSync.message}`);
  }

  let registros = 0;
  const detalhes: Record<string, unknown> = {};
  const clientesAfetados = new Set<string>();

  try {
    const { data: token, error: erroToken } = await supabase.rpc(
      "ler_credencial_integracao",
      {
        p_integracao_id: integracao.id,
      },
    );
    if (erroToken || !token)
      throw new Error("Credencial da Greenn não encontrada no cofre.");
    const greenn = new ClienteGreenn({ token });

    // 1. Produtos
    const produtoIdPorExterno = new Map<string, string>();
    await greenn.produtos<ProdutoGreenn>(async (lote) => {
      const linhas = lote.map(traduzirProduto).map((p) => ({
        organizacao_id,
        plataforma: PLATAFORMA,
        id_externo: p.id_externo,
        nome: p.nome,
        ativo: p.ativo,
      }));
      if (!linhas.length) return;
      const { data, error } = await supabase
        .from("produtos")
        .upsert(linhas, {
          onConflict: "organizacao_id,plataforma,id_externo",
          ignoreDuplicates: false,
        })
        .select("id, id_externo");
      if (error) throw new Error(`produtos: ${error.message}`);
      for (const p of data ?? []) produtoIdPorExterno.set(p.id_externo, p.id);
    });
    detalhes.produtos = produtoIdPorExterno.size;

    // 2. Ofertas
    const ofertaIdPorExterno = new Map<string, { id: string; produto_id: string }>();
    await greenn.ofertas<OfertaGreenn>(async (lote) => {
      const linhas = [];
      for (const bruta of lote) {
        const o = traduzirOferta(bruta);
        if (!o) continue;
        const produtoId = produtoIdPorExterno.get(o.produto_id_externo);
        if (!produtoId) continue;
        linhas.push({
          organizacao_id,
          plataforma: PLATAFORMA,
          id_externo: o.id_externo,
          produto_id: produtoId,
          nome: o.nome,
          preco: o.preco,
          ativo: o.ativo,
        });
      }
      if (!linhas.length) return;
      const { data, error } = await supabase
        .from("ofertas")
        .upsert(linhas, { onConflict: "organizacao_id,plataforma,id_externo" })
        .select("id, id_externo, produto_id");
      if (error) throw new Error(`ofertas: ${error.message}`);
      for (const o of data ?? [])
        ofertaIdPorExterno.set(o.id_externo, { id: o.id, produto_id: o.produto_id });
    });
    detalhes.ofertas = ofertaIdPorExterno.size;

    // 3. Período e cursor das vendas
    const hoje = diaIso(new Date());
    let cursor: Cursor = { pagina: 1, paid_after: null };
    const filtrosLista: Record<string, string>[] = [];

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
      cursor = cursorAnterior ?? {
        pagina: 1,
        paid_after: integracao.importacao_inicio ?? null,
      };
      filtrosLista.push(cursor.paid_after ? { paid_after: cursor.paid_after } : {});
    } else if (modo === "reconsulta") {
      const desde = somarDias(hoje, -DIAS_RECONSULTA);
      filtrosLista.push({ paid_after: desde });
      filtrosLista.push({ refunded_after: desde });
    } else {
      const base = integracao.ultimo_corte
        ? diaIso(integracao.ultimo_corte)
        : somarDias(hoje, -7);
      filtrosLista.push({ paid_after: somarDias(base, -1) });
    }

    // Clientes já conhecidos (evita o detalhe da venda quando não traz nada novo)
    const clienteIdPorExterno = new Map<string, string>();
    const clienteIdPorEmail = new Map<string, string>();
    {
      const { data } = await supabase
        .from("clientes")
        .select("id, email, id_externo")
        .eq("organizacao_id", organizacao_id)
        .limit(50_000);
      for (const c of data ?? []) {
        clienteIdPorEmail.set(c.email, c.id);
        if (c.id_externo) clienteIdPorExterno.set(c.id_externo, c.id);
      }
    }

    // 4. Vendas
    let proximaPagina: number | null = null;
    let semDetalhe = 0;
    for (const filtros of filtrosLista) {
      const paginaInicial = modo === "retroativa" ? cursor.pagina : 1;
      proximaPagina = await greenn.vendas<VendaGreenn>(
        filtros,
        async (lote) => {
          for (const item of lote) {
            // Detalhe só quando faz falta: cliente desconhecido, taxa no detalhe, ou sem oferta.
            const clienteConhecido =
              item.client_id !== undefined &&
              item.client_id !== null &&
              clienteIdPorExterno.has(String(item.client_id));
            let completa: VendaGreenn = item;
            if (!clienteConhecido || DETALHE_TRAZ_TAXA) {
              try {
                const detalhe = await greenn.venda<VendaGreenn | { data?: VendaGreenn }>(
                  item.id,
                );
                completa = {
                  ...item,
                  ...("data" in detalhe && detalhe.data
                    ? detalhe.data
                    : (detalhe as VendaGreenn)),
                };
              } catch (erro) {
                if (erro instanceof ErroGreenn && erro.credencialInvalida) throw erro;
                semDetalhe += 1;
              }
            }
            const v = traduzirVenda(completa);
            if (!v) continue;
            const gravou = await gravarVenda(supabase, organizacao_id, v, {
              produtoIdPorExterno,
              ofertaIdPorExterno,
              clienteIdPorExterno,
              clienteIdPorEmail,
            });
            if (gravou) {
              registros += 1;
              clientesAfetados.add(gravou);
            }
          }
          // Orçamento de tempo: na retroativa, para e guarda o cursor.
          return !(modo === "retroativa" && Date.now() - inicioExecucao > ORCAMENTO_MS);
        },
        paginaInicial,
      );
    }
    detalhes.sem_detalhe = semDetalhe;
    detalhes.chamadas_api = greenn.chamadas;

    // 5. Transações e sugestões
    if (clientesAfetados.size) {
      const { error } = await supabase.rpc("recalcular_transacoes", {
        p_organizacao_id: organizacao_id,
        p_cliente_ids: [...clientesAfetados],
      });
      if (error) throw new Error(`recalcular_transacoes: ${error.message}`);
      const { error: erroSug } = await supabase.rpc("sugerir_ofertas", {
        p_organizacao_id: organizacao_id,
      });
      if (erroSug) throw new Error(`sugerir_ofertas: ${erroSug.message}`);
    }

    // 6. Fecha o ciclo
    const retroativaPendente = modo === "retroativa" && proximaPagina !== null;
    const cursorFinal: Cursor | null = retroativaPendente
      ? { pagina: proximaPagina!, paid_after: cursor.paid_after }
      : null;
    const atualizacao: Record<string, unknown> = {
      status: "conectada",
      erro: null,
      ultima_sincronizacao: new Date().toISOString(),
    };
    if (modo !== "retroativa") atualizacao.ultimo_corte = corte;
    if (modo === "retroativa" && !retroativaPendente) {
      atualizacao.importacao_concluida_em = new Date().toISOString();
      atualizacao.ultimo_corte = corte;
    }
    await supabase.from("integracoes").update(atualizacao).eq("id", integracao.id);
    await supabase
      .from("sincronizacoes")
      .update({
        status: "concluida",
        fim: new Date().toISOString(),
        registros,
        cursor: cursorFinal,
        detalhes,
      })
      .eq("id", sync.id);

    return {
      status: "concluida",
      registros,
      retroativa_pendente: retroativaPendente,
      detalhes,
    };
  } catch (erro) {
    const mensagem =
      erro instanceof ErroGreenn
        ? erro.credencialInvalida
          ? `Token recusado pela Greenn: ${erro.message}`
          : `Greenn: ${erro.message}`
        : erro instanceof Error
          ? erro.message
          : String(erro);
    await supabase
      .from("sincronizacoes")
      .update({
        status: "falhou",
        fim: new Date().toISOString(),
        registros,
        erro: mensagem,
        detalhes,
      })
      .eq("id", sync.id);
    await supabase
      .from("integracoes")
      .update({ status: "erro", erro: mensagem.slice(0, 500) })
      .eq("id", integracao.id);
    return { status: "falhou", erro: mensagem };
  }
}

type Mapas = {
  produtoIdPorExterno: Map<string, string>;
  ofertaIdPorExterno: Map<string, { id: string; produto_id: string }>;
  clienteIdPorExterno: Map<string, string>;
  clienteIdPorEmail: Map<string, string>;
};

/** Grava cliente, venda e comissões. Devolve o id do cliente afetado, ou null se a venda foi pulada. */
async function gravarVenda(
  supabase: SupabaseClient,
  organizacao_id: string,
  v: VendaImportada,
  mapas: Mapas,
): Promise<string | null> {
  // Cliente: por e-mail (chave de identidade); sem e-mail não há como unir compras.
  let clienteId: string | undefined;
  if (v.cliente.email) {
    clienteId = mapas.clienteIdPorEmail.get(v.cliente.email);
    if (!clienteId) {
      const { data, error } = await supabase
        .from("clientes")
        .upsert(
          {
            organizacao_id,
            email: v.cliente.email,
            nome: v.cliente.nome,
            cpf: v.cliente.cpf,
            telefone: v.cliente.telefone,
            plataforma: PLATAFORMA,
            id_externo: v.cliente.id_externo,
          },
          { onConflict: "organizacao_id,email" },
        )
        .select("id")
        .single();
      if (error) throw new Error(`clientes: ${error.message}`);
      clienteId = data.id;
      mapas.clienteIdPorEmail.set(v.cliente.email, clienteId!);
    }
    if (v.cliente.id_externo)
      mapas.clienteIdPorExterno.set(v.cliente.id_externo, clienteId!);
  } else if (v.cliente.id_externo) {
    clienteId = mapas.clienteIdPorExterno.get(v.cliente.id_externo);
  }
  if (!clienteId) return null;

  // Oferta: a da venda; sem offer_id, oferta sintética por produto (decisão 6).
  let oferta = v.oferta_id_externo
    ? mapas.ofertaIdPorExterno.get(v.oferta_id_externo)
    : undefined;
  if (!oferta) {
    if (!v.produto_id_externo) return null;
    const produtoId = mapas.produtoIdPorExterno.get(v.produto_id_externo);
    if (!produtoId) return null;
    const idExterno = v.oferta_id_externo ?? `produto:${v.produto_id_externo}`;
    const { data, error } = await supabase
      .from("ofertas")
      .upsert(
        {
          organizacao_id,
          plataforma: PLATAFORMA,
          id_externo: idExterno,
          produto_id: produtoId,
          nome: v.oferta_id_externo ? `Oferta ${v.oferta_id_externo}` : "Sem oferta",
          preco: v.valor_bruto,
          ativo: false,
        },
        { onConflict: "organizacao_id,plataforma,id_externo", ignoreDuplicates: false },
      )
      .select("id, produto_id")
      .single();
    if (error) throw new Error(`ofertas (sintética): ${error.message}`);
    oferta = { id: data.id, produto_id: data.produto_id };
    mapas.ofertaIdPorExterno.set(idExterno, oferta);
  }

  const { data: venda, error } = await supabase
    .from("vendas")
    .upsert(
      {
        organizacao_id,
        plataforma: PLATAFORMA,
        id_externo: v.id_externo,
        cliente_id: clienteId,
        oferta_id: oferta.id,
        produto_id: oferta.produto_id,
        status: v.status,
        status_externo: v.status_externo,
        reembolso_pendente: v.reembolso_pendente,
        origem: v.origem,
        assinatura_id_externo: v.assinatura_id_externo,
        valor_bruto: v.valor_bruto,
        taxa_gateway: v.taxa_gateway,
        taxa_gateway_origem: v.taxa_gateway_origem,
        valor_parceiros: v.valor_parceiros,
        moeda: v.moeda,
        meio_pagamento: v.meio_pagamento,
        parcelas: v.parcelas,
        cupom: v.cupom,
        afiliado_id_externo: v.afiliado_id_externo,
        utm: v.utm,
        vendida_em: v.vendida_em,
        criada_em: v.criada_em,
        reembolsada_em: v.reembolsada_em,
        dados_brutos: v.dados_brutos,
      },
      { onConflict: "organizacao_id,plataforma,id_externo" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`vendas: ${error.message}`);

  // Comissões: substitui as da venda.
  await supabase.from("comissoes").delete().eq("venda_id", venda.id);
  if (v.comissoes.length) {
    const { error: erroCom } = await supabase.from("comissoes").insert(
      v.comissoes.map((c) => ({
        organizacao_id,
        venda_id: venda.id,
        tipo: c.tipo,
        parceiro_id_externo: c.parceiro_id_externo,
        parceiro_nome: c.parceiro_nome,
        valor: c.valor,
      })),
    );
    if (erroCom) throw new Error(`comissoes: ${erroCom.message}`);
  }
  return clienteId;
}
