"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Selecao } from "@/components/formulario/selecao";
import {
  PAPEIS_OFERTA,
  ROTULO_PAPEL,
  type PapelOferta,
} from "@/dominio/schemas/funil-oferta";
import { vincularOfertasEmLote } from "@/servidor/acoes/funil-ofertas";
import type { OfertaResumo } from "@/servidor/consultas/ofertas";
import type { FunilOpcao } from "@/servidor/consultas/campanhas";
import { LinhaOferta } from "./linha-oferta";

/**
 * Tabela de ofertas com seleção em lote: marque várias, escolha funil e papel e
 * vincule todas de uma vez. Cada linha continua com os seletores próprios.
 */
export function TabelaOfertas({
  ofertas,
  funis,
  moeda,
}: {
  ofertas: OfertaResumo[];
  funis: FunilOpcao[];
  moeda: string;
}) {
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [funilId, setFunilId] = useState("");
  const [papel, setPapel] = useState<PapelOferta>("front");
  const [pendente, iniciar] = useTransition();

  const visiveis = useMemo(() => new Set(ofertas.map((o) => o.id)), [ofertas]);
  const marcadas = [...selecionadas].filter((id) => visiveis.has(id));
  const todasMarcadas = ofertas.length > 0 && marcadas.length === ofertas.length;

  function alternar(id: string, marcar: boolean) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (marcar) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarTodas(marcar: boolean) {
    setSelecionadas(marcar ? new Set(ofertas.map((o) => o.id)) : new Set());
  }

  function vincular() {
    if (!funilId || marcadas.length === 0) return;
    iniciar(async () => {
      const r = await vincularOfertasEmLote(marcadas, funilId, papel);
      if (!r.ok) {
        toast.error(r.erro ?? "Não foi possível vincular.");
        return;
      }
      toast.success(r.mensagem ?? "Ofertas vinculadas.", { duration: 8000 });
      setSelecionadas(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div
        className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center"
        aria-live="polite"
      >
        <span className="text-sm font-medium">
          {marcadas.length === 0
            ? "Marque ofertas para vincular várias de uma vez"
            : `${marcadas.length} ${marcadas.length === 1 ? "oferta selecionada" : "ofertas selecionadas"}`}
        </span>
        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <Selecao
            value={funilId}
            onChange={(e) => setFunilId(e.target.value)}
            disabled={pendente}
            aria-label="Funil para as ofertas selecionadas"
          >
            <option value="">Escolha o funil</option>
            {funis.map((f) => (
              <option key={f.id} value={f.id}>
                {f.categoria ? `${f.categoria} · ${f.nome}` : f.nome}
              </option>
            ))}
          </Selecao>
          <Selecao
            value={papel}
            onChange={(e) => setPapel(e.target.value as PapelOferta)}
            disabled={pendente}
            className="w-32"
            aria-label="Papel das ofertas selecionadas"
          >
            {PAPEIS_OFERTA.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </option>
            ))}
          </Selecao>
          <Button
            type="button"
            size="sm"
            onClick={vincular}
            disabled={pendente || !funilId || marcadas.length === 0}
          >
            {pendente ? "Vinculando…" : "Vincular selecionadas"}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={todasMarcadas}
                onChange={(e) => alternarTodas(e.target.checked)}
                aria-label="Selecionar todas as ofertas listadas"
                className="size-4"
              />
            </TableHead>
            <TableHead>Oferta</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Vendas este mês</TableHead>
            <TableHead className="text-right">Faturamento este mês</TableHead>
            <TableHead className="text-right">Vendas (total)</TableHead>
            <TableHead className="text-right">Faturamento (total)</TableHead>
            <TableHead className="w-72">Funil e papel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ofertas.map((o) => (
            <LinhaOferta
              key={o.id}
              oferta={o}
              funis={funis}
              moeda={moeda}
              selecionada={selecionadas.has(o.id)}
              aoSelecionar={(marcar) => alternar(o.id, marcar)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
