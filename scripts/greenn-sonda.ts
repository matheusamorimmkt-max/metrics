/**
 * Sonda da API da Greenn (Etapa 0 da Fase 2).
 *
 * Faz poucas chamadas de leitura com um token real e imprime a ESTRUTURA das
 * respostas com dados pessoais mascarados, para fechar as dúvidas de
 * docs/greenn-api.md antes de escrever o conector.
 *
 * Uso:
 *   GREENN_TOKEN_SONDA=<token> node scripts/greenn-sonda.ts [pasta-de-saida]
 *
 * As amostras (já anonimizadas) vão para a pasta de saída, que deve ficar FORA
 * do repositório. Nada aqui grava no Supabase.
 */

const BASE = process.env.GREENN_API_BASE ?? "https://apiadm.greenn.com.br/api/v1";
const TOKEN = process.env.GREENN_TOKEN_SONDA?.trim();
const SAIDA = process.argv[2];

if (!TOKEN) {
  console.error("Defina GREENN_TOKEN_SONDA com um token de leitura da Greenn.");
  process.exit(1);
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const CAMPOS_SENSIVEIS =
  /^(email|e-mail|name|nome|first_name|last_name|document|cpf|cpf_cnpj|cnpj|phone|cellphone|telefone|address|street|number|zipcode|zip_code|cep|complement|neighborhood|ip|user_agent)$/i;

function mascarar(valor: Json, chave = ""): Json {
  if (Array.isArray(valor)) return valor.map((v) => mascarar(v));
  if (valor && typeof valor === "object") {
    const saida: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(valor)) saida[k] = mascarar(v, k);
    return saida;
  }
  if (typeof valor === "string" && CAMPOS_SENSIVEIS.test(chave)) {
    if (valor.includes("@")) return `***@${valor.split("@")[1]}`;
    return valor.length > 2 ? `${valor.slice(0, 2)}***` : "***";
  }
  return valor;
}

/** Descreve a forma de um valor: tipos, não conteúdo. */
function forma(valor: Json, profundidade = 0): string {
  const recuo = "  ".repeat(profundidade);
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "[] (vazio)";
    return `[${valor.length}] de ${forma(valor[0], profundidade)}`;
  }
  if (valor && typeof valor === "object") {
    const linhas = Object.entries(valor).map(
      ([k, v]) => `${recuo}  ${k}: ${forma(v, profundidade + 1)}`,
    );
    return `{\n${linhas.join("\n")}\n${recuo}}`;
  }
  if (valor === null) return "null";
  if (typeof valor === "number")
    return Number.isInteger(valor) ? `int (ex.: ${valor})` : `decimal (ex.: ${valor})`;
  if (typeof valor === "string")
    return `string (ex.: ${JSON.stringify(valor.slice(0, 40))})`;
  return typeof valor;
}

async function chamar(
  caminho: string,
): Promise<{ status: number; corpo: Json; headers: Headers }> {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const resposta = await fetch(`${BASE}${caminho}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    });
    if (resposta.status === 429) {
      const espera = Number(resposta.headers.get("retry-after") ?? "5");
      console.log(`  429 em ${caminho}; aguardando ${espera}s`);
      await new Promise((r) => setTimeout(r, espera * 1000));
      continue;
    }
    const texto = await resposta.text();
    let corpo: Json = texto;
    try {
      corpo = JSON.parse(texto) as Json;
    } catch {
      /* resposta não JSON: mantém texto */
    }
    return { status: resposta.status, corpo, headers: resposta.headers };
  }
  throw new Error(`Limite de tentativas em ${caminho}`);
}

async function sondar(titulo: string, caminho: string, arquivo: string): Promise<Json> {
  console.log(`\n=== ${titulo}: GET ${caminho}`);
  const { status, corpo, headers } = await chamar(caminho);
  console.log(
    `  HTTP ${status} · X-RateLimit-Limit=${headers.get("x-ratelimit-limit")} Remaining=${headers.get("x-ratelimit-remaining")}`,
  );
  const anonimo = mascarar(corpo);
  console.log(forma(anonimo));
  if (SAIDA) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(SAIDA, { recursive: true });
    await fs.writeFile(`${SAIDA}/${arquivo}`, JSON.stringify(anonimo, null, 2));
  }
  return corpo;
}

function itens(corpo: Json): Json[] {
  if (
    corpo &&
    typeof corpo === "object" &&
    !Array.isArray(corpo) &&
    Array.isArray(corpo.data)
  )
    return corpo.data;
  if (Array.isArray(corpo)) return corpo;
  return [];
}

async function main() {
  await sondar("Produtos", "/products?per_page=2", "products.json");
  await sondar("Ofertas", "/offers?per_page=2", "offers.json");
  const vendas = await sondar(
    "Vendas (lista)",
    "/sales?per_page=5&sort=-paid_at",
    "sales.json",
  );

  const lista = itens(vendas);
  const escolhidas: Json[] = [];
  const porStatus = (s: string) =>
    lista.find((v) => v && typeof v === "object" && !Array.isArray(v) && v.status === s);
  for (const s of ["paid", "refunded", "chargedback"]) {
    const v = porStatus(s);
    if (v) escolhidas.push(v);
  }
  if (escolhidas.length === 0 && lista[0]) escolhidas.push(lista[0]);

  // Tenta também uma venda reembolsada e uma com afiliado, se a lista inicial não tiver.
  if (!porStatus("refunded")) {
    const r = await sondar(
      "Vendas reembolsadas",
      "/sales?per_page=1&status=refunded",
      "sales-refunded.json",
    );
    const v = itens(r)[0];
    if (v) escolhidas.push(v);
  }

  let n = 0;
  for (const v of escolhidas) {
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    n += 1;
    await sondar(
      `Detalhe da venda ${n} (status ${String(v.status)})`,
      `/sales/${String(v.id)}`,
      `sale-${n}.json`,
    );
  }

  console.log("\nSonda concluída.");
}

main().catch((erro) => {
  console.error("Falha na sonda:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
