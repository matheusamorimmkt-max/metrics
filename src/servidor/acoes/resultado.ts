import type { ZodError } from "zod";

/** Retorno padrão de toda Server Action usada com useActionState. */
export type Resultado<T = undefined> =
  | { ok: true; dados?: T; mensagem?: string }
  | { ok: false; erro?: string; erros?: Record<string, string[]> };

export function errosDoZod(erro: ZodError): Record<string, string[]> {
  const erros: Record<string, string[]> = {};
  for (const issue of erro.issues) {
    const chave = issue.path.join(".") || "_";
    (erros[chave] ??= []).push(issue.message);
  }
  return erros;
}

export function falha(erro: string): Resultado<never> {
  return { ok: false, erro };
}

export function falhaValidacao(erro: ZodError): Resultado<never> {
  return { ok: false, erros: errosDoZod(erro), erro: "Confira os campos destacados." };
}

export function sucesso<T>(mensagem?: string, dados?: T): Resultado<T> {
  return { ok: true, mensagem, dados };
}

/** Lê um campo de texto do FormData sem quebrar quando vem vazio. */
export function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}
