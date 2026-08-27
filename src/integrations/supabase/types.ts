export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_default_profile: {
        Row: {
          applied_at: string
          applied_by: string | null
          offering_slug: string
          profile_id: string | null
          profile_name: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          offering_slug: string
          profile_id?: string | null
          profile_name: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          offering_slug?: string
          profile_id?: string | null
          profile_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_default_profile_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "parameter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_defaults: {
        Row: {
          key: string
          source_profile_id: string | null
          source_profile_name: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          source_profile_id?: string | null
          source_profile_name?: string | null
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          source_profile_id?: string | null
          source_profile_name?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_defaults_source_profile_id_fkey"
            columns: ["source_profile_id"]
            isOneToOne: false
            referencedRelation: "parameter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_defaults_history: {
        Row: {
          change_kind: string
          changed_at: string
          changed_by: string | null
          id: string
          key: string
          value: Json
          version: number
        }
        Insert: {
          change_kind: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          key: string
          value: Json
          version: number
        }
        Update: {
          change_kind?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          key?: string
          value?: Json
          version?: number
        }
        Relationships: []
      }
      approval_decisions: {
        Row: {
          approver_email: string
          approver_user_id: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          decision: string
          id: string
          request_id: string
          role_id: string | null
          token_hash: string
        }
        Insert: {
          approver_email: string
          approver_user_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          request_id: string
          role_id?: string | null
          token_hash: string
        }
        Update: {
          approver_email?: string
          approver_user_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          request_id?: string
          role_id?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "approval_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          cotacao_id: string | null
          created_at: string
          decided_at: string | null
          id: string
          offering: string
          rentabilidade_pct: number
          requester_id: string
          status: string
          summary: Json | null
          target_id: string
          target_type: string
          tier_id: string | null
        }
        Insert: {
          cotacao_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          offering: string
          rentabilidade_pct: number
          requester_id: string
          status?: string
          summary?: Json | null
          target_id: string
          target_type?: string
          tier_id?: string | null
        }
        Update: {
          cotacao_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          offering?: string
          rentabilidade_pct?: number
          requester_id?: string
          status?: string
          summary?: Json | null
          target_id?: string
          target_type?: string
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "approval_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_role_members: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_role_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "approval_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_roles: {
        Row: {
          created_at: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      approval_tier_roles: {
        Row: {
          id: string
          role_id: string
          tier_id: string
        }
        Insert: {
          id?: string
          role_id: string
          tier_id: string
        }
        Update: {
          id?: string
          role_id?: string
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_tier_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "approval_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_tier_roles_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "approval_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_tiers: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          label: string
          max_pct: number | null
          min_pct: number | null
          mode: string
          offering: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          label: string
          max_pct?: number | null
          min_pct?: number | null
          mode?: string
          offering: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          label?: string
          max_pct?: number | null
          min_pct?: number | null
          mode?: string
          offering?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      base_conhecimento: {
        Row: {
          atualizado_em: string
          conteudo_parsed: Json | null
          conteudo_texto: string | null
          criado_em: string
          id: string
          nome_arquivo: string
          tipo: string
          total_registros: number | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          conteudo_parsed?: Json | null
          conteudo_texto?: string | null
          criado_em?: string
          id?: string
          nome_arquivo: string
          tipo: string
          total_registros?: number | null
          user_id: string
        }
        Update: {
          atualizado_em?: string
          conteudo_parsed?: Json | null
          conteudo_texto?: string | null
          criado_em?: string
          id?: string
          nome_arquivo?: string
          tipo?: string
          total_registros?: number | null
          user_id?: string
        }
        Relationships: []
      }
      config_precificacao: {
        Row: {
          atualizado_em: string
          encargos_pct: number
          horas_mensais: number
          id: string
          margem_pct: number
          overhead_pct: number
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          encargos_pct?: number
          horas_mensais?: number
          id?: string
          margem_pct?: number
          overhead_pct?: number
          user_id: string
        }
        Update: {
          atualizado_em?: string
          encargos_pct?: number
          horas_mensais?: number
          id?: string
          margem_pct?: number
          overhead_pct?: number
          user_id?: string
        }
        Relationships: []
      }
      cotacoes: {
        Row: {
          area: string
          atualizado_em: string
          cargo: string
          cliente: string
          comissao_pct: number | null
          competencias: string[] | null
          criado_em: string
          custo_total: number
          descricao_cargo: string | null
          encargos_pct: number
          excluido: boolean
          extras: Json | null
          horas_mensais: number
          ia_competencias_chave: string[] | null
          ia_descricao_original: string | null
          ia_indice_aderencia: number | null
          ia_justificativa: string | null
          id: string
          impostos_pct: number | null
          margem_pct: number
          nivel: string
          observacoes: string | null
          origem: string
          overhead_pct: number
          salario_base: number
          scope: string
          user_id: string
          valida_ate: string
          valor_hora: number
          valor_sprint: number
          valor_venda: number
        }
        Insert: {
          area: string
          atualizado_em?: string
          cargo: string
          cliente: string
          comissao_pct?: number | null
          competencias?: string[] | null
          criado_em?: string
          custo_total: number
          descricao_cargo?: string | null
          encargos_pct: number
          excluido?: boolean
          extras?: Json | null
          horas_mensais: number
          ia_competencias_chave?: string[] | null
          ia_descricao_original?: string | null
          ia_indice_aderencia?: number | null
          ia_justificativa?: string | null
          id?: string
          impostos_pct?: number | null
          margem_pct: number
          nivel: string
          observacoes?: string | null
          origem: string
          overhead_pct: number
          salario_base: number
          scope?: string
          user_id: string
          valida_ate: string
          valor_hora: number
          valor_sprint: number
          valor_venda: number
        }
        Update: {
          area?: string
          atualizado_em?: string
          cargo?: string
          cliente?: string
          comissao_pct?: number | null
          competencias?: string[] | null
          criado_em?: string
          custo_total?: number
          descricao_cargo?: string | null
          encargos_pct?: number
          excluido?: boolean
          extras?: Json | null
          horas_mensais?: number
          ia_competencias_chave?: string[] | null
          ia_descricao_original?: string | null
          ia_indice_aderencia?: number | null
          ia_justificativa?: string | null
          id?: string
          impostos_pct?: number | null
          margem_pct?: number
          nivel?: string
          observacoes?: string | null
          origem?: string
          overhead_pct?: number
          salario_base?: number
          scope?: string
          user_id?: string
          valida_ate?: string
          valor_hora?: number
          valor_sprint?: number
          valor_venda?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      offerings: {
        Row: {
          created_at: string
          group_id: string
          id: string
          name: string
          slug: string
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      parameter_profiles: {
        Row: {
          created_at: string
          group_slug: string
          id: string
          name: string
          offering_slug: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_slug?: string
          id?: string
          name: string
          offering_slug?: string
          payload: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_slug?: string
          id?: string
          name?: string
          offering_slug?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_presets: {
        Row: {
          account_manager: string | null
          bu_architect: string | null
          bu_specialist: string | null
          client_name: string | null
          contract_term: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          group_slug: string
          id: string
          name: string
          offering_slug: string
          payload: Json
          quote_code: string | null
          salesforce_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_manager?: string | null
          bu_architect?: string | null
          bu_specialist?: string | null
          client_name?: string | null
          contract_term?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          group_slug?: string
          id?: string
          name: string
          offering_slug?: string
          payload: Json
          quote_code?: string | null
          salesforce_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_manager?: string | null
          bu_architect?: string | null
          bu_specialist?: string | null
          client_name?: string | null
          contract_term?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          group_slug?: string
          id?: string
          name?: string
          offering_slug?: string
          payload?: Json
          quote_code?: string | null
          salesforce_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_login_at: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_login_at?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_login_at?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          id: string
          permission_key: string
          role_id: string
        }
        Insert: {
          allowed?: boolean
          id?: string
          permission_key: string
          role_id: string
        }
        Update: {
          allowed?: boolean
          id?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_app_state: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approval_approver: { Args: { _request_id: string }; Returns: boolean }
      is_approval_requester: { Args: { _request_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      revert_app_default: {
        Args: { _key: string; _version: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "arquiteto" | "gestor_operacao" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "arquiteto", "gestor_operacao", "custom"],
    },
  },
} as const
