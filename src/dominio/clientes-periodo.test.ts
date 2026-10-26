import { describe, expect, it } from "vitest";
import {
  montarDetalhesClientes,
  resumirCliente,
  topClientes,
  type ClientePeriodo,
} from "./clientes-periodo";

const ana: ClientePeriodo = {
  id: "a",
  nome: "Ana",
  email: "ana@x.com",
  telefone: "11 9999",
  primeira_compra_em: "2026-10-01T12:00:00Z",
  transacoes: [
    { id: "t2", inicio: "2026-10-10T12:00:00Z", ordem: 2, eh_recompra: true, itens: 1, valor: 50, produtos: ["Imersão"] },
    { id: "t1", inicio: "2026-10-01T12:00:00Z", ordem: 1, eh_recompra: false, itens: 2, valor: 100, produtos: ["E-book", "Bump"] },
  ],
};
const bia: ClientePeriodo = {
  id: "b",
  nome: "Bia",
  email: "bia@x.com",
  telefone: null,
  primeira_compra_em: "2026-10-15T12:00:00Z",
  transacoes: [
    { id: "t3", inicio: "2026-10-15T12:00:00Z", ordem: 1, eh_recompra: false, itens: 1, valor: 300, produtos: ["Combo"] },
  ],
};
const clientes = [ana, bia].map(resumirCliente);

describe("resumirCliente", () => {
  it("ordena as transações, soma itens e gasto e marca novo e recorrente", () => {
    const a = clientes[0];
    expect(a.transacoes.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(a.itens).toBe(3);
    expect(a.gasto).toBe(150);
    expect(a.ultima_compra).toBe("2026-10-10T12:00:00Z");
    expect(a.produtos_ultima).toEqual(["Imersão"]);
    expect(a.novo).toBe(true);
    expect(a.recorrente).toBe(true);
    expect(clientes[1].recorrente).toBe(false);
  });
});

describe("topClientes", () => {
  it("aplica cada critério", () => {
    expect(topClientes(clientes, "recentes").map((c) => c.id)).toEqual(["b", "a"]);
    expect(topClientes(clientes, "frequentes").map((c) => c.id)).toEqual(["a", "b"]);
    expect(topClientes(clientes, "maior_valor").map((c) => c.id)).toEqual(["b", "a"]);
    expect(topClientes(clientes, "maior_valor", 1)).toHaveLength(1);
  });
});

describe("montarDetalhesClientes", () => {
  const d = montarDetalhesClientes(clientes, { moeda: "BRL", fuso: "America/Sao_Paulo" });
  it("lista únicos, novos e recorrentes com total", () => {
    expect(d.clientes_unicos.tabela?.linhas).toHaveLength(3); // 2 clientes + total
    expect(d.clientes_unicos.tabela?.linhas[0].celulas[0].texto).toBe("Bia"); // maior gasto primeiro
    expect(d.clientes_novos.tabela?.linhas).toHaveLength(3);
    expect(d.recorrentes.tabela?.linhas).toHaveLength(2);
    expect(d.recorrentes.tabela?.linhas[0].celulas[0].detalhe).toBe("ana@x.com · 11 9999");
  });
  it("lista transações da mais recente para a mais antiga", () => {
    const linhas = d.transacoes.tabela!.linhas;
    expect(linhas).toHaveLength(4);
    expect(linhas[0].celulas[0].texto).toBe("Bia");
    expect(linhas[1].celulas[2].texto).toBe("Recompra");
    expect(linhas[2].celulas[0].detalhe).toBe("E-book, Bump");
    expect(linhas[3].celulas[0].texto).toBe("3 transações");
  });
  it("calcula o tempo até a recompra", () => {
    const linhas = d.tempo_recompra.tabela!.linhas;
    expect(linhas).toHaveLength(1);
    expect(linhas[0].celulas[3].texto).toBe("9 dias");
  });
  it("sem clientes devolve tabelas vazias", () => {
    const v = montarDetalhesClientes([], { moeda: "BRL", fuso: "UTC" });
    expect(v.clientes_unicos.tabela?.linhas).toEqual([]);
    expect(v.transacoes.tabela?.linhas).toEqual([]);
  });
});
