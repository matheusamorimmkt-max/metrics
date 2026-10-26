import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  PlugZap,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CARDS_HOME, formatarMetrica, type Metricas } from "@/dominio/metricas";
import { INTEGRACOES, TIPOS_INTEGRACAO } from "@/dominio/integracoes";
import { hojeNoFuso } from "@/dominio/periodo";
import { obterContexto } from "@/servidor/sessao";
import { periodoDaUrl } from "@/servidor/consultas/periodo";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { obterResumoHome, type Filtro } from "@/servidor/consultas/home";
import { obterComposicoes } from "@/servidor/consultas/composicao";
import {
  obterDetalhesClientes,
  obterIndicadoresClientes,
} from "@/servidor/consultas/clientes";
import { listarFunisInfo } from "@/servidor/consultas/home";
import { montarDetalhes } from "@/dominio/detalhe-metrica";
import { BotaoDetalheMetrica } from "./home/detalhe-metrica";
import { SeletorHome } from "./home/seletor";
import { GraficoSerie } from "./home/graficos";
import { TabelaFunis } from "./home/tabela-funis";
import { cn } from "@/lib/utils";

function lerFiltro(valor: string | undefined): Filtro {
  if (!valor) return { tipo: "negocio" };
  const [tipo, id] = valor.split(":");
  if ((tipo === "categoria" || tipo === "funil") && id) return { tipo, id };
  return { tipo: "negocio" };
}

function Variacao({
  atual,
  anterior,
  formato,
}: {
  atual: number | null;
  anterior: number | null;
  formato: (typeof CARDS_HOME)[number]["formato"];
}) {
  if (atual === null || anterior === null || anterior === 0) return null;
  const delta = (atual - anterior) / Math.abs(anterior);
  const sobe = delta >= 0;
  const Icone = sobe ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs tabular-nums",
        sobe ? "text-emerald-600" : "text-red-600",
      )}
      title={`Período anterior: ${formatarMetrica(anterior, formato)}`}
    >
      <Icone className="size-3.5" aria-hidden />
      {formatarMetrica(Math.abs(delta), "percentual")} vs. período anterior
    </span>
  );
}

export default async function PaginaHome({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const { organizacao, podeEditar } = await obterContexto();
  const hoje = hojeNoFuso(organizacao.fuso_horario);
  const periodo = await periodoDaUrl(organizacao, params);
  const filtroTexto = typeof params.filtro === "string" ? params.filtro : "";
  const filtro = lerFiltro(filtroTexto);

  const funisInfo = await listarFunisInfo(organizacao.id);
  const categoriaDoFunil = new Map(funisInfo.map((f) => [f.id, f.categoria_id]));
  const [integracoes, clientes, detalhesClientes] = await Promise.all([
    listarIntegracoes(organizacao.id),
    obterIndicadoresClientes(
      organizacao.id,
      periodo,
      organizacao.fuso_horario,
      filtro,
      categoriaDoFunil,
    ),
    obterDetalhesClientes(
      organizacao.id,
      periodo,
      organizacao.fuso_horario,
      filtro,
      categoriaDoFunil,
    ),
  ]);
  const resumo = await obterResumoHome(
    organizacao.id,
    organizacao.taxa_anuncios,
    periodo,
    filtro,
    hoje,
    clientes,
  );
  const composicoes = await obterComposicoes(
    organizacao.id,
    periodo,
    filtro,
    resumo.funis,
    organizacao.fuso_horario,
  );
  const detalhes = montarDetalhes({
    ...composicoes,
    taxa_anuncios: organizacao.taxa_anuncios,
    investimento: resumo.atual.investimento,
    faturamento_bruto: resumo.atual.faturamento_bruto,
    lucro: resumo.atual.lucro,
    reembolsos: resumo.composicao.reembolsos,
    taxas_gateway: resumo.composicao.taxas_gateway,
    parceiros: resumo.composicao.parceiros,
    impostos: resumo.composicao.impostos,
    transacoes: resumo.atual.transacoes,
    itens: resumo.atual.itens,
    clientes: detalhesClientes.clientes,
    transacoes_por_itens: detalhesClientes.transacoes_por_itens,
    recompradores: detalhesClientes.recompradores,
    novos: detalhesClientes.novos,
    moeda: organizacao.moeda,
  });

  const pendentes = TIPOS_INTEGRACAO.filter(
    (t) => integracoes[t]?.status !== "conectada",
  );
  const tituloFiltro =
    filtro.tipo === "negocio"
      ? "Negócio inteiro"
      : filtro.tipo === "categoria"
        ? (resumo.categoriasDisponiveis.find((c) => c.id === filtro.id)?.nome ??
          "Categoria")
        : (resumo.funis.find((f) => f.id === filtro.id)?.nome ?? "Funil");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{organizacao.nome}</h1>
        <p className="text-muted-foreground">
          {tituloFiltro} · {periodo.de.split("-").reverse().join("/")} a{" "}
          {periodo.ate.split("-").reverse().join("/")}
        </p>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual={filtroTexto}
        categorias={resumo.categoriasDisponiveis}
        funis={resumo.funis}
      />

      {pendentes.length > 0 ? (
        <Alert>
          <PlugZap />
          <AlertTitle>
            Os dados serão preenchidos quando as integrações estiverem conectadas
          </AlertTitle>
          <AlertDescription>
            <p>
              Faltando: {pendentes.map((t) => INTEGRACOES[t].nome).join(" e ")}. O
              faturamento vem do gateway e o investimento vem do Meta Ads.
            </p>
            {podeEditar ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                render={<Link href="/configuracoes/integracoes" />}
              >
                Conectar integrações <ArrowRight aria-hidden />
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS_HOME.map((card) => {
          const chave = card.chave as keyof Metricas;
          const valor = resumo.atual[chave];
          const detalhe = detalhes[chave];
          return (
            <Card key={card.chave}>
              <CardHeader>
                <CardDescription>{card.nome}</CardDescription>
                {detalhe ? (
                  <CardAction>
                    <BotaoDetalheMetrica
                      detalhe={detalhe}
                      moeda={organizacao.moeda}
                      fuso={organizacao.fuso_horario}
                    />
                  </CardAction>
                ) : null}
                <CardTitle
                  className={cn(
                    "text-2xl tabular-nums",
                    chave === "lucro" && resumo.atual.lucro < 0 && "text-destructive",
                  )}
                >
                  {formatarMetrica(valor, card.formato, organizacao.moeda)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Variacao
                  atual={valor}
                  anterior={resumo.anterior[chave]}
                  formato={card.formato}
                />
                <p className="text-muted-foreground text-xs">{card.descricao}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {resumo.gasto_nao_vinculado > 0 || resumo.faturamento_nao_vinculado > 0 ? (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Há movimento fora dos funis</AlertTitle>
          <AlertDescription>
            {resumo.gasto_nao_vinculado > 0 ? (
              <p>
                {formatarMetrica(resumo.gasto_nao_vinculado, "moeda", organizacao.moeda)}{" "}
                gastos em campanhas não vinculadas.
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
            ) : null}
            {resumo.faturamento_nao_vinculado > 0 ? (
              <p>
                {formatarMetrica(
                  resumo.faturamento_nao_vinculado,
                  "moeda",
                  organizacao.moeda,
                )}{" "}
                vendidos em ofertas não vinculadas.
                {podeEditar ? (
                  <>
                    {" "}
                    <Link
                      href="/configuracoes/ofertas"
                      className="underline underline-offset-4"
                    >
                      Vincular ofertas
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dia a dia</CardTitle>
          <CardDescription>Investimento, faturamento e lucro por dia.</CardDescription>
        </CardHeader>
        <CardContent>
          <GraficoSerie serie={resumo.serie} moeda={organizacao.moeda} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por categoria e funil</CardTitle>
          <CardDescription>
            As notificações dos funis de Front-end olham as últimas 48 horas, independente
            do período, e sinalizam quando o ROI fica abaixo do esperado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TabelaFunis
            categorias={resumo.categorias}
            moeda={organizacao.moeda}
            podeEditar={podeEditar}
          />
        </CardContent>
      </Card>
    </div>
  );
}
