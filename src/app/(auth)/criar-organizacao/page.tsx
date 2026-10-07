import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exigirUsuario, listarOrganizacoesDoUsuario } from "@/servidor/sessao";
import { FormularioCriarOrganizacao } from "./formulario";

export const metadata: Metadata = { title: "Criar organização" };

export default async function PaginaCriarOrganizacao() {
  const usuario = await exigirUsuario();
  const organizacoes = await listarOrganizacoesDoUsuario();
  if (organizacoes.length > 0) redirect("/");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bem-vindo</CardTitle>
        <CardDescription>
          Você entrou como <strong>{usuario.email}</strong>, mas ainda não faz parte de
          nenhuma empresa. Crie a sua para começar. Se a sua empresa já existe, peça a um
          diretor que convide você.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioCriarOrganizacao />
      </CardContent>
    </Card>
  );
}
