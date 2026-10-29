import { describe, expect, it } from "vitest";
import {
  escreverSelecao,
  lerSelecao,
  pertenceAoFiltro,
  resolverFiltro,
  rotuloSelecao,
} from "@/dominio/filtro-home";

const funis = [
  { id: "f1", nome: "Funil 1", categoria_id: "c1" },
  { id: "f2", nome: "Funil 2", categoria_id: "c1" },
  { id: "f3", nome: "Funil 3", categoria_id: "c2" },
];
const categorias = [
  { id: "c1", nome: "Front-end" },
  { id: "c2", nome: "Back-end" },
];

describe("filtro da Home", () => {
  it("lê e escreve a seleção na URL, aceitando o formato antigo", () => {
    expect(lerSelecao("funil:f1")).toEqual({ categorias: [], funis: ["f1"] });
    expect(lerSelecao("categoria:c1,funil:f3,funil:f3,lixo")).toEqual({
      categorias: ["c1"],
      funis: ["f3"],
    });
    expect(escreverSelecao({ categorias: ["c2"], funis: ["f1"] })).toBe("categoria:c2,funil:f1");
    expect(lerSelecao(undefined)).toEqual({ categorias: [], funis: [] });
  });

  it("expande categorias em funis e vazio é o negócio inteiro", () => {
    expect(resolverFiltro({ categorias: [], funis: [] }, funis)).toEqual({ tipo: "negocio" });
    const f = resolverFiltro({ categorias: ["c1"], funis: ["f3"] }, funis);
    expect(f.tipo).toBe("funis");
    expect(pertenceAoFiltro(f, "f1")).toBe(true);
    expect(pertenceAoFiltro(f, "f2")).toBe(true);
    expect(pertenceAoFiltro(f, "f3")).toBe(true);
    expect(pertenceAoFiltro(f, null)).toBe(false);
    const so3 = resolverFiltro({ categorias: [], funis: ["f3"] }, funis);
    expect(pertenceAoFiltro(so3, "f1")).toBe(false);
    expect(pertenceAoFiltro({ tipo: "negocio" }, null)).toBe(true);
  });

  it("monta o título", () => {
    expect(rotuloSelecao({ categorias: [], funis: [] }, categorias, funis)).toBe("Negócio inteiro");
    expect(rotuloSelecao({ categorias: ["c1"], funis: ["f3"] }, categorias, funis)).toBe(
      "Front-end · Funil 3",
    );
    expect(
      rotuloSelecao({ categorias: ["c1", "c2"], funis: ["f1", "f2"] }, categorias, funis),
    ).toBe("Front-end · Back-end e mais 2");
  });
});
