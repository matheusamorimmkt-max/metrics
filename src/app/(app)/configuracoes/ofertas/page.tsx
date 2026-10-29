import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatarMetrica } from "@/dominio/metricas";
import { obterContexto } from "@/servidor/sessao";
import { listarOfertasComMes } from "@/servidor/consultas/ofertas";
import { listarFunisParaVinculo } from "@/servidor/consultas/campanhas";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { TabelaOfertas } from "./tabela-ofertas";

export const metadata: Metadata = { title: "Ofertas" };

export default async function PaginaOfertas({
  searchParams,
}: PageProps<"/configuracoes/ofertas">) {
  const params = await searchParams;
  const soNaoVinculadas = params.filtro === "nao_vinculadas";
  const { organizacao } = await obterContexto();
  const [todas, funis, integracoes] = await Promise.all([
    listarOfertasComMes(organizacao.id, organizacao.fuso_horario),
    listarFunisParaVinculo(organizacao.id),
    listarIntegracoes(organizacao.id),
  ]);
  const greenn = integracoes.greenn;
  const naoVinculadas = todas.filter((o) => !o.funil_id);
  const faturamentoSemFunil = naoVinculadas.reduce((s, o) => s + o.faturamento, 0);
  const ofertas = soNaoVinculadas ? naoVinculadas : todas;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ofertas</CardTitle>
          <CardDescription>
            O ID da oferta no gateway decide a qual funil cada venda pertence. Uma oferta
            só pode estar em um funil. As colunas &ldquo;este mês&rdquo; mostram quais
            ofertas tiveram movimento no mês corrente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todas.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {!greenn || greenn.status === "desconectada" ? (
                <>
                  Conecte a Greenn em{" "}
                  <Link
                    href="/configuracoes/integracoes"
                    className="underline underline-offset-4"
                  >
                    Integrações
                  </Link>{" "}
                  para importar as ofertas.
                </>
              ) : (
                "Nenhuma oferta importada ainda. A primeira sincronização da Greenn traz as ofertas para cá."
              )}
            </p>
          ) : (
            <>
              {naoVinculadas.length > 0 ? (
                <Alert>
                  <AlertTriangle />
                  <AlertTitle>
                    {naoVinculadas.length === 1
                      ? "1 oferta não vinculada"
                      : `${naoVinculadas.length} ofertas não vinculadas`}
                  </AlertTitle>
                  <AlertDescription>
                    {formatarMetrica(faturamentoSemFunil, "moeda", organizacao.moeda)} de
                    faturamento acumulado fora dos funis.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={soNaoVinculadas ? "ghost" : "default"}
                  render={<Link href="/configuracoes/ofertas" />}
                >
                  Todas ({todas.length})
                </Button>
                <Button
                  size="sm"
                  variant={soNaoVinculadas ? "default" : "ghost"}
                  render={<Link href="/configuracoes/ofertas?filtro=nao_vinculadas" />}
                >
                  Não vinculadas ({naoVinculadas.length})
                </Button>
              </div>
              <TabelaOfertas ofertas={ofertas} funis={funis} moeda={organizacao.moeda} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
