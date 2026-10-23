"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/servidor/supabase/navegador";

const MENSAGEM_EXPIRADO =
  "Este link expirou ou já foi usado. Peça um novo convite ou uma nova recuperação de senha.";

/**
 * Destino do link de convite quando o template de e-mail do Supabase está no padrão:
 * o Supabase valida o token e redireciona para cá com a sessão no fragmento da URL
 * (#access_token=...&refresh_token=...&type=invite). O fragmento não chega ao servidor,
 * então o navegador grava a sessão e segue.
 *
 * A sessão é gravada à mão com `setSession`: o cliente do @supabase/ssr usa sempre o
 * fluxo PKCE e, se deixado ler a URL sozinho, recusa o fragmento ("Not a valid PKCE
 * flow url") sem avisar, o que fazia todo convite parecer expirado.
 */
export default function PaginaCallbackAuth() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const concluir = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const erroDescricao = hash.get("error_description");
      if (erroDescricao) return erroDescricao;
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (!access_token || !refresh_token) return MENSAGEM_EXPIRADO;
      const tipo = hash.get("type");

      const supabase = criarClienteNavegador({ detectSessionInUrl: false });
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (cancelado) return null;
      if (error) return error.message;
      // Tira os tokens da barra de endereço antes de seguir.
      window.history.replaceState(null, "", window.location.pathname);
      const precisaSenha = tipo === "invite" || tipo === "recovery";
      router.replace(precisaSenha ? "/definir-senha" : "/");
      router.refresh();
      return null;
    };
    void concluir().then((mensagem) => {
      if (!cancelado && mensagem) setErro(mensagem);
    });

    return () => {
      cancelado = true;
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
