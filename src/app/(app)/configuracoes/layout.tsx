import { redirect } from "next/navigation";
import { obterContexto } from "@/servidor/sessao";

/** Configurações é só para administradores; visualizador volta para a Home. */
export default async function LayoutConfiguracoes({ children }: LayoutProps<"/configuracoes">) {
  const { podeEditar } = await obterContexto();
  if (!podeEditar) redirect("/");
  return <div className="mx-auto max-w-4xl space-y-6">{children}</div>;
}
