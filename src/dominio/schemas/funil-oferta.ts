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

export const schemaVincularOfertasEmLote = z.object({
  oferta_ids: z.array(z.uuid("Oferta inválida.")).min(1, "Selecione pelo menos uma oferta.").max(500),
  funil_id: z.uuid("Funil inválido."),
  papel: z.enum(PAPEIS_OFERTA, "Escolha o papel das ofertas no funil."),
});

export const schemaOfertaId = z.object({
  oferta_id: z.uuid("Oferta inválida."),
});
