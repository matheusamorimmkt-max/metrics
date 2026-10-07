import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Integrações" };

const CONECTORES = [
  {
    nome: "Greenn",
    fase: "Fase 2",
    descricao:
      "Vendas, ofertas, produtos, clientes, taxas do gateway, comissões, reembolsos e chargebacks. Importação retroativa na primeira conexão e busca a cada 15 minutos.",
  },
  {
    nome: "Meta Ads",
    fase: "Fase 3",
    descricao:
      "Gasto, impressões, cliques, visualizações de página, inícios de checkout e leads por campanha, conjunto, anúncio e dia. Só permissão de leitura.",
  },
  {
    nome: "CRM",
    fase: "Depois do lançamento",
    descricao:
      "Leads, agendamentos, comparecimentos e vendas por closer. Conector a definir.",
  },
];

export default function PaginaIntegracoes() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Os conectores gravam tudo no banco e o painel lê só de lá. Tokens ficam
        criptografados no servidor e nunca chegam ao navegador.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {CONECTORES.map((c) => (
          <Card key={c.nome}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                {c.nome}
                <Badge variant="outline">{c.fase}</Badge>
              </CardTitle>
              <CardDescription>{c.descricao}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
