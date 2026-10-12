import { describe, expect, it } from "vitest";
import { configDaConexao, schemaConectarIntegracao } from "./integracao";

describe("schemaConectarIntegracao", () => {
  it("aceita a Greenn só com o token, aparado", () => {
    const r = schemaConectarIntegracao.safeParse({
      tipo: "greenn",
      credencial: "  grn_live_abc123  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.credencial).toBe("grn_live_abc123");
      expect(configDaConexao(r.data)).toEqual({});
    }
  });

  it("exige a conta de anúncios no Meta e normaliza o prefixo act_", () => {
    const sem = schemaConectarIntegracao.safeParse({
      tipo: "meta",
      credencial: "EAABtoken123",
    });
    expect(sem.success).toBe(false);

    const com = schemaConectarIntegracao.safeParse({
      tipo: "meta",
      credencial: "EAABtoken123",
      conta_anuncios_id: " 1234567890 ",
    });
    expect(com.success).toBe(true);
    if (com.success)
      expect(configDaConexao(com.data)).toEqual({ conta_anuncios_id: "act_1234567890" });

    const jaComPrefixo = schemaConectarIntegracao.safeParse({
      tipo: "meta",
      credencial: "EAABtoken123",
      conta_anuncios_id: "act_42",
    });
    expect(jaComPrefixo.success).toBe(false);
  });

  it("rejeita token da Greenn sem o prefixo grn_live_ (ex.: token de webhook)", () => {
    const r = schemaConectarIntegracao.safeParse({
      tipo: "greenn",
      credencial: "$2y$10$DeAbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita credencial curta e tipo desconhecido", () => {
    expect(
      schemaConectarIntegracao.safeParse({ tipo: "greenn", credencial: "abc" }).success,
    ).toBe(false);
    expect(
      schemaConectarIntegracao.safeParse({
        tipo: "hotmart",
        credencial: "token-valido-123",
      }).success,
    ).toBe(false);
  });
});
