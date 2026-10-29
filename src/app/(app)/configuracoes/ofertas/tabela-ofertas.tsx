"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatarMetrica } from "@/dominio/metricas";
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
type Vinculo = "todas" | "nao_vinculadas" | "vinculadas";

type Filtros = {
  nome: string;
  vinculo: Vinculo;
  /** Caixas "Vendas este mês": com e sem. Nenhuma ou as duas marcadas = todas. */
  comVendasMes: boolean;
  semVendasMes: boolean;
  precoMin: string;
  precoMax: string;
  produto: string;
  funil: string;
};

const ROTULO_VINCULO: Record<Vinculo, string> = {
  todas: "Todas",
  nao_vinculadas: "Só não vinculadas",
  vinculadas: "Só vinculadas",
};

function numeroOuNulo(texto: string): number | null {
  const n = Number(texto.replace(",", "."));
  return texto.trim() === "" || Number.isNaN(n) ? null : n;
}

export function TabelaOfertas({
  ofertas,
  funis,
  moeda,
  vinculoInicial = "todas",
}: {
  ofertas: OfertaResumo[];
  funis: FunilOpcao[];
  moeda: string;
  /** Vem da URL (?filtro=nao_vinculadas), para os links antigos continuarem valendo. */
  vinculoInicial?: Vinculo;
}) {
  const router = useRouter();
  const semFiltros: Filtros = {
    nome: "",
    vinculo: vinculoInicial,
    comVendasMes: false,
    semVendasMes: false,
    precoMin: "",
    precoMax: "",
    produto: "",
    funil: "",
  };
  const [filtros, setFiltros] = useState<Filtros>(semFiltros);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [funilId, setFunilId] = useState("");
  const [papel, setPapel] = useState<PapelOferta>("front");
  const [pendente, iniciar] = useTransition();

  const produtos = useMemo(
    () => [...new Set(ofertas.map((o) => o.produto_nome))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [ofertas],
  );

  // Filtros só na tela: nome (oferta, produto ou id), vínculo, movimento do mês, preço, produto, funil.
  const filtradas = useMemo(() => {
    const termo = filtros.nome.trim().toLowerCase();
    const min = numeroOuNulo(filtros.precoMin);
    const max = numeroOuNulo(filtros.precoMax);
    return ofertas.filter((o) => {
      if (filtros.vinculo === "nao_vinculadas" && o.funil_id) return false;
      if (filtros.vinculo === "vinculadas" && !o.funil_id) return false;
      const vendeuNoMes = o.vendas_mes > 0 || o.faturamento_mes > 0;
      if (filtros.comVendasMes !== filtros.semVendasMes) {
        if (filtros.comVendasMes && !vendeuNoMes) return false;
        if (filtros.semVendasMes && vendeuNoMes) return false;
      }
      if (min !== null && o.preco < min) return false;
      if (max !== null && o.preco > max) return false;
      if (filtros.produto && o.produto_nome !== filtros.produto) return false;
      if (filtros.funil && o.funil_id !== filtros.funil) return false;
      if (!termo) return true;
      return (
        o.nome.toLowerCase().includes(termo) ||
        o.produto_nome.toLowerCase().includes(termo) ||
        o.id_externo.toLowerCase().includes(termo)
      );
    });
  }, [ofertas, filtros]);

  const chips: { chave: keyof Filtros; rotulo: string }[] = [];
  if (filtros.vinculo !== "todas") chips.push({ chave: "vinculo", rotulo: ROTULO_VINCULO[filtros.vinculo] });
  if (filtros.comVendasMes) chips.push({ chave: "comVendasMes", rotulo: "Com vendas este mês" });
  if (filtros.semVendasMes) chips.push({ chave: "semVendasMes", rotulo: "Sem vendas este mês" });
  if (numeroOuNulo(filtros.precoMin) !== null)
    chips.push({
      chave: "precoMin",
      rotulo: `Preço a partir de ${formatarMetrica(numeroOuNulo(filtros.precoMin)!, "moeda", moeda)}`,
    });
  if (numeroOuNulo(filtros.precoMax) !== null)
    chips.push({
      chave: "precoMax",
      rotulo: `Preço até ${formatarMetrica(numeroOuNulo(filtros.precoMax)!, "moeda", moeda)}`,
    });
  if (filtros.produto) chips.push({ chave: "produto", rotulo: `Produto: ${filtros.produto}` });
  if (filtros.funil)
    chips.push({
      chave: "funil",
      rotulo: `Funil: ${funis.find((f) => f.id === filtros.funil)?.nome ?? ""}`,
    });
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
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={filtros.nome}
          onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
          placeholder="Buscar por oferta, produto ou ID"
          aria-label="Buscar oferta"
          className="w-full sm:w-72"
        />
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            <SlidersHorizontal data-icon="inline-start" />
            Filtros
            {chips.length ? (
              <Badge variant="secondary" className="ml-1">
                {chips.length}
              </Badge>
            ) : null}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filtrar ofertas</DialogTitle>
              <DialogDescription>Os filtros valem para a lista e para a seleção em lote.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Vendas este mês</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={filtros.comVendasMes}
                    onChange={(e) => setFiltros({ ...filtros, comVendasMes: e.target.checked })}
                  />
                  Com vendas este mês
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={filtros.semVendasMes}
                    onChange={(e) => setFiltros({ ...filtros, semVendasMes: e.target.checked })}
                  />
                  Sem vendas este mês
                </label>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="filtro-preco-min">Preço a partir de</Label>
                  <Input
                    id="filtro-preco-min"
                    inputMode="decimal"
                    placeholder="0"
                    value={filtros.precoMin}
                    onChange={(e) => setFiltros({ ...filtros, precoMin: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filtro-preco-max">Preço até</Label>
                  <Input
                    id="filtro-preco-max"
                    inputMode="decimal"
                    placeholder="Sem limite"
                    value={filtros.precoMax}
                    onChange={(e) => setFiltros({ ...filtros, precoMax: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtro-produto">Produto</Label>
                <Selecao
                  id="filtro-produto"
                  value={filtros.produto}
                  onChange={(e) => setFiltros({ ...filtros, produto: e.target.value })}
                >
                  <option value="">Qualquer produto</option>
                  {produtos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Selecao>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtro-vinculo">Vínculo</Label>
                <Selecao
                  id="filtro-vinculo"
                  value={filtros.vinculo}
                  onChange={(e) => setFiltros({ ...filtros, vinculo: e.target.value as Vinculo })}
                >
                  {(Object.keys(ROTULO_VINCULO) as Vinculo[]).map((v) => (
                    <option key={v} value={v}>
                      {ROTULO_VINCULO[v]}
                    </option>
                  ))}
                </Selecao>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtro-funil">Funil</Label>
                <Selecao
                  id="filtro-funil"
                  value={filtros.funil}
                  onChange={(e) => setFiltros({ ...filtros, funil: e.target.value })}
                >
                  <option value="">Qualquer funil</option>
                  {funis.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.categoria ? `${f.categoria} · ${f.nome}` : f.nome}
                    </option>
                  ))}
                </Selecao>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFiltros({ ...semFiltros, nome: filtros.nome, vinculo: "todas" })}
                disabled={chips.length === 0}
              >
                Limpar filtros
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {chips.map((chip) => (
          <button
            key={chip.chave}
            type="button"
            onClick={() =>
              setFiltros({
                ...filtros,
                [chip.chave]:
                  chip.chave === "vinculo"
                    ? "todas"
                    : chip.chave === "comVendasMes" || chip.chave === "semVendasMes"
                      ? false
                      : "",
              })
            }
            className="bg-muted hover:bg-muted/70 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            title="Remover este filtro"
          >
            {chip.rotulo}
            <X className="size-3" aria-hidden />
          </button>
        ))}
        <span className="text-muted-foreground ml-auto text-sm">
          {filtradas.length} de {ofertas.length} ofertas
        </span>
      </div>
      {(chips.length > 0 || filtros.nome.trim()) && filtradas.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma oferta com esses filtros.</p>
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
            <TableHead className="min-w-72">Funil e papel</TableHead>
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
