import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTEGRACOES, TIPOS_INTEGRACAO } from "@/dominio/integracoes";
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
      <div className="grid gap-4 lg:grid-cols-2">
        {TIPOS_INTEGRACAO.map((tipo) => (
          <CartaoIntegracao
            key={tipo}
            definicao={INTEGRACOES[tipo]}
            integracao={integracoes[tipo]}
            fuso={organizacao.fuso_horario}
          />
        ))}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              CRM
              <Badge variant="outline">Depois do lançamento</Badge>
            </CardTitle>
            <CardDescription>
              Leads, agendamentos, comparecimentos e vendas por closer. Conector a
              definir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Em breve.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
