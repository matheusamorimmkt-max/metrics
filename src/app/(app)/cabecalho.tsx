import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sair } from "@/servidor/acoes/auth";
import type { Contexto } from "@/servidor/sessao";
import type { EstadoSincronizacao } from "@/servidor/consultas/sincronizacoes";
import { SeletorOrganizacao } from "./seletor-organizacao";
import { AtualizarAgora } from "./atualizar-agora";

export function Cabecalho({
  contexto,
  sincronizacao,
  temConector,
}: {
  contexto: Contexto;
  sincronizacao: EstadoSincronizacao;
  temConector: boolean;
}) {
  const { usuario, organizacao, organizacoes } = contexto;

  return (
    <header className="bg-background flex h-14 items-center justify-between gap-4 border-b px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {organizacoes.length > 1 ? (
          <SeletorOrganizacao atual={organizacao.id} organizacoes={organizacoes} />
        ) : (
          <span className="truncate font-medium">{organizacao.nome}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <AtualizarAgora
          estado={sincronizacao}
          fuso={organizacao.fuso_horario}
          temConector={temConector}
        />
        <span className="text-muted-foreground hidden truncate text-sm sm:inline">
          {usuario.email}
        </span>
        <form action={sair}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut aria-hidden />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
