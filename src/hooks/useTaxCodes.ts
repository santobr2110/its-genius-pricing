import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TaxCode, TaxRate } from "@/lib/pricing/taxRates";

/** Cadastro tributário compartilhado (Fase 1A: usado só pelo Treinamento). */
export function useTaxCodes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["tax-codes"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [c, r] = await Promise.all([
        supabase.from("tax_product_codes").select("*").order("codigo"),
        supabase.from("tax_product_code_rates").select("*").order("municipio"),
      ]);
      if (c.error) throw c.error;
      if (r.error) throw r.error;
      return { codes: (c.data ?? []) as TaxCode[], rates: (r.data ?? []) as TaxRate[] };
    },
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["tax-codes"] }), [qc]);
  return { codes: q.data?.codes ?? [], rates: q.data?.rates ?? [], loading: q.isLoading, error: q.error, refresh };
}
