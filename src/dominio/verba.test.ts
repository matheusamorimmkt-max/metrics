import { describe, expect, it } from "vitest";
import { textoParaVerba, verbaParaTexto } from "./verba";

describe("textoParaVerba", () => {
  it("lê formatos brasileiros e com ponto decimal", () => {
    expect(textoParaVerba("150")).toBe(150);
    expect(textoParaVerba("150,50")).toBe(150.5);
    expect(textoParaVerba("R$ 1.250,00")).toBe(1250);
    expect(textoParaVerba("1250.50")).toBe(1250.5);
    expect(textoParaVerba("1.250.000")).toBe(1_250_000);
    expect(textoParaVerba(" 99,999 ")).toBe(100);
  });

  it("recusa vazio, zero, negativo e texto", () => {
    expect(textoParaVerba("")).toBeNull();
    expect(textoParaVerba("0")).toBeNull();
    expect(textoParaVerba("-10")).toBeNull();
    expect(textoParaVerba("abc")).toBeNull();
    expect(textoParaVerba("1,2,3")).toBeNull();
  });

  it("volta para texto com vírgula", () => {
    expect(verbaParaTexto(1250.5)).toBe("1250,50");
    expect(verbaParaTexto(150)).toBe("150,00");
  });
});
