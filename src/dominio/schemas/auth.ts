import { z } from "zod";

/** E-mail como chave de identidade: sem espaços nas pontas e em minúsculas, validado depois de normalizar. */
const emailNormalizado = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

export const schemaLogin = z.object({
  email: emailNormalizado,
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
  email: emailNormalizado,
});

export const schemaRecuperarSenha = z.object({
  email: emailNormalizado,
});
