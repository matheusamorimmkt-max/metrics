"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ABAS = [
  { href: "/configuracoes", rotulo: "Geral", exato: true },
  { href: "/configuracoes/categorias", rotulo: "Categorias" },
  { href: "/configuracoes/funis", rotulo: "Funis" },
  { href: "/configuracoes/usuarios", rotulo: "Usuários" },
  { href: "/configuracoes/integracoes", rotulo: "Integrações" },
];

export function SubNavegacao() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções de configurações" className="border-b">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {ABAS.map((aba) => {
          const ativo = aba.exato
            ? pathname === aba.href
            : pathname === aba.href || pathname.startsWith(`${aba.href}/`);
          return (
            <li key={aba.href}>
              <Link
                href={aba.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-3 py-2 text-sm whitespace-nowrap",
                  ativo
                    ? "border-primary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
