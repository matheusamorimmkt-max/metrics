import { after } from "next/server";
import { obterContexto } from "@/servidor/sessao";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { obterEstadoSincronizacao } from "@/servidor/consultas/sincronizacoes";
import { dispararCicloSeNecessario } from "@/servidor/acoes/sincronizacao";
import { Navegacao } from "./navegacao";
import { Cabecalho } from "./cabecalho";

// Tudo aqui depende da sessão: nunca pré-renderizar.
export const dynamic = "force-dynamic";

/** Integrações que já têm conector e, portanto, participam do ciclo. */
const COM_CONECTOR = new Set(["meta", "greenn"]);

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const contexto = await obterContexto();
  const [integracoes, sincronizacao] = await Promise.all([
    listarIntegracoes(contexto.organizacao.id),
    obterEstadoSincronizacao(contexto.organizacao.id),
  ]);
  const temConector = Object.values(integracoes).some(
    (i) => COM_CONECTOR.has(i.tipo) && i.status !== "desconectada",
  );

  // Ao entrar: ciclo em segundo plano se a última atualização tem mais de 15 min.
  if (temConector) {
    after(() => dispararCicloSeNecessario(contexto.organizacao.id));
  }

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-full flex-col border-b md:min-h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex h-14 items-center px-4">
          <span className="font-semibold tracking-tight">Metric Analytics</span>
        </div>
        <Navegacao />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Cabecalho
          contexto={contexto}
          sincronizacao={sincronizacao}
          temConector={temConector}
        />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
