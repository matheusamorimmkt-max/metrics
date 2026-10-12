import { describe, expect, it } from "vitest";
import { schemaDefinirSenha, schemaLogin, schemaRecuperarSenha } from "./auth";

describe("schemaLogin", () => {
  it("normaliza o e-mail e exige senha", () => {
    const r = schemaLogin.parse({ email: "  Ana@Empresa.COM ", senha: "x" });
    expect(r.email).toBe("ana@empresa.com");
    expect(schemaLogin.safeParse({ email: "ana@empresa.com", senha: "" }).success).toBe(
      false,
    );
  });
});

describe("schemaRecuperarSenha", () => {
  it("normaliza o e-mail", () => {
    expect(schemaRecuperarSenha.parse({ email: " Ana@Empresa.COM " }).email).toBe(
      "ana@empresa.com",
    );
  });

  it("rejeita e-mail inválido ou vazio", () => {
    expect(schemaRecuperarSenha.safeParse({ email: "nao-e-email" }).success).toBe(false);
    expect(schemaRecuperarSenha.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("schemaDefinirSenha", () => {
  it("exige 8 caracteres e confirmação igual", () => {
    expect(
      schemaDefinirSenha.safeParse({ senha: "1234567", confirmacao: "1234567" }).success,
    ).toBe(false);
    const diferente = schemaDefinirSenha.safeParse({
      senha: "12345678",
      confirmacao: "87654321",
    });
    expect(diferente.success).toBe(false);
    if (!diferente.success) {
      expect(diferente.error.issues[0].path).toEqual(["confirmacao"]);
    }
    expect(
      schemaDefinirSenha.safeParse({ senha: "12345678", confirmacao: "12345678" })
        .success,
    ).toBe(true);
  });
});
