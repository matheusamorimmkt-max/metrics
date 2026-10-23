"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  Filter,
  Home,
  Megaphone,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/", rotulo: "Home", icone: Home },
  { href: "/funis", rotulo: "Funis", icone: Filter },
  { href: "/trafego", rotulo: "Tráfego", icone: Megaphone },
  { href: "/vendas", rotulo: "Vendas", icone: ShoppingCart },
  { href: "/clientes", rotulo: "Clientes", icone: Users },
  {
    href: "/configuracoes",
    rotulo: "Configurações",
    icone: Settings,
    filhos: [
      { href: "/configuracoes", rotulo: "Geral" },
      { href: "/configuracoes/categorias", rotulo: "Categorias" },
      { href: "/configuracoes/funis", rotulo: "Funis" },
      { href: "/configuracoes/produtos", rotulo: "Produtos" },
      { href: "/configuracoes/ofertas", rotulo: "Ofertas" },
      { href: "/configuracoes/campanhas", rotulo: "Campanhas" },
      { href: "/configuracoes/usuarios", rotulo: "Usuários" },
      { href: "/configuracoes/integracoes", rotulo: "Integrações" },
    ],
  },
] as const;

function ativo(pathname: string, href: string, exato: boolean) {
  return exato ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function Navegacao({ podeEditar }: { podeEditar: boolean }) {
  const pathname = usePathname();
  // O grupo Configurações abre sozinho quando a rota está dentro dele; o usuário pode
  // recolher ou abrir à mão, e essa escolha vale até a rota mudar.
  const [manual, setManual] = useState<{ pathname: string; aberto: boolean } | null>(
    null,
  );

  return (
    <nav
      aria-label="Principal"
      className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4"
    >
      {ITENS.filter((item) => podeEditar || item.href !== "/configuracoes").map((item) => {
        const Icone = item.icone;
        const estaAtivo = ativo(pathname, item.href, item.href === "/");
        const temFilhos = "filhos" in item;
        const aberto =
          temFilhos && (manual?.pathname === pathname ? manual.aberto : estaAtivo);
        return (
          <div key={item.href} className="shrink-0 md:shrink">
            <div
              className={cn(
                "flex items-center rounded-md text-sm font-medium",
                estaAtivo
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
              )}
            >
              <Link href={item.href} className="flex flex-1 items-center gap-2 px-3 py-2">
                <Icone className="size-4" aria-hidden />
                {item.rotulo}
              </Link>
              {temFilhos ? (
                <button
                  type="button"
                  onClick={() => setManual({ pathname, aberto: !aberto })}
                  aria-expanded={aberto}
                  aria-controls="menu-configuracoes"
                  aria-label={aberto ? "Recolher configurações" : "Abrir configurações"}
                  className="hover:bg-sidebar-accent flex h-9 w-8 items-center justify-center rounded-r-md"
                >
                  <ChevronDown
                    className={cn("size-4 transition-transform", aberto && "rotate-180")}
                    aria-hidden
                  />
                </button>
              ) : null}
            </div>
            {temFilhos ? (
              <ul
                id="menu-configuracoes"
                className={cn(
                  "mt-1 space-y-0.5 pl-9",
                  // No celular a navegação é uma faixa horizontal: as seções ficam lado a lado.
                  aberto ? "flex gap-1 md:flex-col md:gap-0" : "hidden",
                )}
              >
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
                          "block rounded-md px-2 py-1 text-sm whitespace-nowrap",
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
