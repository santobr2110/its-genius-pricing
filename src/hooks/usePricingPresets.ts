import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ITSMState } from "./useITSMCalculator";
import type { N1TeamState } from "./useN1TeamState";
import type { N2TeamState } from "./useN2TeamState";
import type {
  EscopoProposicao,
  ItemAdicional,
} from "@/data/escopoProposicao";
import type { ParamPayload } from "./useParameterProfiles";

// Oferta atual a qual estes presets pertencem.
// (Smart ITO é a única oferta com calculadora completa hoje.)
const GROUP_SLUG = "ito";
const OFFERING_SLUG = "smart-ito";

export interface PresetVolumes {
  chamadosAtivosMes: number;
  chamadosPorAtivo: number;
}

export interface PresetEscopo {
  proposicao?: EscopoProposicao;
  restricoesGerais?: string[];
  itensAdicionais?: ItemAdicional[];
}

export interface PricingPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  calculator: ITSMState;
  n1Team: N1TeamState;
  n2Team?: N2TeamState;
  volumes?: PresetVolumes;
  escopo?: PresetEscopo;
  salesforceCode?: string | null;
  userId: string;
  savedByName?: string | null;
  savedByEmail?: string | null;
  clientName?: string | null;
  accountManager?: string | null;
  buSpecialist?: string | null;
  contractTerm?: string | null;
  buArchitect?: string | null;
  quoteCode?: string | null;
  /**
   * Snapshot completo dos parâmetros persistidos (mesma cobertura dos
   * Perfis de Parâmetros): equipes N1/N2/Field, rotinas, GMUDs, cortes
   * Smart Perf e escopo. Garante restauração 100% fiel.
   */
  allParams?: ParamPayload;
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
  payload: {
    calculator: ITSMState;
    n1Team: N1TeamState;
    n2Team?: N2TeamState;
    volumes?: PresetVolumes;
    escopo?: PresetEscopo;
    allParams?: ParamPayload;
  };
  created_at: string;
  updated_at: string;
}

function fromRow(r: DbRow, profileById?: Map<string, { full_name: string | null; email: string | null }>): PricingPreset {
  const prof = profileById?.get(r.user_id);
  return {
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    calculator: r.payload.calculator,
    n1Team: r.payload.n1Team,
    n2Team: r.payload.n2Team,
    volumes: r.payload.volumes,
    escopo: r.payload.escopo,
    allParams: r.payload.allParams,
    salesforceCode: r.salesforce_code ?? null,
    userId: r.user_id,
    savedByName: prof?.full_name ?? null,
    savedByEmail: prof?.email ?? null,
    clientName: r.client_name ?? null,
    accountManager: r.account_manager ?? null,
    buSpecialist: r.bu_specialist ?? null,
    contractTerm: r.contract_term ?? null,
    buArchitect: r.bu_architect ?? null,
    quoteCode: r.quote_code ?? null,
  };
}

export interface PresetCommercial {
  clientName: string;
  accountManager: string;
  buSpecialist: string;
  contractTerm: string;
  buArchitect: string;
}

function generateQuoteCode() {
  const n = Math.floor(1000000 + Math.random() * 9000000);
  return `ITS-SMART-ITO-${n}`;
}

export function usePricingPresets({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [presets, setPresets] = useState<PricingPreset[]>([]);
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
      calculator: ITSMState,
      n1Team: N1TeamState,
      n2Team?: N2TeamState,
      volumes?: PresetVolumes,
      escopo?: PresetEscopo,
      allParams?: ParamPayload,
      salesforceCode?: string | null,
      commercial?: PresetCommercial,
    ): Promise<PricingPreset> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login para salvar precificações.");
      const finalName = name.trim() || `Precificação ${new Date().toLocaleString("pt-BR")}`;
      const payload = { calculator, n1Team, n2Team, volumes, escopo, allParams };
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
    async (
      id: string,
      calculator: ITSMState,
      n1Team: N1TeamState,
      n2Team?: N2TeamState,
      volumes?: PresetVolumes,
      escopo?: PresetEscopo,
      allParams?: ParamPayload,
    ) => {
      const payload = { calculator, n1Team, n2Team, volumes, escopo, allParams };
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

  const updateSalesforceCode = useCallback(
    async (id: string, salesforceCode: string | null) => {
      const { error } = await supabase
        .from("pricing_presets")
        .update({ salesforce_code: salesforceCode?.trim() || null })
        .eq("id", id);
      if (!error) refresh();
    },
    [refresh],
  );

  const updateCommercial = useCallback(
    async (
      id: string,
      patch: { name?: string; salesforceCode?: string | null } & Partial<PresetCommercial>,
    ) => {
      const update: Record<string, unknown> = {};
      if (patch.name !== undefined) update.name = patch.name.trim() || "Sem nome";
      if (patch.salesforceCode !== undefined)
        update.salesforce_code = patch.salesforceCode?.toString().trim() || null;
      if (patch.clientName !== undefined)
        update.client_name = patch.clientName?.trim() || null;
      if (patch.accountManager !== undefined)
        update.account_manager = patch.accountManager?.trim() || null;
      if (patch.buSpecialist !== undefined)
        update.bu_specialist = patch.buSpecialist?.trim() || null;
      if (patch.contractTerm !== undefined)
        update.contract_term = patch.contractTerm?.trim() || null;
      if (patch.buArchitect !== undefined)
        update.bu_architect = patch.buArchitect?.trim() || null;
      const { error } = await supabase
        .from("pricing_presets")
        .update(update as unknown as never)
        .eq("id", id);
      if (!error) refresh();
      return !error;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("pricing_presets")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        } as unknown as never)
        .eq("id", id);
      if (!error) refresh();
    },
    [refresh],
  );

  return { presets, loading, save, overwrite, rename, remove, refresh, updateSalesforceCode, updateCommercial };
}
