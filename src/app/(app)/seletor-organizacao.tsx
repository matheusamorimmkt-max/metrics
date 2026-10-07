"use client";

import { useTransition } from "react";
import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { trocarOrganizacao } from "@/servidor/acoes/organizacao";
import type { Organizacao } from "@/servidor/sessao";

export function SeletorOrganizacao({
  atual,
  organizacoes,
}: {
  atual: string;
  organizacoes: Organizacao[];
}) {
  const [pendente, iniciar] = useTransition();
  const nomeAtual = organizacoes.find((o) => o.id === atual)?.nome ?? "Organização";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" disabled={pendente} />}
      >
        <span className="max-w-48 truncate">{nomeAtual}</span>
        <ChevronsUpDown aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {organizacoes.map((o) => (
          <DropdownMenuItem
            key={o.id}
            disabled={o.id === atual}
            onClick={() => iniciar(() => trocarOrganizacao(o.id))}
          >
            {o.nome}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
