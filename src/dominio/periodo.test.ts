import { describe, expect, it } from "vitest";
import { hojeNoFuso, resolverPeriodo } from "./periodo";

// 2026-10-13 01:30 UTC = 2026-10-12 22:30 em São Paulo
const AGORA = new Date("2026-10-13T01:30:00Z");

describe("hojeNoFuso", () => {
  it("usa o dia do fuso da organização, não o UTC", () => {
    expect(hojeNoFuso("America/Sao_Paulo", AGORA)).toBe("2026-10-12");
    expect(hojeNoFuso("UTC", AGORA)).toBe("2026-10-13");
  });
});

describe("resolverPeriodo", () => {
  const fuso = "America/Sao_Paulo";

  it("padrão é 30 dias terminando hoje, com período anterior de mesmo tamanho", () => {
    const p = resolverPeriodo(fuso, {}, AGORA);
    expect(p).toMatchObject({
      chave: "30d",
      de: "2026-09-13",
      ate: "2026-10-12",
      anterior_de: "2026-08-14",
      anterior_ate: "2026-09-12",
      dias: 30,
    });
  });

  it("este mês e mês passado", () => {
    expect(resolverPeriodo(fuso, { periodo: "mes" }, AGORA)).toMatchObject({
      de: "2026-10-01",
      ate: "2026-10-12",
    });
    expect(resolverPeriodo(fuso, { periodo: "mes_anterior" }, AGORA)).toMatchObject({
      de: "2026-09-01",
      ate: "2026-09-30",
      anterior_de: "2026-08-02",
      anterior_ate: "2026-08-31",
    });
  });

  it("personalizado aceita datas e corrige ordem invertida", () => {
    const p = resolverPeriodo(
      fuso,
      { periodo: "personalizado", de: "2026-09-10", ate: "2026-09-01" },
      AGORA,
    );
    expect(p).toMatchObject({ de: "2026-09-01", ate: "2026-09-10", dias: 10 });
  });

  it("parâmetro desconhecido cai no padrão", () => {
    expect(resolverPeriodo(fuso, { periodo: "x" }, AGORA).chave).toBe("30d");
  });
});
