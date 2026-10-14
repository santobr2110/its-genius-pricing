import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { proximoCodigoTRN, type ConfigCarrinho, type LinhaCarrinho } from "@/lib/treinamento/carrinho";

export const TRN_GROUP = "observabilidade";
export const TRN_OFFERING = "treinamento";

export interface TreinamentoPayload { linhas: LinhaCarrinho[]; config: ConfigCarrinho; resumo?: Record<string, unknown> }
export interface TreinamentoMeta { gerenteConta?: string; especialistaBU?: string; salesforce?: string; arquitetoBU?: string }
export interface TreinamentoCotacao {
  id: string; name: string; client_name: string | null; quote_code: string | null;
  account_manager: string | null; bu_specialist: string | null; salesforce_code: string | null; bu_architect: string | null;
  payload: TreinamentoPayload; updated_at: string; user_id: string;
  saved_by_name?: string | null; saved_by_email?: string | null;
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
        .select("id,name,client_name,quote_code,account_manager,bu_specialist,salesforce_code,bu_architect,payload,updated_at,user_id")
        .eq("group_slug", TRN_GROUP).eq("offering_slug", TRN_OFFERING).is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as TreinamentoCotacao[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        const m = new Map((profs ?? []).map((p) => [p.id as string, p]));
        rows.forEach((r) => { const p = m.get(r.user_id); r.saved_by_name = p?.full_name ?? null; r.saved_by_email = p?.email ?? null; });
      }
      return rows;
    },
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["trn-cotacoes"] }), [qc]);

  const salvar = useCallback(async (id: string | null, name: string, clientName: string, payload: TreinamentoPayload, meta: TreinamentoMeta = {}) => {
    const extra = {
      account_manager: meta.gerenteConta?.trim() || null, bu_specialist: meta.especialistaBU?.trim() || null,
      salesforce_code: meta.salesforce?.trim() || null, bu_architect: meta.arquitetoBU?.trim() || null,
    };
    if (!user) throw new Error("Sessão expirada");
    // Cotação excluída (ou inexistente) aberta na tela: salva como nova em vez de gravar no registro oculto.
    const { data: atual } = id
      ? await supabase.from("pricing_presets").select("payload,deleted_at").eq("id", id).maybeSingle()
      : { data: null };
    if (id && atual && !atual.deleted_at) {
      // Preserva as versões de proposta já emitidas (valores congelados).
      const emissoes = (atual.payload as { emissoes?: unknown[] } | null)?.emissoes;
      const merged = emissoes ? { ...payload, emissoes } : payload;
      const { error } = await supabase.from("pricing_presets").update({ name, client_name: clientName || null, ...extra, payload: merged as never }).eq("id", id);
      if (error) throw error;
      await refresh();
      return id;
    }
    const { data: codes } = await supabase.from("pricing_presets").select("quote_code").like("quote_code", "ITS-TRN-%");
    const quote_code = proximoCodigoTRN((codes ?? []).map((c) => c.quote_code));
    const { data, error } = await supabase.from("pricing_presets").insert({
      user_id: user.id, name, client_name: clientName || null, ...extra, payload: payload as never,
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

  /** Edita só os dados comerciais (não mexe nos itens nem nos valores). */
  const editarDados = useCallback(async (id: string, d: { name: string; client_name: string; account_manager: string; bu_specialist: string; salesforce_code: string; bu_architect: string }) => {
    const t = (s: string) => s.trim() || null;
    const { error } = await supabase.from("pricing_presets").update({
      name: d.name.trim() || "Sem nome", client_name: t(d.client_name), account_manager: t(d.account_manager),
      bu_specialist: t(d.bu_specialist), salesforce_code: t(d.salesforce_code), bu_architect: t(d.bu_architect),
    }).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const transferir = useCallback(async (id: string, novoDono: string) => {
    const { error } = await supabase.rpc("transfer_pricing_preset", { _preset_id: id, _new_owner: novoDono });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { lista: q.data ?? [], loading: q.isLoading, salvar, excluir, editarDados, transferir, refresh };
}
