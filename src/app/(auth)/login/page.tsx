import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const proximo = typeof params.proximo === "string" ? params.proximo : undefined;
  const erroExterno = typeof params.erro === "string" ? params.erro : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Use o e-mail e a senha da sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioLogin proximo={proximo} erroExterno={erroExterno} />
      </CardContent>
    </Card>
  );
}
