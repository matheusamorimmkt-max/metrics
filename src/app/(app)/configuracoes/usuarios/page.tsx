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
import { DESCRICAO_PAPEL, ROTULO_PAPEL, papelDe } from "@/dominio/papeis";
import { obterContexto } from "@/servidor/sessao";
import { listarMembros } from "@/servidor/consultas/membros";
import { removerMembro } from "@/servidor/acoes/membros";
import { Convidar } from "./convidar";
import { SeletorPapel } from "./seletor-papel";

export const metadata: Metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const { organizacao, usuario } = await obterContexto();
  const membros = await listarMembros(organizacao.id);
  const administradores = membros.filter((m) => papelDe(m.papel) === "administrador").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuários de {organizacao.nome}</CardTitle>
          <CardDescription>
            {ROTULO_PAPEL.administrador}: {DESCRICAO_PAPEL.administrador}{" "}
            {ROTULO_PAPEL.visualizador}: {DESCRICAO_PAPEL.visualizador} Quem é removido
            perde o acesso na hora, mas a conta continua existindo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-44">Papel</TableHead>
                <TableHead className="w-36">Situação</TableHead>
                <TableHead className="w-32">Desde</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membros.map((m) => {
                const souEu = m.user_id === usuario.id;
                const papel = papelDe(m.papel);
                const ultimoAdministrador = papel === "administrador" && administradores === 1;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.email}
                      {souEu ? (
                        <span className="text-muted-foreground"> (você)</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <SeletorPapel
                        membroId={m.id}
                        papel={papel}
                        travado={ultimoAdministrador}
                        motivo={
                          ultimoAdministrador
                            ? "Único administrador: promova outra pessoa antes."
                            : undefined
                        }
                      />
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
                          disabled={souEu || membros.length === 1 || ultimoAdministrador}
                          title={
                            souEu
                              ? "Você não pode remover a si mesmo."
                              : ultimoAdministrador
                                ? "Único administrador: promova outra pessoa antes."
                                : undefined
                          }
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
