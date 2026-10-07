import { describe, expect, it } from "vitest";
import { schemaConfiguracoesGerais, schemaCriarOrganizacao } from "./organizacao";

describe("schemaCriarOrganizacao", () => {
  it("apara espaços e exige nome", () => {
    expect(schemaCriarOrganizacao.parse({ nome: "  Empresa A  " }).nome).toBe(
      "Empresa A",
    );
    expect(schemaCriarOrganizacao.safeParse({ nome: "   " }).success).toBe(false);
  });
});

describe("schemaConfiguracoesGerais", () => {
  const valido = {
    nome: "Empresa A",
    taxa_anuncios: 0.1215,
    janela_transacao_min: 5,
    fuso_horario: "America/Sao_Paulo",
    moeda: "brl",
  };

  it("aceita os padrões e normaliza a moeda", () => {
    const r = schemaConfiguracoesGerais.parse(valido);
    expect(r.moeda).toBe("BRL");
  });

  it("taxa é fração entre 0 e 1 (12,15% = 0.1215, nunca 12.15)", () => {
    expect(
      schemaConfiguracoesGerais.safeParse({ ...valido, taxa_anuncios: 12.15 }).success,
    ).toBe(false);
    expect(
      schemaConfiguracoesGerais.safeParse({ ...valido, taxa_anuncios: 0 }).success,
    ).toBe(true);
  });

  it("janela é inteiro entre 1 e 1440 minutos", () => {
    expect(
      schemaConfiguracoesGerais.safeParse({ ...valido, janela_transacao_min: 0 }).success,
    ).toBe(false);
    expect(
      schemaConfiguracoesGerais.safeParse({ ...valido, janela_transacao_min: 2.5 })
        .success,
    ).toBe(false);
    expect(
      schemaConfiguracoesGerais.safeParse({ ...valido, janela_transacao_min: 1441 })
        .success,
    ).toBe(false);
  });
});
