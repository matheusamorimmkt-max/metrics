import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatarMetrica } from "@/dominio/metricas";
import { obterContexto } from "@/servidor/sessao";
import { PERIODO_PADRAO } from "@/dominio/periodo";
import { periodoDaUrl } from "@/servidor/consultas/periodo";
import { obterTrafego, type LinhaTrafego } from "@/servidor/consultas/trafego";
import { SeletorHome } from "../home/seletor";
import { lerLista } from "@/dominio/lista-url";
import { BarraSelecao } from "./selecao";
import { TabelaTrafego } from "./tabela-trafego";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tráfego" };

const NIVEIS = [
  { chave: "campanha", rotulo: "Campanhas" },
  { chave: "conjunto", rotulo: "Conjuntos" },
  { chave: "anuncio", rotulo: "Anúncios" },
] as const;

export default async function PaginaTrafego({ searchParams }: PageProps<"/trafego">) {
  const params = await searchParams;
  const { organizacao, podeEditar } = await obterContexto();
  const periodo = await periodoDaUrl(organizacao, params);
  const nivel = (
    NIVEIS.some((n) => n.chave === params.nivel) ? params.nivel : "campanha"
  ) as "campanha" | "conjunto" | "anuncio";

  const { linhas, truncado } = await obterTrafego(organizacao.id, periodo);
  const existentes = new Set(linhas.map((l) => l.chave));
  const selCampanhas = lerLista(params.campanhas).filter((c) => existentes.has(c));
  const selConjuntos = lerLista(params.conjuntos).filter((c) => existentes.has(c));

  // Cascata como no Gerenciador de Anúncios: campanhas marcadas restringem os
  // conjuntos; conjuntos marcados restringem os anúncios (ou as campanhas, se não
  // houver conjunto marcado).
  const dentroDaSelecao = (l: LinhaTrafego) => {
    if (l.nivel === "campanha") return true;
    if (l.nivel === "conjunto") {
      return selCampanhas.length === 0 || selCampanhas.includes(l.campanha_chave);
    }
    if (selConjuntos.length) return l.pai !== null && selConjuntos.includes(l.pai);
    return selCampanhas.length === 0 || selCampanhas.includes(l.campanha_chave);
  };
  const visiveis = linhas.filter((l) => l.nivel === nivel && dentroDaSelecao(l));
  const nomePai = Object.fromEntries(linhas.map((l) => [l.chave, l.nome]));

  // Os cards somam o escopo selecionado (conjuntos > campanhas > tudo).
  const escopo = selConjuntos.length
    ? linhas.filter((l) => l.nivel === "conjunto" && selConjuntos.includes(l.chave))
    : selCampanhas.length
      ? linhas.filter((l) => l.nivel === "campanha" && selCampanhas.includes(l.chave))
      : linhas.filter((l) => l.nivel === "campanha");
  const total = escopo.reduce(
    (s, l) => ({
      gasto: s.gasto + l.gasto,
      impressoes: s.impressoes + l.impressoes,
      cliques_link: s.cliques_link + l.cliques_link,
    }),
    { gasto: 0, impressoes: 0, cliques_link: 0 },
  );
  const query = new URLSearchParams();
  if (periodo.chave !== PERIODO_PADRAO) query.set("periodo", periodo.chave);
  if (periodo.chave === "personalizado") {
    query.set("de", periodo.de);
    query.set("ate", periodo.ate);
  }
  if (selCampanhas.length) query.set("campanhas", selCampanhas.join(","));
  if (selConjuntos.length) query.set("conjuntos", selConjuntos.join(","));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tráfego</h1>
        <p className="text-muted-foreground">
          Relatório por campanha, conjunto e anúncio. Escolha as métricas em
          &ldquo;Métricas&rdquo; e clique nas colunas para ordenar.
        </p>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual=""
        categorias={[]}
        funis={[]}
        base="/trafego"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Resumo
          nome="Gasto"
          valor={formatarMetrica(total.gasto, "moeda", organizacao.moeda)}
        />
        <Resumo nome="Impressões" valor={formatarMetrica(total.impressoes, "inteiro")} />
        <Resumo
          nome="Cliques no link"
          valor={formatarMetrica(total.cliques_link, "inteiro")}
        />
        <Resumo
          nome="CTR"
          valor={formatarMetrica(
            total.impressoes ? total.cliques_link / total.impressoes : null,
            "percentual",
          )}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                Por {NIVEIS.find((n) => n.chave === nivel)?.rotulo.toLowerCase()}
              </CardTitle>
              <CardDescription>
                Marque campanhas para ver só os conjuntos delas, e conjuntos para ver só
                os anúncios deles.
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {NIVEIS.map((n) => {
                const q = new URLSearchParams(query);
                q.set("nivel", n.chave);
                return (
                  <Link
                    key={n.chave}
                    href={`/trafego?${q.toString()}`}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm",
                      n.chave === nivel
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {n.rotulo}
                  </Link>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <BarraSelecao campanhas={selCampanhas.length} conjuntos={selConjuntos.length} />
          {visiveis.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {selCampanhas.length || selConjuntos.length
                ? "Nada dentro da seleção neste nível. "
                : "Sem dados de anúncios no período. "}
              {podeEditar ? (
                <>
                  Conecte o Meta Ads em{" "}
                  <Link
                    href="/configuracoes/integracoes"
                    className="underline underline-offset-4"
                  >
                    Integrações
                  </Link>{" "}
                  e clique em &ldquo;Atualizar agora&rdquo;.
                </>
              ) : (
                "Peça a um administrador para conectar o Meta Ads."
              )}
            </p>
          ) : (
            <TabelaTrafego
              linhas={visiveis}
              nomePai={nomePai}
              podeEditar={podeEditar}
              moeda={organizacao.moeda}
              rotuloNivel={
                NIVEIS.find((n) => n.chave === nivel)?.rotulo.slice(0, -1) ?? ""
              }
              selecao={
                nivel === "campanha"
                  ? { parametro: "campanhas", selecionados: selCampanhas }
                  : nivel === "conjunto"
                    ? { parametro: "conjuntos", selecionados: selConjuntos }
                    : undefined
              }
            />
          )}
          {truncado ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Período muito grande: a tabela considera só as primeiras 20 mil linhas
              diárias. Reduza o período para ver tudo.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Resumo({ nome, valor }: { nome: string; valor: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{nome}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{valor}</CardTitle>
      </CardHeader>
    </Card>
  );
}
