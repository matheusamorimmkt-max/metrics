export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categorias: {
        Row: {
          created_at: string;
          id: string;
          nome: string;
          ordem: number;
          organizacao_id: string;
          tem_semaforo: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          nome: string;
          ordem?: number;
          organizacao_id: string;
          tem_semaforo?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nome?: string;
          ordem?: number;
          organizacao_id?: string;
          tem_semaforo?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categorias_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      funil_ofertas: {
        Row: {
          created_at: string;
          funil_id: string;
          id: string;
          oferta_id: string;
          ordem: number;
          organizacao_id: string;
          papel: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          funil_id: string;
          id?: string;
          oferta_id: string;
          ordem?: number;
          organizacao_id: string;
          papel: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          funil_id?: string;
          id?: string;
          oferta_id?: string;
          ordem?: number;
          organizacao_id?: string;
          papel?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "funil_ofertas_funil_id_fkey";
            columns: ["funil_id"];
            isOneToOne: false;
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funil_ofertas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: true;
            referencedRelation: "ofertas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funil_ofertas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      funis: {
        Row: {
          ativo: boolean;
          categoria_id: string;
          created_at: string;
          data_fim: string | null;
          data_inicio: string | null;
          id: string;
          meta_roi: number;
          nome: string;
          organizacao_id: string;
          tipo: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          categoria_id: string;
          created_at?: string;
          data_fim?: string | null;
          data_inicio?: string | null;
          id?: string;
          meta_roi?: number;
          nome: string;
          organizacao_id: string;
          tipo?: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          categoria_id?: string;
          created_at?: string;
          data_fim?: string | null;
          data_inicio?: string | null;
          id?: string;
          meta_roi?: number;
          nome?: string;
          organizacao_id?: string;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "funis_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funis_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      historico_aliquotas: {
        Row: {
          aliquota: number;
          base: string;
          created_at: string;
          id: string;
          organizacao_id: string;
          produto_id: string;
          vigencia_fim: string | null;
          vigencia_inicio: string;
        };
        ComputedFields: never;
        Insert: {
          aliquota: number;
          base: string;
          created_at?: string;
          id?: string;
          organizacao_id: string;
          produto_id: string;
          vigencia_fim?: string | null;
          vigencia_inicio?: string;
        };
        Update: {
          aliquota?: number;
          base?: string;
          created_at?: string;
          id?: string;
          organizacao_id?: string;
          produto_id?: string;
          vigencia_fim?: string | null;
          vigencia_inicio?: string;
        };
        Relationships: [
          {
            foreignKeyName: "historico_aliquotas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historico_aliquotas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      integracoes: {
        Row: {
          config: NonNullable<Json>;
          created_at: string;
          credenciais_secret_id: string | null;
          id: string;
          organizacao_id: string;
          status: string;
          tipo: string;
          ultima_sincronizacao: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          config?: NonNullable<Json>;
          created_at?: string;
          credenciais_secret_id?: string | null;
          id?: string;
          organizacao_id: string;
          status?: string;
          tipo: string;
          ultima_sincronizacao?: string | null;
          updated_at?: string;
        };
        Update: {
          config?: NonNullable<Json>;
          created_at?: string;
          credenciais_secret_id?: string | null;
          id?: string;
          organizacao_id?: string;
          status?: string;
          tipo?: string;
          ultima_sincronizacao?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integracoes_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      membros: {
        Row: {
          created_at: string;
          id: string;
          organizacao_id: string;
          papel: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organizacao_id: string;
          papel?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organizacao_id?: string;
          papel?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membros_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      ofertas: {
        Row: {
          ativo: boolean;
          created_at: string;
          id: string;
          id_externo: string;
          nome: string;
          organizacao_id: string;
          plataforma: string;
          preco: number;
          produto_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          id_externo: string;
          nome: string;
          organizacao_id: string;
          plataforma: string;
          preco?: number;
          produto_id: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          id_externo?: string;
          nome?: string;
          organizacao_id?: string;
          plataforma?: string;
          preco?: number;
          produto_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ofertas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ofertas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      organizacoes: {
        Row: {
          created_at: string;
          fuso_horario: string;
          id: string;
          janela_transacao_min: number;
          moeda: string;
          nome: string;
          taxa_anuncios: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          fuso_horario?: string;
          id?: string;
          janela_transacao_min?: number;
          moeda?: string;
          nome: string;
          taxa_anuncios?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          fuso_horario?: string;
          id?: string;
          janela_transacao_min?: number;
          moeda?: string;
          nome?: string;
          taxa_anuncios?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      produtos: {
        Row: {
          aliquota_imposto: number;
          ativo: boolean;
          base_imposto: string;
          created_at: string;
          id: string;
          id_externo: string;
          nome: string;
          organizacao_id: string;
          plataforma: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          aliquota_imposto?: number;
          ativo?: boolean;
          base_imposto?: string;
          created_at?: string;
          id?: string;
          id_externo: string;
          nome: string;
          organizacao_id: string;
          plataforma: string;
          updated_at?: string;
        };
        Update: {
          aliquota_imposto?: number;
          ativo?: boolean;
          base_imposto?: string;
          created_at?: string;
          id?: string;
          id_externo?: string;
          nome?: string;
          organizacao_id?: string;
          plataforma?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      criar_organizacao: { Args: { p_nome: string }; Returns: string };
      organizacoes_do_usuario: { Args: Record<PropertyKey, never>; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
