import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sair } from "@/servidor/acoes/auth";
import type { Contexto } from "@/servidor/sessao";
import { SeletorOrganizacao } from "./seletor-organizacao";

export function Cabecalho({ contexto }: { contexto: Contexto }) {
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
