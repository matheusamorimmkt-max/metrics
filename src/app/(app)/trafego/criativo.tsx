"use client";

import { ExternalLink, Image as ImagemIcone, Play, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Criativo } from "@/servidor/consultas/trafego";

/** Miniatura do criativo do anúncio; clicar abre a imagem ou o vídeo em tamanho maior. */
export function MiniaturaCriativo({
  criativo,
  nome,
}: {
  criativo: Criativo | null;
  nome: string;
}) {
  if (
    !criativo ||
    (!criativo.miniatura_url && !criativo.imagem_url && !criativo.video_url)
  ) {
    return (
      <span
        className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-md"
        title="Criativo ainda não importado"
        aria-hidden
      >
        <ImagemIcone className="size-4" />
      </span>
    );
  }
  const miniatura = criativo.miniatura_url ?? criativo.imagem_url;
  const ehVideo = criativo.tipo === "video";
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="focus-visible:ring-ring/50 relative size-12 shrink-0 overflow-hidden rounded-md border outline-none focus-visible:ring-3"
            aria-label={`Ver criativo de ${nome}`}
          />
        }
      >
        {miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa e temporária do Meta
          <img src={miniatura} alt="" className="size-full object-cover" />
        ) : (
          <span className="bg-muted flex size-full items-center justify-center">
            <Video className="size-4" aria-hidden />
          </span>
        )}
        {ehVideo ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
            <Play className="size-4 fill-current" aria-hidden />
          </span>
        ) : null}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{nome}</DialogTitle>
          <DialogDescription>
            {ehVideo
              ? "Vídeo do anúncio, como está no Meta."
              : criativo.tipo === "carrossel"
                ? "Primeira imagem do carrossel."
                : "Imagem do anúncio, como está no Meta."}
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex max-h-[70vh] items-center justify-center overflow-hidden rounded-md">
          {ehVideo && criativo.video_url ? (
            <video
              src={criativo.video_url}
              controls
              playsInline
              poster={miniatura ?? undefined}
              className="max-h-[70vh] w-full"
            />
          ) : miniatura ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa e temporária do Meta
            <img
              src={criativo.imagem_url ?? miniatura}
              alt={`Criativo de ${nome}`}
              className="max-h-[70vh] w-auto object-contain"
            />
          ) : (
            <p className="text-muted-foreground p-8 text-sm">Sem prévia disponível.</p>
          )}
        </div>
        {ehVideo && !criativo.video_url ? (
          <p className="text-muted-foreground text-xs">
            O Meta não liberou a reprodução deste vídeo para o token. Abra no Meta pelo
            link abaixo.
          </p>
        ) : null}
        {criativo.permalink_url ? (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            render={<a href={criativo.permalink_url} target="_blank" rel="noreferrer" />}
          >
            Abrir no Meta <ExternalLink data-icon="inline-end" />
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
