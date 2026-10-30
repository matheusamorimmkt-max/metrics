import { describe, expect, it } from "vitest";
import { agruparAscensao, montarDetalheAscensao, type VendaAscensao } from "@/dominio/ascensao";
import { formatarMetrica } from "@/dominio/metricas";

const moeda = (v: number) => formatarMetrica(v, "moeda", "BRL");

const vendas: VendaAscensao[] = [
  { cliente_id: "a", valor: 100, produto: "Curso", categoria: "Back-end", categoria_ordem: 2 },
  { cliente_id: "a", valor: 50, produto: "Bump", categoria: "Back-end", categoria_ordem: 2 },
  { cliente_id: "b", valor: 100, produto: "Curso", categoria: "Back-end", categoria_ordem: 2 },
  { cliente_id: "a", valor: 7500, produto: "Mentoria", categoria: "High-end", categoria_ordem: 3 },
];

describe("ascensão", () => {
  it("conta cada cliente uma vez por produto e por categoria, em ordem de categoria", () => {
    const g = agruparAscensao(vendas);
    expect(g.map((c) => [c.categoria, c.clientes, c.receita])).toEqual([
      ["Back-end", 2, 250],
      ["High-end", 1, 7500],
    ]);
    expect(g[0].produtos.map((p) => [p.produto, p.clientes, p.receita])).toEqual([
      ["Curso", 2, 200],
      ["Bump", 1, 50],
    ]);
  });

  it("monta a tabela com % sobre os clientes do funil e total", () => {
    const d = montarDetalheAscensao(vendas, 10, "BRL");
    const linhas = d.tabela!.linhas;
    expect(linhas[0].grupo).toBe(true);
    expect(linhas[0].celulas.map((c) => c.texto)).toEqual(["Back-end", "2", "20,0%", moeda(250)]);
    expect(linhas.at(-1)!.total).toBe(true);
    expect(linhas.at(-1)!.celulas.map((c) => c.texto)).toEqual(["Total", "2", "20,0%", moeda(7750)]);
    expect(montarDetalheAscensao([], 0, "BRL").tabela!.linhas).toEqual([]);
  });
});
