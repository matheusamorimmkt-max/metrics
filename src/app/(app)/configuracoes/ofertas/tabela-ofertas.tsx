"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [funilId, setFunilId] = useState("");
  const [papel, setPapel] = useState<PapelOferta>("front");
  const [pendente, iniciar] = useTransition();

  // Filtro por nome (oferta, produto ou id no gateway), só na tela.
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ofertas;
    return ofertas.filter(
      (o) =>
        o.nome.toLowerCase().includes(termo) ||
        o.produto_nome.toLowerCase().includes(termo) ||
        o.id_externo.toLowerCase().includes(termo),
    );
  }, [ofertas, busca]);
  const idsVisiveis = useMemo(() => new Set(filtradas.map((o) => o.id)), [filtradas]);
  const marcadas = [...selecionadas].filter((id) => idsVisiveis.has(id));
  const todasMarcadas = filtradas.length > 0 && marcadas.length === filtradas.length;

  function alternar(id: string, marcar: boolean) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (marcar) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarTodas(marcar: boolean) {
    setSelecionadas(marcar ? new Set(filtradas.map((o) => o.id)) : new Set());
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
    <div className="space-y-3 pb-24">
      <Input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Filtrar por nome da oferta, produto ou ID"
        aria-label="Filtrar ofertas"
        className="md:max-w-md"
      />
      {busca && filtradas.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma oferta com esse nome.</p>
      ) : null}

      {marcadas.length > 0 ? (
        <div
          role="region"
          aria-label="Vincular ofertas selecionadas"
          aria-live="polite"
          className="bg-card fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 flex-col gap-2 rounded-lg border p-3 shadow-lg md:flex-row md:items-center"
        >
          <span className="text-sm font-medium">
            {marcadas.length} {marcadas.length === 1 ? "oferta selecionada" : "ofertas selecionadas"}
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
              disabled={pendente || !funilId}
            >
              {pendente ? "Vinculando…" : "Vincular selecionadas"}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setSelecionadas(new Set())}
              aria-label="Limpar seleção"
              title="Limpar seleção"
            >
              <X aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

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
          {filtradas.map((o) => (
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
