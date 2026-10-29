import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PARAMETROS_FINANCEIROS_KEY, parametrosFinanceiros, type ParametrosFinanceiros } from "@/lib/pricing/parametrosCompartilhados";

export function useParametrosFinanceiros() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [PARAMETROS_FINANCEIROS_KEY],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_defaults").select("value").eq("key", PARAMETROS_FINANCEIROS_KEY).maybeSingle();
      if (error) throw error;
      return parametrosFinanceiros(data?.value);
    },
  });
  const salvar = async (value: ParametrosFinanceiros, userId?: string) => {
    const { error } = await supabase.from("app_defaults").upsert({ key: PARAMETROS_FINANCEIROS_KEY, value: value as never, updated_by: userId ?? null }, { onConflict: "key" }).select("key");
    if (error) throw error;
    qc.setQueryData([PARAMETROS_FINANCEIROS_KEY], value);
    await qc.invalidateQueries({ queryKey: [PARAMETROS_FINANCEIROS_KEY] });
  };
  return { ...parametrosFinanceiros(q.data), loading: q.isLoading, error: q.error, salvar };
}