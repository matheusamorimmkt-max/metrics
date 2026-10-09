import { z } from "zod";

/**
 * E-mail aparado e em minúsculas. O trim vem antes da validação de formato:
 * no Zod 4, `z.email().trim()` valida primeiro e rejeitaria " ana@empresa.com ".
 */
const campoEmail = z
  .string("Informe um e-mail válido.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

export const schemaLogin = z.object({
  email: campoEmail,
  senha: z.string().min(1, "Informe a senha."),
  proximo: z.string().optional(),
});

export const schemaDefinirSenha = z
  .object({
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmacao: z.string(),
  })
  .refine((v) => v.senha === v.confirmacao, {
    message: "As senhas não conferem.",
    path: ["confirmacao"],
  });

export const schemaConvite = z.object({
  email: campoEmail,
});

export const schemaRecuperarSenha = z.object({
  email: campoEmail,
});
