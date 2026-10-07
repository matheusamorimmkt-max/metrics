import { SubNavegacao } from "./sub-navegacao";

export default function LayoutConfiguracoes({ children }: LayoutProps<"/configuracoes">) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Estrutura do negócio e regras de cálculo. Tudo aqui vale só para a organização
          atual.
        </p>
      </div>
      <SubNavegacao />
      {children}
    </div>
  );
}
