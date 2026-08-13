import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceDeskState } from "@/lib/servicedesk/types";
import type { SDTeamState } from "./useServiceDeskTeamState";
import type { ItemAdicionalSD } from "@/lib/servicedesk/itensAdicionaisSD";

const GROUP_SLUG = "ito";
const OFFERING_SLUG = "smart-service-desk";

export interface ServiceDeskPresetPayload {
  state: ServiceDeskState;
  team: SDTeamState;
  itensAdicionais?: ItemAdicionalSD[];
  rotinasOff?: string[];
}

export interface ServiceDeskPricingPreset extends ServiceDeskPresetPayload {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  savedByName?: string | null;
  savedByEmail?: string | null;
  salesforceCode?: string | null;
  clientName?: string | null;
  accountManager?: string | null;
  buSpecialist?: string | null;
  contractTerm?: string | null;
  buArchitect?: string | null;
  quoteCode?: string | null;
}

export interface SDPresetCommercial {
  clientName: string;
  accountManager: string;
  buSpecialist: string;
  contractTerm: string;
  buArchitect: string;
}

interface DbRow {
  id: string;
  name: string;
  user_id: string;
  salesforce_code: string | null;
  client_name: string | null;
  account_manager: string | null;
  bu_specialist: string | null;
  contract_term: string | null;
  bu_architect: string | null;
  quote_code: string | null;
  payload: ServiceDeskPresetPayload;
  created_at: string;
  updated_at: string;
}

function fromRow(
  r: DbRow,
  profileById?: Map<string, { full_name: string | null; email: string | null }>,
): ServiceDeskPricingPreset {
  const prof = profileById?.get(r.user_id);
  return {
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    userId: r.user_id,
    state: r.payload?.state,
    team: r.payload?.team,
    itensAdicionais: r.payload?.itensAdicionais,
    rotinasOff: r.payload?.rotinasOff,
    savedByName: prof?.full_name ?? null,
    savedByEmail: prof?.email ?? null,
    salesforceCode: r.salesforce_code ?? null,
    clientName: r.client_name ?? null,
    accountManager: r.account_manager ?? null,
    buSpecialist: r.bu_specialist ?? null,
    contractTerm: r.contract_term ?? null,
    buArchitect: r.bu_architect ?? null,
    quoteCode: r.quote_code ?? null,
  };
}

function generateQuoteCode() {
  const n = Math.floor(1000000 + Math.random() * 9000000);
  return `ITS-SMART-SD-${n}`;
}

export function useServiceDeskPricingPresets({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [presets, setPresets] = useState<ServiceDeskPricingPreset[]>([]);
  const [loading, setLoading] = useState(autoLoad);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("pricing_presets")
      .select("*")
      .eq("offering_slug", OFFERING_SLUG)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const rows = data as unknown as DbRow[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const profileById = new Map<string, { full_name: string | null; email: string | null }>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        (profs ?? []).forEach((p) =>
          profileById.set(p.id as string, {
            full_name: (p as { full_name: string | null }).full_name ?? null,
            email: (p as { email: string | null }).email ?? null,
          }),
        );
      }
      setPresets(rows.map((r) => fromRow(r, profileById)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [autoLoad, refresh]);

  const save = useCallback(
    async (
      name: string,
      payload: ServiceDeskPresetPayload,
      salesforceCode?: string | null,
      commercial?: SDPresetCommercial,
    ): Promise<ServiceDeskPricingPreset> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login para salvar precificações.");
      const finalName = name.trim() || `Precificação ${new Date().toLocaleString("pt-BR")}`;
      const { data, error } = await supabase
        .from("pricing_presets")
        .insert({
          user_id: user.id,
          name: finalName,
          payload: payload as unknown as never,
          group_slug: GROUP_SLUG,
          offering_slug: OFFERING_SLUG,
          salesforce_code: salesforceCode?.trim() || null,
          client_name: commercial?.clientName?.trim() || null,
          account_manager: commercial?.accountManager?.trim() || null,
          bu_specialist: commercial?.buSpecialist?.trim() || null,
          contract_term: commercial?.contractTerm?.trim() || null,
          bu_architect: commercial?.buArchitect?.trim() || null,
          quote_code: generateQuoteCode(),
        })
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Falha ao salvar.");
      const preset = fromRow(data as unknown as DbRow);
      setPresets((prev) => [preset, ...prev]);
      return preset;
    },
    [],
  );

  const overwrite = useCallback(
    async (id: string, payload: ServiceDeskPresetPayload) => {
      const { error } = await supabase
        .from("pricing_presets")
        .update({ payload: payload as unknown as never })
        .eq("id", id);
      if (!error) refresh();
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase.from("pricing_presets").update({ name }).eq("id", id);
      if (!error) refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("pricing_presets")
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
        .eq("id", id);
      if (!error) setPresets((prev) => prev.filter((p) => p.id !== id));
    },
    [],
  );

  return { presets, loading, refresh, save, overwrite, rename, remove };
}