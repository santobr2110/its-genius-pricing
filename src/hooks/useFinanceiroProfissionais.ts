import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FinanceiroProfissionais {
  encargos_pct: number;
  overhead_pct: number;
  horas_mensais: number;
  pis_pct: number;
  cofins_pct: number;
  iss_pct: number;
  irpj_csll_pct: number;
  enc_financ_pct: number;
  comissao_pct: number;
  lucro_pct: number;
}

export const DEFAULTS_PROF: FinanceiroProfissionais = {
  encargos_pct: 68,
  overhead_pct: 15,
  horas_mensais: 176,
  pis_pct: 1.65,
  cofins_pct: 7.6,
  iss_pct: 5,
  irpj_csll_pct: 11,
  enc_financ_pct: 0,
  comissao_pct: 5,
  lucro_pct: 20,
};

const KEY = "profissionais.financeiro";
const STORAGE = "prof.financeiro.v1";

/** Total de % que entra no divisor markup do PV (a + b + ... ). */
export function markupDivisorPct(c: FinanceiroProfissionais): number {
  return (
    (c.pis_pct || 0) +
    (c.cofins_pct || 0) +
    (c.iss_pct || 0) +
    (c.irpj_csll_pct || 0) +
    (c.enc_financ_pct || 0) +
    (c.comissao_pct || 0) +
    (c.lucro_pct || 0)
  );
}

function readLocal(): FinanceiroProfissionais | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? { ...DEFAULTS_PROF, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function useFinanceiroProfissionais() {
  const { user } = useAuth();
  const [config, setConfig] = useState<FinanceiroProfissionais>(() => readLocal() ?? DEFAULTS_PROF);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user) {
        setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("app_defaults")
        .select("value")
        .eq("key", KEY)
        .maybeSingle();
      if (cancel) return;
      if (data?.value && typeof data.value === "object") {
        const merged = { ...DEFAULTS_PROF, ...(data.value as object) } as FinanceiroProfissionais;
        setConfig(merged);
        try { localStorage.setItem(STORAGE, JSON.stringify(merged)); } catch {}
      }
      setLoaded(true);
    })();
    return () => { cancel = true; };
  }, [user]);

  const persist = useCallback(
    async (next: FinanceiroProfissionais) => {
      try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch {}
      if (!user) return;
      await supabase
        .from("app_defaults")
        .upsert(
          { key: KEY, value: next as any, updated_by: user.id, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
    },
    [user],
  );

  const update = useCallback(
    (patch: Partial<FinanceiroProfissionais>) => {
      setConfig((prev) => {
        const next = { ...prev, ...patch };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => persist(next), 500);
        return next;
      });
    },
    [persist],
  );

  return { config, loaded, update, markupPct: markupDivisorPct(config) };
}