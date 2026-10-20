import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { proximoCodigoBS, type ConfigBS, type LinhaBS, type SnapshotBS } from "@/lib/bodyshop/carrinho";

export const BS_GROUP = "ito";
export const BS_OFFERING = "profissionais-alocados";

export interface BodyshopPayload { emissoes?: unknown[]; linhas: LinhaBS[]; config: ConfigBS; snapshot?: SnapshotBS; resumo?: Record<string, unknown> }
export interface BodyshopMeta { gerenteConta?: string; especialistaBU?: string; salesforce?: string; arquitetoBU?: string }
export interface BodyshopCotacao {
  id: string; name: string; client_name: string | null; quote_code: string | null;
  account_manager: string | null; bu_specialist: string | null; salesforce_code: string | null; bu_architect: string | null;
  contract_term: string | null; payload: BodyshopPayload; updated_at: string; user_id: string;
  saved_by_name?: string | null; saved_by_email?: string | null;
}

/** Cotações BodyShop isoladas em pricing_presets (ito/profissionais-alocados). */
export function useBodyshopCotacoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["bs-cotacoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_presets")
        .select("id,name,client_name,quote_code,account_manager,bu_specialist,salesforce_code,bu_architect,payload,updated_at,user_id,contract_term")
        .eq("group_slug", BS_GROUP).eq("offering_slug", BS_OFFERING).is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as BodyshopCotacao[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        const m = new Map((profs ?? []).map((p) => [p.id as string, p]));
        rows.forEach((r) => { const p = m.get(r.user_id); r.saved_by_name = p?.full_name ?? null; r.saved_by_email = p?.email ?? null; });
      }
      return rows;
    },
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["bs-cotacoes"] }), [qc]);

  const salvar = useCallback(async (id: string | null, name: string, clientName: string, payload: BodyshopPayload, meta: BodyshopMeta = {}) => {
    const extra = {
      contract_term: String(payload.config.duracaoMeses),
      account_manager: meta.gerenteConta?.trim() || null, bu_specialist: meta.especialistaBU?.trim() || null,
      salesforce_code: meta.salesforce?.trim() || null, bu_architect: meta.arquitetoBU?.trim() || null,
    };
    if (!user) throw new Error("Sessão expirada");
    const { data: atual } = id
      ? await supabase.from("pricing_presets").select("payload,deleted_at,quote_code").eq("group_slug", BS_GROUP).eq("offering_slug", BS_OFFERING).eq("id", id).maybeSingle()
      : { data: null };
    if (id && (!atual || atual.deleted_at)) throw new Error("Cotação não encontrada nesta oferta");
    if (id && atual && !atual.deleted_at) {
      const emissoes = (atual.payload as { emissoes?: unknown[] } | null)?.emissoes;
      const merged = emissoes ? { ...payload, emissoes } : payload;
      const { error } = await supabase.from("pricing_presets").update({ name, client_name: clientName || null, ...extra, payload: merged as never }).eq("group_slug", BS_GROUP).eq("offering_slug", BS_OFFERING).eq("id", id);
      if (error) throw error;
      await refresh();
      return { id, codigo: atual.quote_code as string | null };
    }
    const { data: codes } = await supabase.from("pricing_presets").select("quote_code").eq("group_slug", BS_GROUP).eq("offering_slug", BS_OFFERING).like("quote_code", "ITS-BS-%");
    const quote_code = proximoCodigoBS((codes ?? []).map((c) => c.quote_code));
    const { data, error } = await supabase.from("pricing_presets").insert({
      user_id: user.id, name, client_name: clientName || null, ...extra, payload: payload as never,
      group_slug: BS_GROUP, offering_slug: BS_OFFERING, quote_code,
    }).select("id").single();
    if (error) throw error;
    await refresh();
    return { id: data.id as string, codigo: quote_code };
  }, [user, refresh]);

  const excluir = useCallback(async (id: string) => {
    const { error } = await supabase.from("pricing_presets").update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null }).eq("group_slug", BS_GROUP).eq("offering_slug", BS_OFFERING).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const editarDados = useCallback(async (id: string, d: { name: string; client_name: string; account_manager: string; bu_specialist: string; salesforce_code: string; bu_architect: string }) => {
    const t = (s: string) => s.trim() || null;
    const { error } = await supabase.from("pricing_presets").update({
      name: d.name.trim() || "Sem nome", client_name: t(d.client_name), account_manager: t(d.account_manager),
      bu_specialist: t(d.bu_specialist), salesforce_code: t(d.salesforce_code), bu_architect: t(d.bu_architect),
    }).eq("group_slug", BS_GROUP).eq("offering_slug", BS_OFFERING).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const transferir = useCallback(async (id: string, novoDono: string) => {
    const { data: owned, error: lookup } = await supabase.from("pricing_presets").select("id").eq("group_slug", BS_GROUP).eq("offering_slug", BS_OFFERING).eq("id", id).is("deleted_at", null).maybeSingle();
    if (lookup) throw lookup;
    if (!owned) throw new Error("Cotação não encontrada nesta oferta");
    const { error } = await supabase.rpc("transfer_pricing_preset", { _preset_id: id, _new_owner: novoDono });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { lista: q.data ?? [], loading: q.isLoading, salvar, excluir, editarDados, transferir, refresh };
}
