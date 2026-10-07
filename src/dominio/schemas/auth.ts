import { z } from "zod";

export const schemaLogin = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
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
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
});
