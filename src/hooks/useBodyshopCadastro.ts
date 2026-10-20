import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { paramsFromRows, type BodyshopCargo, type BodyshopContent, type BodyshopParam } from "@/lib/bodyshop/calc";

export function useBodyshopCadastro() {
  const [cargos, setCargos] = useState<BodyshopCargo[]>([]);
  const [contents, setContents] = useState<BodyshopContent[]>([]);
  const [params, setParams] = useState<BodyshopParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("bodyshop_cargos").select("*").order("ordem").order("cargo").order("nivel_num"),
      supabase.from("bodyshop_cargo_content").select("*"),
      supabase.from("bodyshop_params").select("*").order("ordem"),
    ]);
    const err = a.error || b.error || c.error;
    setError(err ? err.message : null);
    if (!err) {
      setCargos((a.data ?? []) as unknown as BodyshopCargo[]);
      setContents((b.data ?? []) as unknown as BodyshopContent[]);
      setParams((c.data ?? []) as unknown as BodyshopParam[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const atualizar = () => { void refresh(); };
    window.addEventListener('bodyshop:cadastro', atualizar);
    return () => window.removeEventListener('bodyshop:cadastro', atualizar);
  }, [refresh]);
  const p = useMemo(() => paramsFromRows(params), [params]);
  return { cargos, contents, params, p, loading, error, refresh };
}

export type BsCadastro = ReturnType<typeof useBodyshopCadastro>;
