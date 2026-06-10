import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConfigPrec {
  encargos_pct: number;
  overhead_pct: number;
  margem_pct: number;
  horas_mensais: number;
}

const DEFAULTS: ConfigPrec = {
  encargos_pct: 68,
  overhead_pct: 15,
  margem_pct: 25,
  horas_mensais: 176,
};

export function useConfigPrecificacao() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigPrec>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("config_precificacao")
        .select("encargos_pct, overhead_pct, margem_pct, horas_mensais")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancel) return;
      if (data) {
        setConfig({
          encargos_pct: Number(data.encargos_pct),
          overhead_pct: Number(data.overhead_pct),
          margem_pct: Number(data.margem_pct),
          horas_mensais: Number(data.horas_mensais),
        });
      }
      setLoaded(true);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  const persist = useCallback(
    async (c: ConfigPrec) => {
      if (!user) return;
      await supabase.from("config_precificacao").upsert(
        { user_id: user.id, ...c, atualizado_em: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    },
    [user],
  );

  const update = useCallback(
    (patch: Partial<ConfigPrec>) => {
      setConfig((prev) => {
        const next = { ...prev, ...patch };
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => persist(next), 600);
        return next;
      });
    },
    [persist],
  );

  return { config, loaded, update };
}