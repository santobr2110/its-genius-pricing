import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aliquotasEfetivas, type ServiceCode, type ServiceCodeIss, type TaxCode, type TaxRate } from "@/lib/pricing/taxRates";

/** Cadastro tributário compartilhado por todas as ofertas. `rates` = alíquotas efetivas por produto. */
export function useTaxCodes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["tax-codes"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [c, r, s, i] = await Promise.all([
        supabase.from("tax_product_codes").select("*").order("codigo"),
        supabase.from("tax_product_code_rates").select("*").order("municipio"),
        supabase.from("service_codes").select("*").order("lc116_item"),
        supabase.from("service_code_iss").select("*").order("municipio"),
      ]);
      for (const x of [c, r, s, i]) if (x.error) throw x.error;
      const codes = (c.data ?? []) as TaxCode[];
      const proprias = (r.data ?? []) as TaxRate[];
      const servicos = (s.data ?? []) as ServiceCode[];
      const iss = (i.data ?? []) as ServiceCodeIss[];
      return { codes, proprias, servicos, iss, rates: aliquotasEfetivas(codes, proprias, servicos, iss) };
    },
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["tax-codes"] }), [qc]);
  return {
    codes: q.data?.codes ?? [],
    rates: q.data?.rates ?? [],
    proprias: q.data?.proprias ?? [],
    servicos: q.data?.servicos ?? [],
    iss: q.data?.iss ?? [],
    loading: q.isLoading, error: q.error, refresh,
  };
}
