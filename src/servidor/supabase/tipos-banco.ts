export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      anuncios: {
        Row: {
          ativo: boolean;
          campanha_id: string;
          conjunto_id_externo: string;
          conjunto_nome: string | null;
          created_at: string;
          criativo_atualizado_em: string | null;
          criativo_tipo: string | null;
          id: string;
          id_externo: string;
          imagem_url: string | null;
          miniatura_url: string | null;
          nome: string;
          organizacao_id: string;
          permalink_url: string | null;
          plataforma: string;
          status: string | null;
          updated_at: string;
          video_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          campanha_id: string;
          conjunto_id_externo?: string;
          conjunto_nome?: string | null;
          created_at?: string;
          criativo_atualizado_em?: string | null;
          criativo_tipo?: string | null;
          id?: string;
          id_externo: string;
          imagem_url?: string | null;
          miniatura_url?: string | null;
          nome?: string;
          organizacao_id: string;
          permalink_url?: string | null;
          plataforma: string;
          status?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          ativo?: boolean;
          campanha_id?: string;
          conjunto_id_externo?: string;
          conjunto_nome?: string | null;
          created_at?: string;
          criativo_atualizado_em?: string | null;
          criativo_tipo?: string | null;
          id?: string;
          id_externo?: string;
          imagem_url?: string | null;
          miniatura_url?: string | null;
          nome?: string;
          organizacao_id?: string;
          permalink_url?: string | null;
          plataforma?: string;
          status?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "anuncios_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anuncios_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anuncios_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      campanhas: {
        Row: {
          ativo: boolean;
          conta_anuncio_id: string;
          created_at: string;
          id: string;
          id_externo: string;
          nome: string;
          objetivo: string | null;
          organizacao_id: string;
          plataforma: string;
          status: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          conta_anuncio_id: string;
          created_at?: string;
          id?: string;
          id_externo: string;
          nome?: string;
          objetivo?: string | null;
          organizacao_id: string;
          plataforma: string;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          conta_anuncio_id?: string;
          created_at?: string;
          id?: string;
          id_externo?: string;
          nome?: string;
          objetivo?: string | null;
          organizacao_id?: string;
          plataforma?: string;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campanhas_conta_anuncio_id_fkey";
            columns: ["conta_anuncio_id"];
            isOneToOne: false;
            referencedRelation: "contas_anuncio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campanhas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
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
      clientes: {
        Row: {
          cpf: string | null;
          cpf_duplicado: boolean;
          created_at: string;
          email: string;
          funil_entrada_id: string | null;
          id: string;
          id_externo: string | null;
          nome: string | null;
          organizacao_id: string;
          plataforma: string | null;
          primeira_compra_em: string | null;
          telefone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cpf?: string | null;
          cpf_duplicado?: boolean;
          created_at?: string;
          email: string;
          funil_entrada_id?: string | null;
          id?: string;
          id_externo?: string | null;
          nome?: string | null;
          organizacao_id: string;
          plataforma?: string | null;
          primeira_compra_em?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          cpf?: string | null;
          cpf_duplicado?: boolean;
          created_at?: string;
          email?: string;
          funil_entrada_id?: string | null;
          id?: string;
          id_externo?: string | null;
          nome?: string | null;
          organizacao_id?: string;
          plataforma?: string | null;
          primeira_compra_em?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_funil_entrada_id_fkey";
            columns: ["funil_entrada_id"];
            isOneToOne: false;
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      comissoes: {
        Row: {
          created_at: string;
          id: string;
          organizacao_id: string;
          parceiro_id_externo: string | null;
          parceiro_nome: string | null;
          tipo: string;
          valor: number;
          venda_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organizacao_id: string;
          parceiro_id_externo?: string | null;
          parceiro_nome?: string | null;
          tipo: string;
          valor: number;
          venda_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organizacao_id?: string;
          parceiro_id_externo?: string | null;
          parceiro_nome?: string | null;
          tipo?: string;
          valor?: number;
          venda_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comissoes_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comissoes_venda_id_fkey";
            columns: ["venda_id"];
            isOneToOne: false;
            referencedRelation: "vendas";
            referencedColumns: ["id"];
          },
        ];
      };
      conjuntos: {
        Row: {
          ativo: boolean;
          campanha_id: string;
          created_at: string;
          id: string;
          id_externo: string;
          nome: string;
          organizacao_id: string;
          plataforma: string;
          status: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          campanha_id: string;
          created_at?: string;
          id?: string;
          id_externo: string;
          nome?: string;
          organizacao_id: string;
          plataforma: string;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          campanha_id?: string;
          created_at?: string;
          id?: string;
          id_externo?: string;
          nome?: string;
          organizacao_id?: string;
          plataforma?: string;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conjuntos_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conjuntos_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conjuntos_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      contas_anuncio: {
        Row: {
          ativo: boolean;
          created_at: string;
          fuso_horario: string | null;
          id: string;
          id_externo: string;
          integracao_id: string;
          moeda: string;
          nome: string;
          organizacao_id: string;
          plataforma: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          created_at?: string;
          fuso_horario?: string | null;
          id?: string;
          id_externo: string;
          integracao_id: string;
          moeda?: string;
          nome?: string;
          organizacao_id: string;
          plataforma: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          fuso_horario?: string | null;
          id?: string;
          id_externo?: string;
          integracao_id?: string;
          moeda?: string;
          nome?: string;
          organizacao_id?: string;
          plataforma?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contas_anuncio_integracao_id_fkey";
            columns: ["integracao_id"];
            isOneToOne: false;
            referencedRelation: "integracoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_anuncio_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      funil_campanhas: {
        Row: {
          campanha_id: string;
          created_at: string;
          funil_id: string;
          id: string;
          organizacao_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          campanha_id: string;
          created_at?: string;
          funil_id: string;
          id?: string;
          organizacao_id: string;
          updated_at?: string;
        };
        Update: {
          campanha_id?: string;
          created_at?: string;
          funil_id?: string;
          id?: string;
          organizacao_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "funil_campanhas_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: true;
            referencedRelation: "campanhas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funil_campanhas_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: true;
            referencedRelation: "campanhas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funil_campanhas_funil_id_fkey";
            columns: ["funil_id"];
            isOneToOne: false;
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funil_campanhas_organizacao_id_fkey";
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
            foreignKeyName: "funil_ofertas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: true;
            referencedRelation: "ofertas_resumo";
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
          {
            foreignKeyName: "historico_aliquotas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos_resumo";
            referencedColumns: ["id"];
          },
        ];
      };
      integracoes: {
        Row: {
          config: NonNullable<Json>;
          created_at: string;
          credenciais_atualizadas_em: string | null;
          credenciais_secret_id: string | null;
          credencial_sufixo: string | null;
          erro: string | null;
          id: string;
          importacao_concluida_em: string | null;
          importacao_inicio: string | null;
          organizacao_id: string;
          status: string;
          tipo: string;
          ultima_sincronizacao: string | null;
          ultimo_corte: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          config?: NonNullable<Json>;
          created_at?: string;
          credenciais_atualizadas_em?: string | null;
          credenciais_secret_id?: string | null;
          credencial_sufixo?: string | null;
          erro?: string | null;
          id?: string;
          importacao_concluida_em?: string | null;
          importacao_inicio?: string | null;
          organizacao_id: string;
          status?: string;
          tipo: string;
          ultima_sincronizacao?: string | null;
          ultimo_corte?: string | null;
          updated_at?: string;
        };
        Update: {
          config?: NonNullable<Json>;
          created_at?: string;
          credenciais_atualizadas_em?: string | null;
          credenciais_secret_id?: string | null;
          credencial_sufixo?: string | null;
          erro?: string | null;
          id?: string;
          importacao_concluida_em?: string | null;
          importacao_inicio?: string | null;
          organizacao_id?: string;
          status?: string;
          tipo?: string;
          ultima_sincronizacao?: string | null;
          ultimo_corte?: string | null;
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
      metricas_anuncio_diarias: {
        Row: {
          alcance: number;
          anuncio_id_externo: string;
          anuncio_nome: string | null;
          campanha_id: string;
          cliques: number;
          cliques_link: number;
          compras_plataforma: number;
          conjunto_id_externo: string;
          conjunto_nome: string | null;
          created_at: string;
          dados_brutos: Json | null;
          data: string;
          gasto: number;
          id: string;
          impressoes: number;
          inicios_checkout: number;
          leads: number;
          organizacao_id: string;
          updated_at: string;
          visualizacoes_pagina: number;
        };
        ComputedFields: never;
        Insert: {
          alcance?: number;
          anuncio_id_externo?: string;
          anuncio_nome?: string | null;
          campanha_id: string;
          cliques?: number;
          cliques_link?: number;
          compras_plataforma?: number;
          conjunto_id_externo?: string;
          conjunto_nome?: string | null;
          created_at?: string;
          dados_brutos?: Json | null;
          data: string;
          gasto?: number;
          id?: string;
          impressoes?: number;
          inicios_checkout?: number;
          leads?: number;
          organizacao_id: string;
          updated_at?: string;
          visualizacoes_pagina?: number;
        };
        Update: {
          alcance?: number;
          anuncio_id_externo?: string;
          anuncio_nome?: string | null;
          campanha_id?: string;
          cliques?: number;
          cliques_link?: number;
          compras_plataforma?: number;
          conjunto_id_externo?: string;
          conjunto_nome?: string | null;
          created_at?: string;
          dados_brutos?: Json | null;
          data?: string;
          gasto?: number;
          id?: string;
          impressoes?: number;
          inicios_checkout?: number;
          leads?: number;
          organizacao_id?: string;
          updated_at?: string;
          visualizacoes_pagina?: number;
        };
        Relationships: [
          {
            foreignKeyName: "metricas_anuncio_diarias_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "metricas_anuncio_diarias_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "metricas_anuncio_diarias_organizacao_id_fkey";
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
          {
            foreignKeyName: "ofertas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos_resumo";
            referencedColumns: ["id"];
          },
        ];
      };
      ofertas_descartadas: {
        Row: {
          created_at: string;
          funil_id: string;
          id: string;
          oferta_id: string;
          organizacao_id: string;
          papel: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          funil_id: string;
          id?: string;
          oferta_id: string;
          organizacao_id: string;
          papel: string;
        };
        Update: {
          created_at?: string;
          funil_id?: string;
          id?: string;
          oferta_id?: string;
          organizacao_id?: string;
          papel?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ofertas_descartadas_funil_id_fkey";
            columns: ["funil_id"];
            isOneToOne: false;
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ofertas_descartadas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ofertas_descartadas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ofertas_descartadas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      organizacoes: {
        Row: {
          aliquota_imposto: number;
          base_imposto: string;
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
          aliquota_imposto?: number;
          base_imposto?: string;
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
          aliquota_imposto?: number;
          base_imposto?: string;
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
          imposto_personalizado: boolean;
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
          imposto_personalizado?: boolean;
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
          imposto_personalizado?: boolean;
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
      sincronizacoes: {
        Row: {
          ciclo_id: string;
          corte: string;
          cursor: Json | null;
          detalhes: NonNullable<Json>;
          erro: string | null;
          fim: string | null;
          id: string;
          inicio: string;
          integracao_id: string;
          modo: string;
          organizacao_id: string;
          origem: string;
          registros: number;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          ciclo_id?: string;
          corte?: string;
          cursor?: Json | null;
          detalhes?: NonNullable<Json>;
          erro?: string | null;
          fim?: string | null;
          id?: string;
          inicio?: string;
          integracao_id: string;
          modo: string;
          organizacao_id: string;
          origem: string;
          registros?: number;
          status?: string;
        };
        Update: {
          ciclo_id?: string;
          corte?: string;
          cursor?: Json | null;
          detalhes?: NonNullable<Json>;
          erro?: string | null;
          fim?: string | null;
          id?: string;
          inicio?: string;
          integracao_id?: string;
          modo?: string;
          organizacao_id?: string;
          origem?: string;
          registros?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sincronizacoes_integracao_id_fkey";
            columns: ["integracao_id"];
            isOneToOne: false;
            referencedRelation: "integracoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sincronizacoes_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      transacoes: {
        Row: {
          cliente_id: string;
          created_at: string;
          eh_recompra: boolean;
          fim: string;
          funil_id: string | null;
          id: string;
          inicio: string;
          ordem: number;
          organizacao_id: string;
          quantidade_vendas: number;
          valor_total: number;
        };
        ComputedFields: never;
        Insert: {
          cliente_id: string;
          created_at?: string;
          eh_recompra?: boolean;
          fim: string;
          funil_id?: string | null;
          id?: string;
          inicio: string;
          ordem: number;
          organizacao_id: string;
          quantidade_vendas?: number;
          valor_total?: number;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          eh_recompra?: boolean;
          fim?: string;
          funil_id?: string | null;
          id?: string;
          inicio?: string;
          ordem?: number;
          organizacao_id?: string;
          quantidade_vendas?: number;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "transacoes_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transacoes_funil_id_fkey";
            columns: ["funil_id"];
            isOneToOne: false;
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transacoes_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      vendas: {
        Row: {
          afiliado_id_externo: string | null;
          assinatura_id_externo: string | null;
          cliente_id: string;
          created_at: string;
          criada_em: string | null;
          cupom: string | null;
          dados_brutos: Json | null;
          id: string;
          id_externo: string;
          meio_pagamento: string | null;
          moeda: string;
          oferta_id: string;
          organizacao_id: string;
          origem: string;
          parcelas: number;
          plataforma: string;
          produto_id: string;
          reembolsada_em: string | null;
          reembolso_pendente: boolean;
          status: string;
          status_externo: string | null;
          taxa_gateway: number;
          taxa_gateway_origem: string;
          transacao_id: string | null;
          updated_at: string;
          utm: NonNullable<Json>;
          valor_bruto: number;
          valor_parceiros: number;
          vendida_em: string;
        };
        ComputedFields: never;
        Insert: {
          afiliado_id_externo?: string | null;
          assinatura_id_externo?: string | null;
          cliente_id: string;
          created_at?: string;
          criada_em?: string | null;
          cupom?: string | null;
          dados_brutos?: Json | null;
          id?: string;
          id_externo: string;
          meio_pagamento?: string | null;
          moeda?: string;
          oferta_id: string;
          organizacao_id: string;
          origem?: string;
          parcelas?: number;
          plataforma: string;
          produto_id: string;
          reembolsada_em?: string | null;
          reembolso_pendente?: boolean;
          status: string;
          status_externo?: string | null;
          taxa_gateway?: number;
          taxa_gateway_origem?: string;
          transacao_id?: string | null;
          updated_at?: string;
          utm?: NonNullable<Json>;
          valor_bruto: number;
          valor_parceiros?: number;
          vendida_em: string;
        };
        Update: {
          afiliado_id_externo?: string | null;
          assinatura_id_externo?: string | null;
          cliente_id?: string;
          created_at?: string;
          criada_em?: string | null;
          cupom?: string | null;
          dados_brutos?: Json | null;
          id?: string;
          id_externo?: string;
          meio_pagamento?: string | null;
          moeda?: string;
          oferta_id?: string;
          organizacao_id?: string;
          origem?: string;
          parcelas?: number;
          plataforma?: string;
          produto_id?: string;
          reembolsada_em?: string | null;
          reembolso_pendente?: boolean;
          status?: string;
          status_externo?: string | null;
          taxa_gateway?: number;
          taxa_gateway_origem?: string;
          transacao_id?: string | null;
          updated_at?: string;
          utm?: NonNullable<Json>;
          valor_bruto?: number;
          valor_parceiros?: number;
          vendida_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_transacao_id_fkey";
            columns: ["transacao_id"];
            isOneToOne: false;
            referencedRelation: "transacoes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      campanhas_resumo: {
        Row: {
          ativo: boolean | null;
          conta_anuncio_id: string | null;
          conta_nome: string | null;
          funil_id: string | null;
          gasto_30d: number | null;
          gasto_total: number | null;
          id: string | null;
          id_externo: string | null;
          moeda: string | null;
          nome: string | null;
          objetivo: string | null;
          organizacao_id: string | null;
          plataforma: string | null;
          status: string | null;
          ultima_data: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "campanhas_conta_anuncio_id_fkey";
            columns: ["conta_anuncio_id"];
            isOneToOne: false;
            referencedRelation: "contas_anuncio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campanhas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funil_campanhas_funil_id_fkey";
            columns: ["funil_id"];
            isOneToOne: false;
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
        ];
      };
      conferencia_vendas_mensal: {
        Row: {
          faturamento_bruto: number | null;
          mes: string | null;
          oferta: string | null;
          oferta_id: string | null;
          organizacao_id: string | null;
          parceiros: number | null;
          plataforma: string | null;
          quantidade_aprovadas: number | null;
          quantidade_total: number | null;
          reembolsos: number | null;
          taxas_gateway: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "vendas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      metricas_campanha_diarias: {
        Row: {
          campanha_id: string | null;
          cliques: number | null;
          cliques_link: number | null;
          compras_plataforma: number | null;
          data: string | null;
          gasto: number | null;
          impressoes: number | null;
          inicios_checkout: number | null;
          leads: number | null;
          organizacao_id: string | null;
          visualizacoes_pagina: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "metricas_anuncio_diarias_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "metricas_anuncio_diarias_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "campanhas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "metricas_anuncio_diarias_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      metricas_diarias: {
        Row: {
          clientes_novos: number | null;
          cliques_link: number | null;
          data: string | null;
          faturamento_bruto: number | null;
          faturamento_recompra: number | null;
          funil_id: string | null;
          gasto: number | null;
          impostos: number | null;
          impressoes: number | null;
          inicios_checkout: number | null;
          leads: number | null;
          organizacao_id: string | null;
          parceiros: number | null;
          recompras: number | null;
          reembolsos: number | null;
          taxas_gateway: number | null;
          transacoes: number | null;
          vendas: number | null;
          visualizacoes_pagina: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      ofertas_resumo: {
        Row: {
          ativo: boolean | null;
          faturamento: number | null;
          funil_id: string | null;
          funil_nome: string | null;
          id: string | null;
          id_externo: string | null;
          nome: string | null;
          organizacao_id: string | null;
          papel: string | null;
          plataforma: string | null;
          preco: number | null;
          produto_id: string | null;
          produto_nome: string | null;
          ultima_venda: string | null;
          vendas: number | null;
          vinculo_status: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "funil_ofertas_funil_id_fkey";
            columns: ["funil_id"];
            isOneToOne: false;
            referencedRelation: "funis";
            referencedColumns: ["id"];
          },
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
          {
            foreignKeyName: "ofertas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos_resumo";
            referencedColumns: ["id"];
          },
        ];
      };
      produtos_resumo: {
        Row: {
          aliquota_imposto: number | null;
          ativo: boolean | null;
          base_imposto: string | null;
          id: string | null;
          id_externo: string | null;
          imposto_personalizado: boolean | null;
          nome: string | null;
          ofertas: number | null;
          organizacao_id: string | null;
          plataforma: string | null;
          vendas_30d: number | null;
          vigencias: number | null;
        };
        ComputedFields: never;
        Insert: {
          aliquota_imposto?: number | null;
          ativo?: boolean | null;
          base_imposto?: string | null;
          id?: string | null;
          id_externo?: string | null;
          imposto_personalizado?: boolean | null;
          nome?: string | null;
          ofertas?: never;
          organizacao_id?: string | null;
          plataforma?: string | null;
          vendas_30d?: never;
          vigencias?: never;
        };
        Update: {
          aliquota_imposto?: number | null;
          ativo?: boolean | null;
          base_imposto?: string | null;
          id?: string | null;
          id_externo?: string | null;
          imposto_personalizado?: boolean | null;
          nome?: string | null;
          ofertas?: never;
          organizacao_id?: string | null;
          plataforma?: string | null;
          vendas_30d?: never;
          vigencias?: never;
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
      vendas_oferta_diarias: {
        Row: {
          data: string | null;
          faturamento_bruto: number | null;
          oferta_id: string | null;
          organizacao_id: string | null;
          reembolsadas: number | null;
          valor_reembolsado: number | null;
          vendas: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "vendas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_oferta_id_fkey";
            columns: ["oferta_id"];
            isOneToOne: false;
            referencedRelation: "ofertas_resumo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_organizacao_id_fkey";
            columns: ["organizacao_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      conector_da_integracao: { Args: { p_tipo: string }; Returns: string };
      configurar_agendamento: {
        Args: { p_service_role_key: string; p_url_funcoes: string };
        Returns: string;
      };
      criar_organizacao: { Args: { p_nome: string }; Returns: string };
      definir_imposto_organizacao: {
        Args: { p_aliquota: number; p_base: string; p_organizacao_id: string };
        Returns: number;
      };
      definir_imposto_produto: {
        Args: {
          p_aliquota?: number;
          p_base?: string;
          p_personalizado: boolean;
          p_produto_id: string;
        };
        Returns: undefined;
      };
      disparar_ciclo_agendado: { Args: { p_modo?: string }; Returns: number };
      guardar_credencial_integracao: {
        Args: {
          p_config?: Json;
          p_credencial: string;
          p_organizacao_id: string;
          p_tipo: string;
        };
        Returns: string;
      };
      ler_credencial_integracao: { Args: { p_integracao_id: string }; Returns: string };
      organizacoes_do_usuario: { Args: Record<PropertyKey, never>; Returns: string[] };
      recalcular_aliquota_historico: {
        Args: { p_produto_id: string };
        Returns: undefined;
      };
      recalcular_transacoes: {
        Args: { p_cliente_ids?: string[]; p_organizacao_id: string };
        Returns: number;
      };
      remover_credencial_integracao: {
        Args: { p_organizacao_id: string; p_tipo: string };
        Returns: undefined;
      };
      sugerir_ofertas: { Args: { p_organizacao_id: string }; Returns: number };
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
