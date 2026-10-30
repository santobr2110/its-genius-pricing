import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SreCampanha, SreContent, SrePacote, SreParam } from "@/lib/sre/calc";

export function useSreCadastro() {
  const [pacotes, setPacotes] = useState<SrePacote[]>([]);
  const [contents, setContents] = useState<SreContent[]>([]);
  const [params, setParams] = useState<SreParam[]>([]);
  const [campanhas, setCampanhas] = useState<SreCampanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from("sre_pacotes").select("*").order("ordem"),
      supabase.from("sre_pacote_content").select("*"),
      supabase.from("sre_params").select("*").order("ordem"),
      supabase.from("sre_campanhas").select("*").order("vigencia_inicio", { ascending: false }),
    ]);
    const err = a.error || b.error || c.error || d.error;
    setError(err ? err.message : null);
    if (!err) {
      setPacotes((a.data ?? []) as unknown as SrePacote[]);
      setContents((b.data ?? []) as unknown as SreContent[]);
      setParams((c.data ?? []) as unknown as SreParam[]);
      setCampanhas((d.data ?? []) as unknown as SreCampanha[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { pacotes, contents, params, campanhas, loading, error, refresh };
}

export type SreCadastro = ReturnType<typeof useSreCadastro>;
