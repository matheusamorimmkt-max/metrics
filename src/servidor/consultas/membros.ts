import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { criarClienteAdmin } from "@/servidor/supabase/admin";

export type Membro = {
  id: string;
  user_id: string;
  email: string;
  papel: string;
  created_at: string;
  confirmado: boolean;
};

/**
 * Membros da organização com e-mail. O e-mail mora no Auth, não em membros,
 * então busca-se com o cliente admin (só no servidor).
 */
export async function listarMembros(organizacaoId: string): Promise<Membro[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("membros")
    .select("id, user_id, papel, created_at")
    .eq("organizacao_id", organizacaoId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Falha ao carregar membros: ${error.message}`);

  const admin = criarClienteAdmin();
  const detalhes = await Promise.all(
    data.map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        papel: m.papel,
        created_at: m.created_at,
        email: u?.user?.email ?? "(sem e-mail)",
        confirmado: Boolean(u?.user?.last_sign_in_at),
      };
    }),
  );
  return detalhes;
}
