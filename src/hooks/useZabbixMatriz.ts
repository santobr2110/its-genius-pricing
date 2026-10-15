import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LinhaMatrizNivel } from "@/lib/zabbix/proposta";

export type LinhaMatrizDb = LinhaMatrizNivel & { id: string };

export function useZabbixMatriz() {
  const [linhas, setLinhas] = useState<LinhaMatrizDb[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("zabbix_matriz_niveis").select("*").order("secao").order("ordem");
    setLinhas((data ?? []) as LinhaMatrizDb[]);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { linhas, loading, refresh };
}
