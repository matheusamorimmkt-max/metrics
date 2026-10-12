import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obterContexto } from "@/servidor/sessao";
import { listarCampanhas, listarFunisParaVinculo } from "@/servidor/consultas/campanhas";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { formatarMetrica } from "@/dominio/metricas";
import { LinhaCampanha } from "./linha-campanha";

export const metadata: Metadata = { title: "Campanhas" };

export default async function PaginaCampanhas() {
  const { organizacao } = await obterContexto();
  const [campanhas, funis, integracoes] = await Promise.all([
    listarCampanhas(organizacao.id),
    listarFunisParaVinculo(organizacao.id),
    listarIntegracoes(organizacao.id),
  ]);

  const meta = integracoes.meta;
  const naoVinculadas = campanhas.filter((c) => !c.funil_id);
  const gastoNaoVinculado = naoVinculadas.reduce((s, c) => s + c.gasto_30d, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
          <CardDescription>
            Cada campanha pertence a um único funil. O gasto de campanhas sem funil entra
            no total da Home, mas em nenhum funil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!meta || meta.status === "desconectada" ? (
            <p className="text-muted-foreground text-sm">
              Conecte o Meta Ads em{" "}
              <Link
                href="/configuracoes/integracoes"
                className="underline underline-offset-4"
              >
                Integrações
              </Link>{" "}
              para importar as campanhas.
            </p>
          ) : campanhas.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma campanha importada ainda. Clique em &ldquo;Atualizar agora&rdquo; no
              topo para buscar as campanhas da conta.
            </p>
          ) : (
            <>
              {naoVinculadas.length > 0 ? (
                <Alert>
                  <AlertTriangle />
                  <AlertTitle>
                    {naoVinculadas.length === 1
                      ? "1 campanha não vinculada"
                      : `${naoVinculadas.length} campanhas não vinculadas`}
                  </AlertTitle>
                  <AlertDescription>
                    {formatarMetrica(gastoNaoVinculado, "moeda", organizacao.moeda)}{" "}
                    gastos nos últimos 30 dias sem funil. Escolha um funil em cada linha
                    abaixo.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gasto 30 dias</TableHead>
                    <TableHead className="text-right">Gasto total</TableHead>
                    <TableHead className="w-64">Funil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campanhas.map((c) => (
                    <LinhaCampanha key={c.id} campanha={c} funis={funis} />
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
