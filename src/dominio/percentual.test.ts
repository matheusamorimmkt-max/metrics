import { describe, expect, it } from "vitest";
import { formatarPercentual, fracaoParaTexto, textoParaFracao } from "./percentual";

describe("textoParaFracao", () => {
  it("converte percentual brasileiro em fração", () => {
    expect(textoParaFracao("12,15")).toBe(0.1215);
    expect(textoParaFracao("12.15")).toBe(0.1215);
    expect(textoParaFracao(" 20 % ")).toBe(0.2);
    expect(textoParaFracao("0")).toBe(0);
  });

  it("arredonda para a precisão do banco (4 casas na fração)", () => {
    expect(textoParaFracao("12,155")).toBe(0.1216);
    expect(textoParaFracao("6")).toBe(0.06);
  });

  it("rejeita texto que não é número", () => {
    expect(textoParaFracao("")).toBeNull();
    expect(textoParaFracao("abc")).toBeNull();
    expect(textoParaFracao("12,15,3")).toBeNull();
  });
});

describe("fracaoParaTexto e formatarPercentual", () => {
  it("mostra com vírgula e sem zeros desnecessários", () => {
    expect(fracaoParaTexto(0.1215)).toBe("12,15");
    expect(fracaoParaTexto(0.2)).toBe("20");
    expect(formatarPercentual(0.06)).toBe("6%");
    expect(formatarPercentual(0.1215)).toBe("12,15%");
  });

  it("vai e volta sem perder valor", () => {
    for (const texto of ["12,15", "20", "6", "0,5", "100"]) {
      const fracao = textoParaFracao(texto);
      expect(fracao).not.toBeNull();
      expect(fracaoParaTexto(fracao as number)).toBe(texto);
    }
  });
});
