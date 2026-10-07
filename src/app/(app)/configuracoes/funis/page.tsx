import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { obterContexto } from "@/servidor/sessao";
import { listarFunisPorCategoria } from "@/servidor/consultas/funis";
import { ROTULO_TIPO_FUNIL } from "@/dominio/schemas/funil";
import { formatarPercentual } from "@/dominio/percentual";
import { formatarPeriodo } from "@/lib/datas";

export const metadata: Metadata = { title: "Funis" };

export default async function PaginaFunis({
  searchParams,
}: PageProps<"/configuracoes/funis">) {
  const { organizacao } = await obterContexto();
  const params = await searchParams;
  const categorias = await listarFunisPorCategoria(organizacao.id);
  const totalFunis = categorias.reduce((n, c) => n + c.funis.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Funis</h2>
          <p className="text-muted-foreground text-sm">
            Cada funil é um conjunto de ofertas com papéis (front, bump, upsell). As
            ofertas chegam da Greenn na próxima fase; por enquanto cadastre o nome, a
            categoria e o tipo.
          </p>
        </div>
        <Button render={<Link href="/configuracoes/funis/novo" />}>
          <Plus aria-hidden />
          Novo funil
        </Button>
      </div>

      {params.excluido ? (
        <Alert>
          <AlertDescription>Funil excluído.</AlertDescription>
        </Alert>
      ) : null}

      {totalFunis === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum funil ainda</CardTitle>
            <CardDescription>
              Comece pelo seu principal funil de front-end, por exemplo “Funil Desafio”.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {categorias
        .filter((c) => c.funis.length > 0)
        .map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {c.nome}
                {c.tem_semaforo ? <Badge variant="secondary">semáforo</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {c.funis.map((f) => (
                <Link
                  key={f.id}
                  href={`/configuracoes/funis/${f.id}`}
                  className="hover:bg-muted/50 -mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{f.nome}</span>
                      {!f.ativo ? <Badge variant="outline">arquivado</Badge> : null}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {ROTULO_TIPO_FUNIL[f.tipo]}
                      {f.tipo === "lancamento"
                        ? ` · ${formatarPeriodo(f.data_inicio, f.data_fim)}`
                        : ""}
                      {c.tem_semaforo
                        ? ` · meta de ROI ${formatarPercentual(f.meta_roi)}`
                        : ""}
                    </div>
                  </div>
                  <div className="text-muted-foreground shrink-0 text-sm">
                    {f.total_ofertas === 0
                      ? "sem ofertas"
                      : `${f.total_ofertas} oferta${f.total_ofertas > 1 ? "s" : ""}`}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
