import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CARDS_HOME, formatarMetrica, type Metricas } from "@/dominio/metricas";
import { hojeNoFuso } from "@/dominio/periodo";
import { ROTULO_PAPEL } from "@/dominio/schemas/funil-oferta";
import { ROTULO_TIPO_FUNIL, type TipoFunil } from "@/dominio/schemas/funil";
import { obterContexto } from "@/servidor/sessao";
import { periodoDaUrl } from "@/servidor/consultas/periodo";
import { obterFunil } from "@/servidor/consultas/funis";
import { obterResumoHome } from "@/servidor/consultas/home";
import {
  listarCampanhasDoFunilNoPeriodo,
  listarOfertasDoFunilNoPeriodo,
} from "@/servidor/consultas/funil-detalhe";
import { SeletorHome } from "../../home/seletor";
import { GraficoSerie } from "../../home/graficos";
import { EtapasFunil } from "../etapas-funil";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Funil" };

export default async function PaginaFunil({
  params,
  searchParams,
}: PageProps<"/funis/[id]">) {
  const { id } = await params;
  const busca = await searchParams;
  const { organizacao } = await obterContexto();
  const funil = await obterFunil(organizacao.id, id);
  if (!funil) notFound();

  const hoje = hojeNoFuso(organizacao.fuso_horario);
  const periodo = await periodoDaUrl(organizacao, busca);

  const [resumo, ofertas, campanhas] = await Promise.all([
    obterResumoHome(
      organizacao.id,
      organizacao.taxa_anuncios,
      periodo,
      { tipo: "funil", id },
      hoje,
    ),
    listarOfertasDoFunilNoPeriodo(organizacao.id, id, periodo),
    listarCampanhasDoFunilNoPeriodo(organizacao.id, id, periodo),
  ]);
  const semaforo = resumo.categorias
    .flatMap((c) => c.funis)
    .find((f) => f.funil?.id === id)?.semaforo;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/funis" className="hover:underline">
              Funis
            </Link>{" "}
            · {resumo.funis.find((f) => f.id === id)?.categoria_nome}
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {semaforo ? (
              <span
                className={cn(
                  "inline-block size-3 rounded-full",
                  semaforo === "verde" && "bg-emerald-500",
                  semaforo === "amarelo" && "bg-amber-400",
                  semaforo === "vermelho" && "bg-red-500",
                )}
                aria-label={`Notificação ${semaforo}`}
              />
            ) : null}
            {funil.nome}
          </h1>
          <p className="text-muted-foreground text-sm">
            {ROTULO_TIPO_FUNIL[funil.tipo as TipoFunil]} · meta de ROI{" "}
            {formatarMetrica(funil.meta_roi, "percentual")}
            {!funil.ativo ? " · inativo" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/configuracoes/funis/${id}`} />}
        >
          <Settings data-icon="inline-start" />
          Configurar funil
        </Button>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual=""
        categorias={[]}
        funis={[]}
        base={`/funis/${id}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS_HOME.map((card) => {
          const chave = card.chave as keyof Metricas;
          return (
            <Card key={card.chave}>
              <CardHeader>
                <CardDescription>{card.nome}</CardDescription>
                <CardTitle
                  className={cn(
                    "text-2xl tabular-nums",
                    chave === "lucro" && resumo.atual.lucro < 0 && "text-destructive",
                  )}
                >
                  {formatarMetrica(resumo.atual[chave], card.formato, organizacao.moeda)}
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Etapas do funil</CardTitle>
            <CardDescription>
              Anúncios até o checkout vêm do Meta; compras vêm do gateway.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EtapasFunil etapas={resumo.etapas} tipo={funil.tipo} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dia a dia</CardTitle>
            <CardDescription>Investimento, faturamento e lucro por dia.</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoSerie serie={resumo.serie} moeda={organizacao.moeda} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ofertas</CardTitle>
          <CardDescription>Desempenho por oferta no período.</CardDescription>
        </CardHeader>
        <CardContent>
          {ofertas.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma oferta neste funil.{" "}
              <Link
                href={`/configuracoes/funis/${id}`}
                className="underline underline-offset-4"
              >
                Definir ofertas
              </Link>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oferta</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Reembolsadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ofertas.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">{o.nome}</div>
                      <div className="text-muted-foreground text-xs">
                        {o.produto_nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          o.vinculo_status === "sugerido" ? "secondary" : "outline"
                        }
                      >
                        {o.papel ? ROTULO_PAPEL[o.papel] : "—"}
                        {o.vinculo_status === "sugerido" ? " (sugestão)" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(o.preco, "moeda", organizacao.moeda)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.vendas_periodo}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(o.faturamento_periodo, "moeda", organizacao.moeda)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.reembolsadas_periodo}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campanhas vinculadas</CardTitle>
          <CardDescription>Gasto e resultados de anúncio no período.</CardDescription>
        </CardHeader>
        <CardContent>
          {campanhas.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma campanha vinculada a este funil.{" "}
              <Link
                href="/configuracoes/campanhas"
                className="underline underline-offset-4"
              >
                Vincular campanhas
              </Link>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques no link</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanhas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.nome || c.id_externo}</div>
                      <div className="text-muted-foreground text-xs">{c.conta_nome}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.ativo ? "default" : "outline"}>
                        {c.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(c.gasto_periodo, "moeda", c.moeda)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(c.impressoes_periodo, "inteiro")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(c.cliques_link_periodo, "inteiro")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(c.leads_periodo, "inteiro")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
