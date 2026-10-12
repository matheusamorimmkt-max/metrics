"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { atualizarAgora } from "@/servidor/acoes/sincronizacao";
import type { EstadoSincronizacao } from "@/servidor/consultas/sincronizacoes";

const BLOQUEIO_MS = 60_000;

/** "Atualizado às 14h32" + botão "Atualizar agora" (bloqueado durante um ciclo e por 1 min depois). */
export function AtualizarAgora({
  estado,
  fuso,
  temConector,
}: {
  estado: EstadoSincronizacao;
  fuso: string;
  temConector: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [agora, setAgora] = useState(() => Date.now());

  // Relógio para liberar o botão sozinho depois do bloqueio de 1 minuto.
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const ultimoFim = estado.ultimo_fim_em ? new Date(estado.ultimo_fim_em).getTime() : 0;
  const bloqueado = estado.executando || agora - ultimoFim < BLOQUEIO_MS;

  const rotuloHora = estado.ultima_concluida_em
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: fuso,
      })
        .format(new Date(estado.ultima_concluida_em))
        .replace(":", "h")
    : null;

  function clicar() {
    iniciar(async () => {
      const r = await atualizarAgora();
      if (r.ok) toast.success(r.mensagem ?? "Atualizado.");
      else toast.error(r.erro ?? "Não foi possível atualizar.");
      router.refresh();
    });
  }

  if (!temConector) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground hidden text-xs sm:inline">
        {estado.executando
          ? "Atualizando…"
          : rotuloHora
            ? `Atualizado às ${rotuloHora}`
            : "Ainda não atualizado"}
      </span>
      {estado.falhas.length > 0 ? (
        <span
          className="text-destructive flex items-center gap-1 text-xs"
          title={estado.falhas
            .map((f) => `${f.integracao}: ${f.erro ?? "falhou"}`)
            .join("\n")}
        >
          <AlertCircle className="size-3.5" aria-hidden />
          {estado.falhas.map((f) => f.integracao).join(", ")} falhou
        </span>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={clicar}
        disabled={pendente || bloqueado}
        title={
          bloqueado && !estado.executando
            ? "Aguarde 1 minuto entre atualizações"
            : undefined
        }
      >
        {pendente || estado.executando ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <RefreshCw aria-hidden />
        )}
        Atualizar agora
      </Button>
    </div>
  );
}
