import { useCallback, useMemo } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useCatalogoCentral } from "@/hooks/useCatalogoCentral";
import {
  AJUSTES_COTACAO_KEY, AJUSTES_COTACAO_PADRAO, aplicarAjustesCotacao, normalizarAjustes,
  type AjusteRotina, type AjustesCotacao,
} from "@/lib/ajustesCotacao";

/** Catálogo vigente (central ou cópia da cotação) com os ajustes desta cotação. */
export function useCatalogoDaCotacao() {
  const cat = useCatalogoCentral();
  const [bruto, setBruto] = usePersistentState<AjustesCotacao>(AJUSTES_COTACAO_KEY, AJUSTES_COTACAO_PADRAO);
  const ajustes = useMemo(() => normalizarAjustes(bruto), [bruto]);
  const aplicado = useMemo(() => aplicarAjustesCotacao(cat.rotinas, cat.gmuds, ajustes), [cat.rotinas, cat.gmuds, ajustes]);

  const ajustarRotina = useCallback((id: string, a: AjusteRotina | null) => {
    setBruto((prev) => {
      const p = normalizarAjustes(prev);
      const rotinas = { ...p.rotinas };
      if (a && Object.keys(a).length) rotinas[id] = a; else delete rotinas[id];
      return { ...p, rotinas };
    });
  }, [setBruto]);
  const toggleGmud = useCallback((id: string) => {
    setBruto((prev) => {
      const p = normalizarAjustes(prev);
      const gmudsOff = p.gmudsOff.includes(id) ? p.gmudsOff.filter((x) => x !== id) : [...p.gmudsOff, id];
      return { ...p, gmudsOff };
    });
  }, [setBruto]);
  const limparRotinas = useCallback(() => setBruto((prev) => ({ ...normalizarAjustes(prev), rotinas: {} })), [setBruto]);

  return {
    ...cat,
    rotinas: aplicado.rotinas,
    gmuds: aplicado.gmuds,
    gmudsCatalogo: cat.gmuds,
    ignorados: aplicado.ignorados,
    ajustes,
    ajustarRotina,
    toggleGmud,
    limparRotinas,
  };
}
