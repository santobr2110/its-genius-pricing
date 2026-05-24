import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ITSMState } from "./useITSMCalculator";
import type { N1TeamState } from "./useN1TeamState";
import type { N2TeamState } from "./useN2TeamState";

// Oferta atual a qual estes presets pertencem.
// (Smart ITO é a única oferta com calculadora completa hoje.)
const GROUP_SLUG = "ito";
const OFFERING_SLUG = "smart-ito";

export interface PresetVolumes {
  chamadosAtivosMes: number;
  chamadosUsuariosMes: number;
  chamadosPorAtivo: number;
  chamadosPorUsuario: number;
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
}

interface DbRow {
  id: string;
  name: string;
  payload: {
    calculator: ITSMState;
    n1Team: N1TeamState;
    n2Team?: N2TeamState;
    volumes?: PresetVolumes;
  };
  created_at: string;
  updated_at: string;
}

function fromRow(r: DbRow): PricingPreset {
  return {
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    calculator: r.payload.calculator,
    n1Team: r.payload.n1Team,
    n2Team: r.payload.n2Team,
    volumes: r.payload.volumes,
  };
}

export function usePricingPresets({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [presets, setPresets] = useState<PricingPreset[]>([]);
  const [loading, setLoading] = useState(autoLoad);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("pricing_presets")
      .select("*")
      .eq("offering_slug", OFFERING_SLUG)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPresets((data as unknown as DbRow[]).map(fromRow));
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
    ): Promise<PricingPreset> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login para salvar precificações.");
      const finalName = name.trim() || `Precificação ${new Date().toLocaleString("pt-BR")}`;
      const payload = { calculator, n1Team, n2Team, volumes };
      const { data, error } = await supabase
        .from("pricing_presets")
        .insert({
          user_id: user.id,
          name: finalName,
          payload: payload as unknown as never,
          group_slug: GROUP_SLUG,
          offering_slug: OFFERING_SLUG,
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
    ) => {
      const payload = { calculator, n1Team, n2Team, volumes };
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
      const { error } = await supabase.from("pricing_presets").delete().eq("id", id);
      if (!error) refresh();
    },
    [refresh],
  );

  return { presets, loading, save, overwrite, rename, remove, refresh };
}
