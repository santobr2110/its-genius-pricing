import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REFORMA_CBS_KEY } from "@/lib/pricing/reformaTributaria";

/** Alíquota central da CBS (null = ainda não definida). Sempre a atual, inclusive em cotações salvas. */
export function useReformaCBS() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [REFORMA_CBS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_defaults").select("value").eq("key", REFORMA_CBS_KEY).maybeSingle();
      if (error) throw error;
      const v = (data?.value ?? {}) as { aliquotaPerc?: number | null };
      return typeof v.aliquotaPerc === "number" ? v.aliquotaPerc : null;
    },
  });
  const salvar = async (aliquotaPerc: number | null, userId?: string) => {
    const { error } = await supabase.from("app_defaults").upsert({ key: REFORMA_CBS_KEY, value: { aliquotaPerc }, updated_by: userId ?? null }, { onConflict: "key" });
    if (error) throw error;
    qc.setQueryData([REFORMA_CBS_KEY], aliquotaPerc);
  };
  return { cbsPerc: q.data ?? null, loading: q.isLoading, salvar };
}
