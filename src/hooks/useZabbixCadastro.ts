import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ZabbixContent, ZabbixParam, ZabbixSubscription } from "@/lib/zabbix/calc";

export function useZabbixCadastro() {
  const [subs, setSubs] = useState<ZabbixSubscription[]>([]);
  const [contents, setContents] = useState<ZabbixContent[]>([]);
  const [params, setParams] = useState<ZabbixParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("zabbix_subscriptions").select("*").order("ordem"),
      supabase.from("zabbix_subscription_content").select("*"),
      supabase.from("zabbix_params").select("*").order("ordem"),
    ]);
    const err = a.error || b.error || c.error;
    setError(err ? err.message : null);
    if (!err) {
      setSubs((a.data ?? []) as unknown as ZabbixSubscription[]);
      setContents((b.data ?? []) as unknown as ZabbixContent[]);
      setParams((c.data ?? []) as unknown as ZabbixParam[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { subs, contents, params, loading, error, refresh };
}

export type ZbxCadastro = ReturnType<typeof useZabbixCadastro>;
