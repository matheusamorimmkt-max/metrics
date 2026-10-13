import { Award, Crown, Mail, Medal, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatarMetrica } from "@/dominio/metricas";
import type { ClienteDestaque } from "@/servidor/consultas/clientes";
import { cn } from "@/lib/utils";

const POSICOES = [
  { Icone: Crown, classe: "bg-amber-400 text-amber-950" },
  { Icone: Medal, classe: "bg-slate-300 text-slate-800" },
  { Icone: Award, classe: "bg-orange-500 text-white" },
];

/** Lista "Top 3" de clientes, com os dados de contato e o resumo de compras. */
export function DestaquesClientes({
  titulo,
  descricao,
  clientes,
  moeda,
  destaque,
  fuso,
}: {
  titulo: string;
  descricao: string;
  clientes: ClienteDestaque[];
  moeda: string;
  /** Qual número aparece em destaque (verde). */
  destaque: "gasto" | "transacoes" | "ultima_compra";
  fuso: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="text-muted-foreground text-sm">{descricao}</p>
      </div>
      {clientes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sem transações no período.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {clientes.map((c, i) => {
            const { Icone, classe } = POSICOES[i] ?? POSICOES[2];
            return (
              <Card key={c.id} size="sm">
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                        {i + 1}º cliente
                      </p>
                      <p className="truncate text-lg font-semibold" title={c.nome}>
                        {c.nome}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-md",
                        classe,
                      )}
                      aria-hidden
                    >
                      <Icone className="size-4" />
                    </span>
                  </div>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate" title={c.email}>
                        {c.email || "—"}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0" aria-hidden />
                      <span>{c.telefone || "—"}</span>
                    </li>
                  </ul>
                  <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-sm">
                    <Dado
                      rotulo="Transações"
                      valor={formatarMetrica(c.transacoes, "inteiro")}
                      ativo={destaque === "transacoes"}
                    />
                    <Dado rotulo="Itens" valor={formatarMetrica(c.itens, "inteiro")} />
                    {destaque === "ultima_compra" ? (
                      <Dado
                        rotulo="Última compra"
                        valor={new Date(c.ultima_compra).toLocaleDateString("pt-BR", {
                          timeZone: fuso,
                        })}
                        ativo
                      />
                    ) : (
                      <Dado
                        rotulo="Gasto total"
                        valor={formatarMetrica(c.gasto, "moeda", moeda)}
                        ativo={destaque === "gasto"}
                      />
                    )}
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Dado({
  rotulo,
  valor,
  ativo,
}: {
  rotulo: string;
  valor: string;
  ativo?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {rotulo}
      </dt>
      <dd
        className={cn("truncate font-semibold tabular-nums", ativo && "text-emerald-600")}
        title={valor}
      >
        {valor}
      </dd>
    </div>
  );
}
