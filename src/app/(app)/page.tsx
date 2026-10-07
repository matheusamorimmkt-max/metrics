import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { obterContexto } from "@/servidor/sessao";

export default async function PaginaHome() {
  const { organizacao } = await obterContexto();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{organizacao.nome}</h1>
        <p className="text-muted-foreground">
          A Home com investimento, faturamento, lucro, ROAS e ROI chega na Fase 4, depois
          que Greenn e Meta estiverem conectados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por onde começar</CardTitle>
          <CardDescription>
            Nesta fase você cadastra a estrutura do negócio. Produtos e ofertas serão
            importados automaticamente da Greenn na próxima fase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="justify-between"
            render={<Link href="/configuracoes" />}
          >
            Taxa sobre anúncios e janela de transação <ArrowRight aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="justify-between"
            render={<Link href="/configuracoes/categorias" />}
          >
            Categorias <ArrowRight aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="justify-between"
            render={<Link href="/configuracoes/funis" />}
          >
            Funis <ArrowRight aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="justify-between"
            render={<Link href="/configuracoes/usuarios" />}
          >
            Convidar diretores <ArrowRight aria-hidden />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
