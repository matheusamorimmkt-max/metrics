import type { Metadata } from "next";
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
import { FormAcao } from "@/components/formulario/form-acao";
import { obterContexto } from "@/servidor/sessao";
import { listarMembros } from "@/servidor/consultas/membros";
import { removerMembro } from "@/servidor/acoes/membros";
import { Convidar } from "./convidar";

export const metadata: Metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const { organizacao, usuario } = await obterContexto();
  const membros = await listarMembros(organizacao.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuários de {organizacao.nome}</CardTitle>
          <CardDescription>
            Todos têm o mesmo papel (diretor) e veem os mesmos dados. Quem é removido
            perde o acesso na hora, mas a conta continua existindo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-36">Situação</TableHead>
                <TableHead className="w-32">Desde</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membros.map((m) => {
                const souEu = m.user_id === usuario.id;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.email}
                      {souEu ? (
                        <span className="text-muted-foreground"> (você)</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {m.confirmado ? (
                        <Badge variant="secondary">ativo</Badge>
                      ) : (
                        <Badge variant="outline">convite pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString("pt-BR", {
                        timeZone: organizacao.fuso_horario,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <FormAcao acao={removerMembro}>
                        <input type="hidden" name="id" value={m.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          disabled={souEu || membros.length === 1}
                          title={souEu ? "Você não pode remover a si mesmo." : undefined}
                        >
                          Remover
                        </Button>
                      </FormAcao>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Convidar />
    </div>
  );
}
