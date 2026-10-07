import { describe, expect, it } from "vitest";
import { schemaFunil } from "./funil";

const base = {
  nome: "Funil Desafio",
  categoria_id: "7e6b9a42-3b4e-4d6c-9c8a-0f1d2e3a4b5c",
  tipo: "venda_direta",
  meta_roi: 0.2,
  data_inicio: "",
  data_fim: "",
};

describe("schemaFunil", () => {
  it("aceita venda direta sem datas e zera as datas", () => {
    const r = schemaFunil.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.data_inicio).toBeNull();
      expect(r.data.data_fim).toBeNull();
    }
  });

  it("descarta datas informadas quando o tipo não é lançamento", () => {
    const r = schemaFunil.safeParse({
      ...base,
      data_inicio: "2026-10-01",
      data_fim: "2026-10-10",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data_inicio).toBeNull();
  });

  it("exige início e fim para lançamento", () => {
    const r = schemaFunil.safeParse({ ...base, tipo: "lancamento" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const caminhos = r.error.issues.map((i) => i.path.join("."));
      expect(caminhos).toContain("data_inicio");
      expect(caminhos).toContain("data_fim");
    }
  });

  it("rejeita fim antes do início", () => {
    const r = schemaFunil.safeParse({
      ...base,
      tipo: "lancamento",
      data_inicio: "2026-10-10",
      data_fim: "2026-10-01",
    });
    expect(r.success).toBe(false);
  });

  it("aceita lançamento com período válido", () => {
    const r = schemaFunil.safeParse({
      ...base,
      tipo: "lancamento",
      data_inicio: "2026-10-01",
      data_fim: "2026-10-15",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data_fim).toBe("2026-10-15");
  });

  it("rejeita tipo desconhecido, nome vazio e meta negativa", () => {
    expect(schemaFunil.safeParse({ ...base, tipo: "chefe" }).success).toBe(false);
    expect(schemaFunil.safeParse({ ...base, nome: "   " }).success).toBe(false);
    expect(schemaFunil.safeParse({ ...base, meta_roi: -0.1 }).success).toBe(false);
  });
});
