import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Cotacao {
  id: string;
  cliente: string;
  observacoes: string | null;
  origem: "manual" | "ia";
  valida_ate: string;
  criado_em: string;
  cargo: string;
  area: string;
  nivel: string;
  descricao_cargo: string | null;
  competencias: string[] | null;
  salario_base: number;
  encargos_pct: number;
  overhead_pct: number;
  margem_pct: number;
  horas_mensais: number;
  custo_total: number;
  valor_venda: number;
  valor_hora: number;
  valor_sprint: number;
  ia_descricao_original: string | null;
  ia_justificativa: string | null;
  ia_indice_aderencia: number | null;
  ia_competencias_chave: string[] | null;
  scope?: string;
  impostos_pct?: number | null;
  comissao_pct?: number | null;
  extras?: Record<string, unknown> | null;
}

export type SaveCotacaoPayload = Omit<Cotacao, "id" | "criado_em">;

export function useCotacoes(scope: string = "profissionais") {
  const { user } = useAuth();
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("cotacoes")
      .select("*")
      .eq("user_id", user.id)
      .eq("scope", scope)
      .eq("excluido", false)
      .order("criado_em", { ascending: false });
    setCotacoes(((data ?? []) as unknown) as Cotacao[]);
    setLoading(false);
  }, [user, scope]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (payload: SaveCotacaoPayload) => {
      if (!user) throw new Error("Não autenticado");
      const insertPayload: any = { user_id: user.id, scope, ...payload };
      const { error } = await supabase.from("cotacoes").insert(insertPayload);
      if (error) throw error;
      await refresh();
    },
    [user, refresh, scope],
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("cotacoes").update({ excluido: true }).eq("id", id).eq("user_id", user.id);
      await refresh();
    },
    [user, refresh],
  );

  return { cotacoes, loading, refresh, save, softDelete };
}