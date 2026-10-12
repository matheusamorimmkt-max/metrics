import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormularioEsqueciSenha } from "./formulario";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default async function PaginaEsqueciSenha({
  searchParams,
}: PageProps<"/esqueci-senha">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>
          Informe o e-mail da sua conta. Você receberá um link para criar uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioEsqueciSenha email={email} />
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-muted-foreground text-sm underline">
          Voltar para o login
        </Link>
      </CardFooter>
    </Card>
  );
}
