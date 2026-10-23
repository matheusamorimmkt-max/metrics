import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hojeNoFuso } from "@/dominio/periodo";
import { obterContexto } from "@/servidor/sessao";
import { periodoDaUrl } from "@/servidor/consultas/periodo";
import { obterResumoHome } from "@/servidor/consultas/home";
import { SeletorHome } from "../home/seletor";
import { TabelaFunis } from "../home/tabela-funis";

export const metadata: Metadata = { title: "Funis" };

export default async function PaginaFunis({ searchParams }: PageProps<"/funis">) {
  const params = await searchParams;
  const { organizacao, podeEditar } = await obterContexto();
  const hoje = hojeNoFuso(organizacao.fuso_horario);
  const periodo = await periodoDaUrl(organizacao, params);
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
            As notificações dos funis de Front-end olham as últimas 48 horas.
            {podeEditar ? (
              <>
                {" "}
                <Link href="/configuracoes/funis" className="underline underline-offset-4">
                  Gerenciar funis
                </Link>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TabelaFunis
            podeEditar={podeEditar}
            categorias={resumo.categorias}
            moeda={organizacao.moeda}
            base="/funis"
          />
        </CardContent>
      </Card>
    </div>
  );
}
