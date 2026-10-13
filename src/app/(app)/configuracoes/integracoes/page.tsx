import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import {
  INTEGRACOES,
  PLATAFORMAS_PREVISTAS,
  SECOES_INTEGRACAO,
  TIPOS_INTEGRACAO,
} from "@/dominio/integracoes";
import { obterContexto } from "@/servidor/sessao";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { CartaoIntegracao } from "./cartao-integracao";

export const metadata: Metadata = { title: "Integrações" };

export default async function PaginaIntegracoes() {
  const { organizacao } = await obterContexto();
  const integracoes = await listarIntegracoes(organizacao.id);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Cada organização conecta as próprias contas. As credenciais ficam criptografadas
        no servidor, nunca chegam ao navegador e só os conectores as leem. Os conectores
        gravam tudo no banco e o painel lê só de lá.
      </p>
      {SECOES_INTEGRACAO.map((secao, i) => (
        <section key={secao.chave} className="space-y-4">
          {i > 0 ? <Separator /> : null}
          <div>
            <h2 className="text-lg font-semibold">{secao.titulo}</h2>
            <p className="text-muted-foreground text-sm">{secao.descricao}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {TIPOS_INTEGRACAO.filter((t) => INTEGRACOES[t].secao === secao.chave).map(
              (tipo) => (
                <CartaoIntegracao
                  key={tipo}
                  definicao={INTEGRACOES[tipo]}
                  integracao={integracoes[tipo]}
                  fuso={organizacao.fuso_horario}
                />
              ),
            )}
            {PLATAFORMAS_PREVISTAS.filter((p) => p.secao === secao.chave).map((p) => (
              <Card key={p.chave}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Logo src={p.logo} nome={p.nome} />
                      {p.nome}
                    </span>
                    <Badge variant="outline">Em breve</Badge>
                  </CardTitle>
                  <CardDescription>{p.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="O conector desta plataforma ainda está em desenvolvimento."
                  >
                    Conectar {p.nome}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
