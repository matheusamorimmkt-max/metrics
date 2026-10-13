import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatarMetrica } from "@/dominio/metricas";
import { resolverPeriodo } from "@/dominio/periodo";
import { obterContexto } from "@/servidor/sessao";
import { obterTrafego, type LinhaTrafego } from "@/servidor/consultas/trafego";
import { SeletorHome } from "../home/seletor";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tráfego" };

const NIVEIS = [
  { chave: "campanha", rotulo: "Campanhas" },
  { chave: "conjunto", rotulo: "Conjuntos" },
  { chave: "anuncio", rotulo: "Anúncios" },
] as const;

export default async function PaginaTrafego({ searchParams }: PageProps<"/trafego">) {
  const params = await searchParams;
  const { organizacao } = await obterContexto();
  const periodo = resolverPeriodo(organizacao.fuso_horario, {
    periodo: typeof params.periodo === "string" ? params.periodo : undefined,
    de: typeof params.de === "string" ? params.de : undefined,
    ate: typeof params.ate === "string" ? params.ate : undefined,
  });
  const nivel = (
    NIVEIS.some((n) => n.chave === params.nivel) ? params.nivel : "campanha"
  ) as "campanha" | "conjunto" | "anuncio";

  const { linhas, truncado } = await obterTrafego(organizacao.id, periodo);
  const visiveis = linhas.filter((l) => l.nivel === nivel);
  const nomePai = new Map(linhas.map((l) => [l.chave, l.nome]));
  const total = linhas
    .filter((l) => l.nivel === "campanha")
    .reduce(
      (s, l) => ({
        gasto: s.gasto + l.gasto,
        impressoes: s.impressoes + l.impressoes,
        cliques_link: s.cliques_link + l.cliques_link,
        visualizacoes_pagina: s.visualizacoes_pagina + l.visualizacoes_pagina,
        leads: s.leads + l.leads,
      }),
      { gasto: 0, impressoes: 0, cliques_link: 0, visualizacoes_pagina: 0, leads: 0 },
    );
  const query = new URLSearchParams();
  if (periodo.chave !== "30d") query.set("periodo", periodo.chave);
  if (periodo.chave === "personalizado") {
    query.set("de", periodo.de);
    query.set("ate", periodo.ate);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tráfego</h1>
        <p className="text-muted-foreground">
          CPM, CTR, CPC, custo por visualização de página, connect rate e custo por lead,
          por campanha, conjunto e anúncio.
        </p>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual=""
        categorias={[]}
        funis={[]}
        base="/trafego"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <Resumo
          nome="Custo por lead"
          valor={formatarMetrica(
            total.leads ? total.gasto / total.leads : null,
            "moeda",
            organizacao.moeda,
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
                Ordenado por gasto. Alcance não aparece porque não é somável entre dias.
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
        <CardContent>
          {visiveis.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem dados de anúncios no período. Conecte o Meta Ads em{" "}
              <Link
                href="/configuracoes/integracoes"
                className="underline underline-offset-4"
              >
                Integrações
              </Link>{" "}
              e clique em &ldquo;Atualizar agora&rdquo;.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {NIVEIS.find((n) => n.chave === nivel)?.rotulo.slice(0, -1)}
                    </TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">CPM</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right">Custo/página</TableHead>
                    <TableHead className="text-right">Connect rate</TableHead>
                    <TableHead className="text-right">Custo/checkout</TableHead>
                    <TableHead className="text-right">Custo/lead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((l) => (
                    <LinhaTabela
                      key={l.chave}
                      linha={l}
                      pai={l.pai ? nomePai.get(l.pai) : undefined}
                      moeda={organizacao.moeda}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
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

function LinhaTabela({
  linha,
  pai,
  moeda,
}: {
  linha: LinhaTrafego;
  pai?: string;
  moeda: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{linha.nome}</div>
        <div className="text-muted-foreground text-xs">
          {pai ? `${pai} · ` : ""}
          {linha.funil_nome ? (
            <Badge variant="outline">{linha.funil_nome}</Badge>
          ) : (
            "não vinculada"
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.gasto, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.cpm, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.ctr, "percentual")}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.cpc, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.custo_pagina, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.connect_rate, "percentual")}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.custo_checkout, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(linha.custo_lead, "moeda", moeda)}
      </TableCell>
    </TableRow>
  );
}
