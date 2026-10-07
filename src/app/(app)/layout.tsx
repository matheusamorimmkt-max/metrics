import { obterContexto } from "@/servidor/sessao";
import { Navegacao } from "./navegacao";
import { Cabecalho } from "./cabecalho";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const contexto = await obterContexto();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-full flex-col border-b md:min-h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex h-14 items-center px-4">
          <span className="font-semibold tracking-tight">Painel de Funis</span>
        </div>
        <Navegacao />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Cabecalho contexto={contexto} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
