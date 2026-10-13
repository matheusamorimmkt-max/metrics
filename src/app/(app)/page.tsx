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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CARDS_HOME, formatarMetrica, type Metricas } from "@/dominio/metricas";
import { INTEGRACOES, TIPOS_INTEGRACAO } from "@/dominio/integracoes";
import { hojeNoFuso, resolverPeriodo } from "@/dominio/periodo";
import { obterContexto } from "@/servidor/sessao";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { obterResumoHome, type Filtro } from "@/servidor/consultas/home";
import { SeletorHome } from "./home/seletor";
import { GraficoComposicao, GraficoSerie } from "./home/graficos";
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
  if (atual === null || anterior === null || anterior === 0) {
    return <span className="text-muted-foreground text-xs">sem comparação</span>;
  }
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
  const { organizacao } = await obterContexto();
  const hoje = hojeNoFuso(organizacao.fuso_horario);
  const periodo = resolverPeriodo(organizacao.fuso_horario, {
    periodo: typeof params.periodo === "string" ? params.periodo : undefined,
    de: typeof params.de === "string" ? params.de : undefined,
    ate: typeof params.ate === "string" ? params.ate : undefined,
  });
  const filtroTexto = typeof params.filtro === "string" ? params.filtro : "";
  const filtro = lerFiltro(filtroTexto);

  const [integracoes, resumo] = await Promise.all([
    listarIntegracoes(organizacao.id),
    obterResumoHome(organizacao.id, organizacao.taxa_anuncios, periodo, filtro, hoje),
  ]);

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
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              render={<Link href="/configuracoes/integracoes" />}
            >
              Conectar integrações <ArrowRight aria-hidden />
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS_HOME.map((card) => {
          const chave = card.chave as keyof Metricas;
          const valor = resumo.atual[chave];
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
                gastos em campanhas não vinculadas.{" "}
                <Link
                  href="/configuracoes/campanhas"
                  className="underline underline-offset-4"
                >
                  Vincular campanhas
                </Link>
              </p>
            ) : null}
            {resumo.faturamento_nao_vinculado > 0 ? (
              <p>
                {formatarMetrica(
                  resumo.faturamento_nao_vinculado,
                  "moeda",
                  organizacao.moeda,
                )}{" "}
                vendidos em ofertas não vinculadas.{" "}
                <Link
                  href="/configuracoes/ofertas"
                  className="underline underline-offset-4"
                >
                  Vincular ofertas
                </Link>
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Para onde foi o dinheiro</CardTitle>
            <CardDescription>
              Faturamento bruto dividido entre investimento, parceiros, taxas, impostos,
              reembolsos e lucro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoComposicao composicao={resumo.composicao} moeda={organizacao.moeda} />
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
          <CardTitle>Por categoria e funil</CardTitle>
          <CardDescription>
            O semáforo dos funis de Front-end olha ontem e anteontem, independente do
            período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TabelaFunis categorias={resumo.categorias} moeda={organizacao.moeda} />
        </CardContent>
      </Card>
    </div>
  );
}
