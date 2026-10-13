import Image from "next/image";

/** Logo da plataforma (arquivo em /public/logos). */
export function Logo({ src, nome }: { src: string; nome: string }) {
  return (
    <span className="bg-background flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border">
      <Image
        src={src}
        alt={`Logo ${nome}`}
        width={24}
        height={24}
        className="size-6 object-contain"
      />
    </span>
  );
}
