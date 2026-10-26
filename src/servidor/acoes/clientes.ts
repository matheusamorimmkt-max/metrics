"use server";

import { z } from "zod";
import type { FichaCliente } from "@/dominio/ficha-cliente";
import { obterContexto } from "@/servidor/sessao";
import { obterFichaCliente } from "@/servidor/consultas/clientes";
import { falha, sucesso, type Resultado } from "./resultado";

/** Ficha completa do cliente para o pop-up. Leitura: qualquer membro. */
export async function carregarFichaCliente(
  clienteId: string,
): Promise<Resultado<FichaCliente>> {
  const { organizacao } = await obterContexto();
  if (!z.uuid().safeParse(clienteId).success) return falha("Cliente inválido.");
  const ficha = await obterFichaCliente(organizacao.id, clienteId);
  if (!ficha) return falha("Cliente não encontrado.");
  return sucesso(undefined, ficha);
}
