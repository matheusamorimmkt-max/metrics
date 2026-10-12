import { describe, expect, it } from "vitest";
import { schemaConvite, schemaLogin, schemaRecuperarSenha } from "./auth";

describe("e-mail normalizado (login, convite e recuperação)", () => {
  it.each([schemaLogin, schemaConvite, schemaRecuperarSenha])(
    "tira espaços das pontas e põe em minúsculas antes de validar",
    (schema) => {
      const r = schema.safeParse({ email: "  Fulano@Exemplo.com ", senha: "x" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe("fulano@exemplo.com");
    },
  );

  it("rejeita e-mail inválido", () => {
    expect(schemaRecuperarSenha.safeParse({ email: "nao-e-email" }).success).toBe(false);
    expect(schemaRecuperarSenha.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("schemaLogin", () => {
  it("exige senha", () => {
    const r = schemaLogin.safeParse({ email: "a@b.com", senha: "" });
    expect(r.success).toBe(false);
  });
});
