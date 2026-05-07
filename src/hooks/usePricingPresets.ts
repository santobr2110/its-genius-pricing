import { useCallback, useEffect, useState } from "react";
import type { ITSMState } from "./useITSMCalculator";
import type { N1TeamState } from "./useN1TeamState";
import type { N2TeamState } from "./useN2TeamState";

export interface PricingPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  calculator: ITSMState;
  n1Team: N1TeamState;
  n2Team?: N2TeamState;
}

const KEY = "itsm:presets:v1";

function read(): PricingPreset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PricingPreset[];
  } catch {
    return [];
  }
}

function write(list: PricingPreset[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("itsm:presets:changed"));
}

export function usePricingPresets() {
  const [presets, setPresets] = useState<PricingPreset[]>(() => read());

  useEffect(() => {
    const refresh = () => setPresets(read());
    window.addEventListener("itsm:presets:changed", refresh);
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) refresh();
    });
    return () => window.removeEventListener("itsm:presets:changed", refresh);
  }, []);

  const save = useCallback((name: string, calculator: ITSMState, n1Team: N1TeamState, n2Team?: N2TeamState) => {
    const now = Date.now();
    const list = read();
    const preset: PricingPreset = {
      id: `preset-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || `Precificação ${new Date(now).toLocaleString("pt-BR")}`,
      createdAt: now,
      updatedAt: now,
      calculator,
      n1Team,
      n2Team,
    };
    write([preset, ...list]);
    return preset;
  }, []);

  const overwrite = useCallback((id: string, calculator: ITSMState, n1Team: N1TeamState, n2Team?: N2TeamState) => {
    const list = read().map((p) =>
      p.id === id ? { ...p, calculator, n1Team, n2Team, updatedAt: Date.now() } : p
    );
    write(list);
  }, []);

  const rename = useCallback((id: string, name: string) => {
    write(read().map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((p) => p.id !== id));
  }, []);

  return { presets, save, overwrite, rename, remove };
}
