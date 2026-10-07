"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/", rotulo: "Home", icone: Home },
  {
    href: "/configuracoes",
    rotulo: "Configurações",
    icone: Settings,
    filhos: [
      { href: "/configuracoes", rotulo: "Geral" },
      { href: "/configuracoes/categorias", rotulo: "Categorias" },
      { href: "/configuracoes/funis", rotulo: "Funis" },
      { href: "/configuracoes/usuarios", rotulo: "Usuários" },
      { href: "/configuracoes/integracoes", rotulo: "Integrações" },
    ],
  },
] as const;

function ativo(pathname: string, href: string, exato: boolean) {
  return exato ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function Navegacao() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4"
    >
      {ITENS.map((item) => {
        const Icone = item.icone;
        const estaAtivo = ativo(pathname, item.href, item.href === "/");
        return (
          <div key={item.href} className="shrink-0 md:shrink">
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                estaAtivo
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
              )}
            >
              <Icone className="size-4" aria-hidden />
              {item.rotulo}
            </Link>
            {"filhos" in item && estaAtivo ? (
              <ul className="mt-1 hidden space-y-0.5 pl-9 md:block">
                {item.filhos.map((filho) => {
                  const filhoAtivo = ativo(
                    pathname,
                    filho.href,
                    filho.href === "/configuracoes",
                  );
                  return (
                    <li key={filho.href}>
                      <Link
                        href={filho.href}
                        className={cn(
                          "block rounded-md px-2 py-1 text-sm",
                          filhoAtivo
                            ? "text-sidebar-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                        )}
                      >
                        {filho.rotulo}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
