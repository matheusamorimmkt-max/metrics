import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormularioRecuperarSenha } from "./formulario";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function PaginaRecuperarSenha() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova
          senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioRecuperarSenha />
      </CardContent>
    </Card>
  );
}
