import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTaxCodes } from "./useTaxCodes";
import type { ITSMState } from "./useITSMCalculator";
import { usePersistentState } from "./usePersistentState";
import { isPresetActive } from "@/lib/activePreset";
import { ITO_FISCAL_KEY, resolverFiscalITO, deveAplicarFiscalITO, aplicarFiscalITO, type VinculosFiscaisITO } from "@/lib/pricing/itoFiscal";

export function useITOVinculos() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [ITO_FISCAL_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_defaults").select("value").eq("key", ITO_FISCAL_KEY).maybeSingle();
      if (error) throw error;
      return (data?.value ?? {}) as VinculosFiscaisITO;
    },
  });
  const salvar = async (vinculos: VinculosFiscaisITO, userId: string) => {
    const { error } = await supabase.from("app_defaults").upsert({ key: ITO_FISCAL_KEY, value: vinculos, updated_by: userId }, { onConflict: "key" });
    if (error) throw error;
    qc.setQueryData([ITO_FISCAL_KEY], vinculos);
  };
  return { vinculos: q.data ?? {}, loading: q.isLoading, error: q.error, salvar };
}

export function useITOFiscal(state: ITSMState, setState: React.Dispatch<React.SetStateAction<ITSMState>>, presetLoaded: boolean) {
  const cadastro = useTaxCodes();
  const registro = useITOVinculos();
  const [municipio, setMunicipio] = usePersistentState<string>("financeiro.municipio", "Joinville");
  const next = resolverFiscalITO(state, registro.vinculos, municipio, new Date().toISOString().slice(0, 10), cadastro.codes, cadastro.rates);
  const loading = cadastro.loading || registro.loading || (isPresetActive() && !presetLoaded);
  useEffect(() => {
    if (loading || !next) return;
    setState((prev) => deveAplicarFiscalITO(prev, next, isPresetActive()) ? aplicarFiscalITO(prev, next) : prev);
  }, [loading, next?.composicao, next?.codigo, next?.sku, next?.municipio, next?.pisPerc, next?.cofinsPerc, next?.issPerc, setState]);
  const aplicar = () => { if (!loading && next) setState((prev) => aplicarFiscalITO(prev, next)); };
  return { next, loading, error: cadastro.error || registro.error, municipio, setMunicipio, aplicar };
}