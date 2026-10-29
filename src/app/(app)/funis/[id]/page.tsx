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
import { listarFunisInfo, obterResumoHome } from "@/servidor/consultas/home";
import { obterIndicadoresClientes } from "@/servidor/consultas/clientes";
import { TabelaDiaria } from "../tabela-diaria";
import {
  listarCampanhasDoFunilNoPeriodo,
  listarOfertasDoFunilNoPeriodo,
  obterPagamentosDoFunil,
  obterRecomprasGeradas,
} from "@/servidor/consultas/funil-detalhe";
import { BarrasPaises, PizzaPagamentos } from "../graficos-pagamentos";
import { TabelaGrupos } from "../tabela-grupos";
import { SeletorHome } from "../../home/seletor";
import { GraficoSerie } from "../../home/graficos";
import { EtapasFunil } from "../etapas-funil";
import { cn } from "@/lib/utils";
import { CLASSE_COR_STATUS, traduzirStatusCampanha } from "@/dominio/status-campanha";

export const metadata: Metadata = { title: "Funil" };

export default async function PaginaFunil({
  params,
  searchParams,
}: PageProps<"/funis/[id]">) {
  const { id } = await params;
  const busca = await searchParams;
  const { organizacao, podeEditar } = await obterContexto();
  const funil = await obterFunil(organizacao.id, id);
  if (!funil) notFound();

  const hoje = hojeNoFuso(organizacao.fuso_horario);
  const periodo = await periodoDaUrl(organizacao, busca);

  const funisInfo = await listarFunisInfo(organizacao.id);
  const categoriaDoFunil = new Map(funisInfo.map((f) => [f.id, f.categoria_id]));
  const [clientes, ofertas, campanhas, pagamentos, recomprasGeradas] = await Promise.all([
    obterIndicadoresClientes(
      organizacao.id,
      periodo,
      organizacao.fuso_horario,
      { tipo: "funil", id },
      categoriaDoFunil,
    ),
    listarOfertasDoFunilNoPeriodo(organizacao.id, id, periodo),
    listarCampanhasDoFunilNoPeriodo(organizacao.id, id, periodo),
    obterPagamentosDoFunil(organizacao.id, id, periodo, organizacao.fuso_horario),
    obterRecomprasGeradas(organizacao.id, id, periodo, organizacao.fuso_horario),
  ]);
  const resumo = await obterResumoHome(
    organizacao.id,
    organizacao.taxa_anuncios,
    periodo,
    { tipo: "funil", id },
    hoje,
    clientes,
  );
  // Investimento, faturamento, lucro, ROAS e ROI já aparecem na tabela de dia a dia.
  const cardsSecundarios = CARDS_HOME.filter(
    (c) =>
      !["investimento", "faturamento_bruto", "lucro", "roas", "roi"].includes(c.chave),
  );
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

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Etapas do funil</CardTitle>
          <CardDescription>
            Taxa de conversão de cada etapa em relação à anterior; abaixo, a quantidade.
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
        <CardContent className="space-y-6">
          <GraficoSerie serie={resumo.serie} moeda={organizacao.moeda} />
          <TabelaDiaria serie={resumo.serie} moeda={organizacao.moeda} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cardsSecundarios.map((card) => {
          const chave = card.chave as keyof Metricas;
          return (
            <Card key={card.chave}>
              <CardHeader>
                <CardDescription>{card.nome}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {formatarMetrica(resumo.atual[chave], card.formato, organizacao.moeda)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-xs">{card.descricao}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recompras geradas por este funil</CardTitle>
          <CardDescription>
            Clientes que entraram por aqui e compraram de novo no período, em qualquer
            oferta. Essas vendas contam no funil da oferta comprada; aqui está o que este
            funil gerou de receita adicional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">Clientes que recompraram</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatarMetrica(recomprasGeradas.clientes, "inteiro")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Recompras</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatarMetrica(recomprasGeradas.transacoes, "inteiro")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Receita adicional</p>
              <p className="text-2xl font-semibold tabular-nums text-emerald-600">
                {formatarMetrica(recomprasGeradas.receita, "moeda", organizacao.moeda)}
              </p>
            </div>
          </div>
          {recomprasGeradas.destinos.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Para onde foram</TableHead>
                  <TableHead className="text-right">Recompras</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recomprasGeradas.destinos.map((d) => (
                  <TableRow key={d.funil}>
                    <TableCell className="font-medium">{d.funil}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.transacoes}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(d.receita, "moeda", organizacao.moeda)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhuma recompra de clientes deste funil no período.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Formas de pagamento ativas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {pagamentos.por_meio.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Formas com pelo menos uma venda neste funil no período.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Países com vendas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {pagamentos.por_pais.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Estimado pela moeda da venda: a Greenn não informa o país do comprador.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formas de pagamento</CardTitle>
          <CardDescription>
            Participação de cada forma no faturamento do funil no período.
            {pagamentos.truncado
              ? " Consulta limitada a 20 mil vendas; os números podem estar incompletos."
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PizzaPagamentos grupos={pagamentos.por_meio} moeda={organizacao.moeda} />
          <TabelaGrupos
            grupos={pagamentos.por_meio}
            moeda={organizacao.moeda}
            rotulo="Forma de pagamento"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Países</CardTitle>
          <CardDescription>
            Países com mais faturamento, estimados pela moeda em que o cliente pagou. Quem
            paga em dólar ou euro aparece sem país.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BarrasPaises grupos={pagamentos.por_pais} moeda={organizacao.moeda} />
          <TabelaGrupos grupos={pagamentos.por_pais} moeda={organizacao.moeda} rotulo="País" />
        </CardContent>
      </Card>

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
              Nenhuma campanha vinculada a este funil.
              {podeEditar ? (
                <>
                  {" "}
                  <Link
                    href="/configuracoes/campanhas"
                    className="underline underline-offset-4"
                  >
                    Vincular campanhas
                  </Link>
                </>
              ) : null}
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
                      <Badge
                        variant="outline"
                        className={
                          CLASSE_COR_STATUS[traduzirStatusCampanha(c.status).cor]
                        }
                      >
                        {traduzirStatusCampanha(c.status).rotulo}
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
