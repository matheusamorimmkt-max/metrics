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

  it("padrão é este mês, com período anterior de mesmo tamanho", () => {
    const p = resolverPeriodo(fuso, {}, AGORA);
    expect(p).toMatchObject({
      chave: "mes",
      de: "2026-10-01",
      ate: "2026-10-12",
      anterior_de: "2026-09-19",
      anterior_ate: "2026-09-30",
      dias: 12,
    });
  });

  it("30 dias termina hoje", () => {
    expect(resolverPeriodo(fuso, { periodo: "30d" }, AGORA)).toMatchObject({
      chave: "30d",
      de: "2026-09-13",
      ate: "2026-10-12",
      anterior_de: "2026-08-14",
      anterior_ate: "2026-09-12",
      dias: 30,
    });
  });

  it("todo o período começa no primeiro dado ou, sem dado, 365 dias atrás", () => {
    expect(resolverPeriodo(fuso, { periodo: "todo" }, AGORA, "2026-05-22")).toMatchObject(
      {
        chave: "todo",
        de: "2026-05-22",
        ate: "2026-10-12",
      },
    );
    expect(resolverPeriodo(fuso, { periodo: "todo" }, AGORA, null)).toMatchObject({
      de: "2025-10-13",
      ate: "2026-10-12",
      dias: 365,
    });
    // Primeiro dado no futuro (relógio errado) não vira período invertido.
    expect(resolverPeriodo(fuso, { periodo: "todo" }, AGORA, "2027-01-01").de).toBe(
      "2025-10-13",
    );
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
    expect(resolverPeriodo(fuso, { periodo: "x" }, AGORA).chave).toBe("mes");
  });
});
