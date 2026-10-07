import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exigirUsuario } from "@/servidor/sessao";
import { FormularioDefinirSenha } from "./formulario";

export const metadata: Metadata = { title: "Definir senha" };

export default async function PaginaDefinirSenha() {
  const usuario = await exigirUsuario();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defina sua senha</CardTitle>
        <CardDescription>
          Conta <strong>{usuario.email}</strong>. Escolha a senha que você usará para
          entrar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioDefinirSenha />
      </CardContent>
    </Card>
  );
}
