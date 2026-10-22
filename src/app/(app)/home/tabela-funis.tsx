import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMetrica, type Metricas } from "@/dominio/metricas";
import type { ResumoCategoria, Semaforo } from "@/servidor/consultas/home";
import { cn } from "@/lib/utils";

const COR_SEMAFORO: Record<NonNullable<Semaforo>, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-400",
  vermelho: "bg-red-500",
};

function Bolinha({ semaforo }: { semaforo: Semaforo }) {
  if (!semaforo) return null;
  const titulo = {
    verde: "Dentro do esperado: ROI das últimas 48 horas acima da meta",
    amarelo: "Atenção: ROI das últimas 48 horas entre 0% e a meta",
    vermelho: "Abaixo do esperado: ROI das últimas 48 horas negativo",
  }[semaforo];
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", COR_SEMAFORO[semaforo])}
      title={titulo}
      aria-label={`Notificação: ${titulo}`}
    />
  );
}

function Celulas({ m, moeda }: { m: Metricas; moeda: string }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(m.investimento, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(m.faturamento_bruto, "moeda", moeda)}
      </TableCell>
      <TableCell
        className={cn("text-right tabular-nums", m.lucro < 0 && "text-destructive")}
      >
        {formatarMetrica(m.lucro, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(m.roas, "multiplicador")}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(m.roi, "multiplicador")}
      </TableCell>
    </>
  );
}

/** Tabela por categoria e funil, com a notificação de desempenho nos funis de Front-end. */
export function TabelaFunis({
  categorias,
  moeda,
  base = "/",
}: {
  categorias: ResumoCategoria[];
  moeda: string;
  /** "/" = links filtram a Home; "/funis" = links abrem a página do funil. */
  base?: string;
}) {
  if (categorias.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum funil cadastrado.{" "}
        <Link href="/configuracoes/funis" className="underline underline-offset-4">
          Cadastrar funis
        </Link>
        .
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoria / funil</TableHead>
          <TableHead className="text-right">Investimento</TableHead>
          <TableHead className="text-right">Faturamento</TableHead>
          <TableHead className="text-right">Lucro</TableHead>
          <TableHead className="text-right">ROAS</TableHead>
          <TableHead className="text-right">ROI</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categorias.map((c) => (
          <CategoriaLinhas
            key={c.id ?? "nao-vinculado"}
            categoria={c}
            moeda={moeda}
            base={base}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function CategoriaLinhas({
  categoria,
  moeda,
  base,
}: {
  categoria: ResumoCategoria;
  moeda: string;
  base: string;
}) {
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell className="font-semibold">
          {categoria.id ? (
            <Link href={`/?filtro=categoria:${categoria.id}`} className="hover:underline">
              {categoria.nome}
            </Link>
          ) : (
            categoria.nome
          )}
        </TableCell>
        <Celulas m={categoria.metricas} moeda={moeda} />
      </TableRow>
      {categoria.funis.map((f) => (
        <TableRow key={f.funil?.id ?? "nao-vinculado"}>
          <TableCell className="pl-8">
            <span className="flex items-center gap-2">
              <Bolinha semaforo={f.semaforo} />
              {f.funil ? (
                <Link
                  href={
                    base === "/"
                      ? `/?filtro=funil:${f.funil.id}`
                      : `${base}/${f.funil.id}`
                  }
                  className="hover:underline"
                >
                  {f.funil.nome}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  Campanhas e ofertas sem funil
                </span>
              )}
            </span>
          </TableCell>
          <Celulas m={f.metricas} moeda={moeda} />
        </TableRow>
      ))}
    </>
  );
}
