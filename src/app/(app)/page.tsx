import Link from "next/link";
import { ArrowRight, PlugZap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CARDS_HOME,
  calcularMetricas,
  ENTRADA_ZERADA,
  formatarMetrica,
} from "@/dominio/metricas";
import { INTEGRACOES, TIPOS_INTEGRACAO } from "@/dominio/integracoes";
import { obterContexto } from "@/servidor/sessao";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";

export default async function PaginaHome() {
  const { organizacao } = await obterContexto();
  const integracoes = await listarIntegracoes(organizacao.id);

  // As fontes só alimentam a Home depois do primeiro ciclo bem-sucedido (status "conectada").
  const pendentes = TIPOS_INTEGRACAO.filter(
    (t) => integracoes[t]?.status !== "conectada",
  );
  const metricas = calcularMetricas({
    ...ENTRADA_ZERADA,
    taxa_anuncios: organizacao.taxa_anuncios,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{organizacao.nome}</h1>
        <p className="text-muted-foreground">Visão geral do negócio.</p>
      </div>

      {pendentes.length > 0 ? (
        <Alert>
          <PlugZap />
          <AlertTitle>
            Os dados serão preenchidos quando as integrações estiverem conectadas
          </AlertTitle>
          <AlertDescription>
            <p>
              Faltando: {pendentes.map((t) => INTEGRACOES[t].nome).join(" e ")}. O
              faturamento vem do gateway e o investimento vem do Meta Ads; até lá, tudo
              aqui fica zerado.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              render={<Link href="/configuracoes/integracoes" />}
            >
              Conectar integrações <ArrowRight aria-hidden />
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS_HOME.map((card) => (
          <Card key={card.chave}>
            <CardHeader>
              <CardDescription>{card.nome}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatarMetrica(metricas[card.chave], card.formato, organizacao.moeda)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">{card.descricao}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
