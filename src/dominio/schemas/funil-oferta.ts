import { z } from "zod";

export const PAPEIS_OFERTA = ["front", "bump", "upsell", "downsell"] as const;
export type PapelOferta = (typeof PAPEIS_OFERTA)[number];

export const ROTULO_PAPEL: Record<PapelOferta, string> = {
  front: "Front",
  bump: "Order bump",
  upsell: "Upsell",
  downsell: "Downsell",
};

export const schemaVincularOferta = z.object({
  oferta_id: z.uuid("Oferta inválida."),
  funil_id: z.uuid("Funil inválido."),
  papel: z.enum(PAPEIS_OFERTA, "Escolha o papel da oferta no funil."),
});

export const schemaOfertaId = z.object({
  oferta_id: z.uuid("Oferta inválida."),
});
