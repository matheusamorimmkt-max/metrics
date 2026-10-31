import { describe, expect, it } from "vitest";
import { mesCurto, serieDiaria, serieMensal } from "@/dominio/serie";

const serie = [
  { data: "2026-09-29", faturamento_bruto: 100, lucro: 10 },
  { data: "2026-09-30", faturamento_bruto: 50.5, lucro: -5.25 },
  { data: "2026-10-01", faturamento_bruto: 200, lucro: 80 },
];

describe("série por dia e por mês", () => {
  it("rotula o mês em português", () => {
    expect(mesCurto("2026-10")).toBe("out/26");
    expect(mesCurto("2027-01")).toBe("jan/27");
  });

  it("soma os dias de cada mês em ordem", () => {
    expect(serieMensal(serie)).toEqual([
      { chave: "2026-09", rotulo: "set/26", faturamento_bruto: 150.5, lucro: 4.75 },
      { chave: "2026-10", rotulo: "out/26", faturamento_bruto: 200, lucro: 80 },
    ]);
    expect(serieDiaria(serie, (d) => d.slice(8))[1]).toEqual({
      chave: "2026-09-30",
      rotulo: "30",
      faturamento_bruto: 50.5,
      lucro: -5.25,
    });
  });
});
