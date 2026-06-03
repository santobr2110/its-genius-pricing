import { useMemo, useCallback } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  CODIGOS_PRODUTO_IMPOSTO,
  CodigoProdutoImposto,
} from "@/data/codigosProdutoImposto";

interface ProdutosStore {
  overrides: Record<string, CodigoProdutoImposto>;
  hiddenDefaults: string[];
}

const INITIAL: ProdutosStore = { overrides: {}, hiddenDefaults: [] };
const DEFAULT_CODES = new Set(CODIGOS_PRODUTO_IMPOSTO.map((p) => p.codigo));

export function useCodigosProdutoImposto() {
  const [store, setStore] = usePersistentState<ProdutosStore>(
    "financeiro.codigosProdutoCustom",
    INITIAL,
  );

  const lista = useMemo<CodigoProdutoImposto[]>(() => {
    const base = CODIGOS_PRODUTO_IMPOSTO
      .filter((d) => !store.hiddenDefaults.includes(d.codigo))
      .map((d) => store.overrides[d.codigo] ?? d);
    const extras = Object.values(store.overrides).filter(
      (p) => !DEFAULT_CODES.has(p.codigo),
    );
    return [...base, ...extras];
  }, [store]);

  const upsert = useCallback(
    (produto: CodigoProdutoImposto, originalCodigo?: string) => {
      setStore((prev) => {
        const overrides = { ...prev.overrides };
        // Renomeação de código: remove o antigo
        if (originalCodigo && originalCodigo !== produto.codigo) {
          delete overrides[originalCodigo];
          // Se o código antigo era um default, esconde-o
          if (DEFAULT_CODES.has(originalCodigo)) {
            const hidden = prev.hiddenDefaults.includes(originalCodigo)
              ? prev.hiddenDefaults
              : [...prev.hiddenDefaults, originalCodigo];
            overrides[produto.codigo] = produto;
            return { overrides, hiddenDefaults: hidden };
          }
        }
        overrides[produto.codigo] = produto;
        // Se estava oculto e voltou a existir, remove do hidden
        const hidden = prev.hiddenDefaults.filter((c) => c !== produto.codigo);
        return { overrides, hiddenDefaults: hidden };
      });
    },
    [setStore],
  );

  const remove = useCallback(
    (codigo: string) => {
      setStore((prev) => {
        const overrides = { ...prev.overrides };
        delete overrides[codigo];
        let hiddenDefaults = prev.hiddenDefaults;
        if (DEFAULT_CODES.has(codigo) && !hiddenDefaults.includes(codigo)) {
          hiddenDefaults = [...hiddenDefaults, codigo];
        }
        return { overrides, hiddenDefaults };
      });
    },
    [setStore],
  );

  const resetCodigo = useCallback(
    (codigo: string) => {
      setStore((prev) => {
        const overrides = { ...prev.overrides };
        delete overrides[codigo];
        const hiddenDefaults = prev.hiddenDefaults.filter((c) => c !== codigo);
        return { overrides, hiddenDefaults };
      });
    },
    [setStore],
  );

  const isDefault = useCallback((codigo: string) => DEFAULT_CODES.has(codigo), []);
  const isCustomized = useCallback(
    (codigo: string) => !!store.overrides[codigo],
    [store.overrides],
  );

  return { lista, upsert, remove, resetCodigo, isDefault, isCustomized };
}