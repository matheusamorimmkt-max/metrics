import { z } from "zod";

export const nomeCategoria = z
  .string()
  .trim()
  .min(1, "Informe o nome da categoria.")
  .max(80, "O nome pode ter no máximo 80 caracteres.");

export const schemaCriarCategoria = z.object({
  nome: nomeCategoria,
  tem_semaforo: z.boolean().default(false),
});

export const schemaRenomearCategoria = z.object({
  id: z.uuid(),
  nome: nomeCategoria,
});

export const schemaIdCategoria = z.object({ id: z.uuid() });

export const schemaMoverCategoria = z.object({
  id: z.uuid(),
  direcao: z.enum(["cima", "baixo"]),
});
