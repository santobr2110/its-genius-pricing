import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { proximoCodigoTRN, type ConfigCarrinho, type LinhaCarrinho } from "@/lib/treinamento/carrinho";

export const TRN_GROUP = "observabilidade";
export const TRN_OFFERING = "treinamento";

export interface TreinamentoPayload { linhas: LinhaCarrinho[]; config: ConfigCarrinho; resumo?: Record<string, unknown> }
export interface TreinamentoCotacao {
  id: string; name: string; client_name: string | null; quote_code: string | null;
  payload: TreinamentoPayload; updated_at: string; user_id: string;
}

/** Rascunhos/cotações do Treinamento em pricing_presets (observabilidade/treinamento). */
export function useTreinamentoCotacoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["trn-cotacoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_presets")
        .select("id,name,client_name,quote_code,payload,updated_at,user_id")
        .eq("group_slug", TRN_GROUP).eq("offering_slug", TRN_OFFERING).is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TreinamentoCotacao[];
    },
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["trn-cotacoes"] }), [qc]);

  const salvar = useCallback(async (id: string | null, name: string, clientName: string, payload: TreinamentoPayload) => {
    if (!user) throw new Error("Sessão expirada");
    if (id) {
      const { error } = await supabase.from("pricing_presets").update({ name, client_name: clientName || null, payload: payload as never }).eq("id", id);
      if (error) throw error;
      await refresh();
      return id;
    }
    const { data: codes } = await supabase.from("pricing_presets").select("quote_code").like("quote_code", "ITS-TRN-%");
    const quote_code = proximoCodigoTRN((codes ?? []).map((c) => c.quote_code));
    const { data, error } = await supabase.from("pricing_presets").insert({
      user_id: user.id, name, client_name: clientName || null, payload: payload as never,
      group_slug: TRN_GROUP, offering_slug: TRN_OFFERING, quote_code,
    }).select("id").single();
    if (error) throw error;
    await refresh();
    return data.id as string;
  }, [user, refresh]);

  const excluir = useCallback(async (id: string) => {
    const { error } = await supabase.from("pricing_presets").update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null }).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  return { lista: q.data ?? [], loading: q.isLoading, salvar, excluir, refresh };
}
