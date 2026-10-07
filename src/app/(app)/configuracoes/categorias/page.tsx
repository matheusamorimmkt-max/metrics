import type { Metadata } from "next";
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
import { obterContexto } from "@/servidor/sessao";
import { listarCategorias } from "@/servidor/consultas/categorias";
import { NovaCategoria } from "./nova-categoria";
import { LinhaCategoria } from "./linha-categoria";

export const metadata: Metadata = { title: "Categorias" };

export default async function PaginaCategorias() {
  const { organizacao } = await obterContexto();
  const categorias = await listarCategorias(organizacao.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>
            Agrupam os funis na Home e nos filtros. Só funis de categorias com semáforo
            ligado mostram o sinal verde, amarelo ou vermelho de ROI (normalmente,
            Front-end).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-28 text-center">Funis</TableHead>
                <TableHead className="w-28 text-center">Semáforo</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((c, i) => (
                <LinhaCategoria
                  key={c.id}
                  categoria={c}
                  primeira={i === 0}
                  ultima={i === categorias.length - 1}
                />
              ))}
              {categorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    Nenhuma categoria. Crie a primeira abaixo.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NovaCategoria />
    </div>
  );
}
