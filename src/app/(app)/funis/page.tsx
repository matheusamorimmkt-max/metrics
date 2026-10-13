import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hojeNoFuso, resolverPeriodo } from "@/dominio/periodo";
import { obterContexto } from "@/servidor/sessao";
import { obterResumoHome } from "@/servidor/consultas/home";
import { SeletorHome } from "../home/seletor";
import { TabelaFunis } from "../home/tabela-funis";

export const metadata: Metadata = { title: "Funis" };

export default async function PaginaFunis({ searchParams }: PageProps<"/funis">) {
  const params = await searchParams;
  const { organizacao } = await obterContexto();
  const hoje = hojeNoFuso(organizacao.fuso_horario);
  const periodo = resolverPeriodo(organizacao.fuso_horario, {
    periodo: typeof params.periodo === "string" ? params.periodo : undefined,
    de: typeof params.de === "string" ? params.de : undefined,
    ate: typeof params.ate === "string" ? params.ate : undefined,
  });
  const resumo = await obterResumoHome(
    organizacao.id,
    organizacao.taxa_anuncios,
    periodo,
    { tipo: "negocio" },
    hoje,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Funis</h1>
        <p className="text-muted-foreground">
          Investimento, faturamento, lucro, ROAS e ROI de cada funil no período. Clique no
          funil para ver as etapas, as ofertas e as campanhas.
        </p>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual=""
        categorias={[]}
        funis={[]}
        base="/funis"
      />

      <Card>
        <CardHeader>
          <CardTitle>Por categoria e funil</CardTitle>
          <CardDescription>
            O semáforo dos funis de Front-end olha ontem e anteontem.{" "}
            <Link href="/configuracoes/funis" className="underline underline-offset-4">
              Gerenciar funis
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TabelaFunis
            categorias={resumo.categorias}
            moeda={organizacao.moeda}
            base="/funis"
          />
        </CardContent>
      </Card>
    </div>
  );
}
