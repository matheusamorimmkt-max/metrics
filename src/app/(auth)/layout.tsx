export default function LayoutAuth({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-muted/40 flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Painel de Funis</h1>
          <p className="text-muted-foreground text-sm">
            Gasto, vendas e lucro por funil.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
