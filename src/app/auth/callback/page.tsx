"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/servidor/supabase/navegador";

/**
 * Destino do link de convite quando o template de e-mail do Supabase está no padrão:
 * o Supabase redireciona para cá com os tokens no fragmento da URL (#access_token=...).
 * O fragmento não chega ao servidor, então o navegador grava a sessão e segue.
 */
export default function PaginaCallbackAuth() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = criarClienteNavegador();
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const tipo = hash.get("type");
    const erroDescricao = hash.get("error_description");

    let parou = false;
    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (parou) return;
      if (erroDescricao) {
        parou = true;
        setErro(erroDescricao);
        return;
      }
      if (sessao) {
        parou = true;
        assinatura.subscription.unsubscribe();
        const precisaSenha = tipo === "invite" || tipo === "recovery";
        router.replace(precisaSenha ? "/definir-senha" : "/");
        router.refresh();
      } else if (evento === "INITIAL_SESSION") {
        // Sem sessão e sem tokens na URL: nada a fazer aqui.
        setErro("Este link expirou ou já foi usado. Peça um novo convite.");
      }
    });

    return () => {
      parou = true;
      assinatura.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8 text-center">
      {erro ? (
        <div className="space-y-2">
          <p className="text-destructive">{erro}</p>
          <a className="underline" href="/login">
            Ir para o login
          </a>
        </div>
      ) : (
        <p className="text-muted-foreground">Validando seu acesso…</p>
      )}
    </main>
  );
}
