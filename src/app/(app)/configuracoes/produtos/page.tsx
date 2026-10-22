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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { obterContexto } from "@/servidor/sessao";
import { listarProdutos } from "@/servidor/consultas/produtos";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { LinhaProduto } from "./linha-produto";
import type { BaseImposto } from "@/dominio/schemas/produto";

export const metadata: Metadata = { title: "Produtos" };

export default async function PaginaProdutos() {
  const { organizacao } = await obterContexto();
  const [produtos, integracoes] = await Promise.all([
    listarProdutos(organizacao.id),
    listarIntegracoes(organizacao.id),
  ]);
  const greenn = integracoes.greenn;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
        <CardDescription>
          Importados do gateway. Todos seguem o imposto padrão do negócio (Configurações →
          Geral); aqui você personaliza só os produtos que têm alíquota diferente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {produtos.length === 0 ? (
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
                para importar os produtos.
              </>
            ) : (
              "Nenhum produto importado ainda. A primeira sincronização da Greenn traz os produtos para cá."
            )}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Ofertas</TableHead>
                <TableHead className="text-center">Vendas 30 dias</TableHead>
                <TableHead>Imposto</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => (
                <LinhaProduto
                  key={p.id}
                  produto={p}
                  padrao={{
                    aliquota: organizacao.aliquota_imposto,
                    base: organizacao.base_imposto as BaseImposto,
                  }}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
