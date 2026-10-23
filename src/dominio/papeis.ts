/** Papéis de acesso de um membro da organização. */
export const PAPEIS = ["administrador", "visualizador"] as const;
export type Papel = (typeof PAPEIS)[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  administrador: "Administrador",
  visualizador: "Visualizador",
};

export const DESCRICAO_PAPEL: Record<Papel, string> = {
  administrador: "Vê e edita tudo, inclusive Configurações e usuários.",
  visualizador: "Só vê os relatórios. Não entra em Configurações nem liga ou desliga campanhas.",
};

export function papelDe(valor: string | null | undefined): Papel {
  return valor === "visualizador" ? "visualizador" : "administrador";
}

export function podeEditar(papel: Papel): boolean {
  return papel === "administrador";
}
