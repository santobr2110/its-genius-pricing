import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type KbTipo = "cargos_salarios" | "descritivos";

export interface KbRow {
  id: string;
  tipo: KbTipo;
  nome_arquivo: string;
  conteudo_texto: string | null;
  conteudo_parsed: any;
  total_registros: number | null;
  atualizado_em: string;
}

export function useKnowledgeBase() {
  const { user } = useAuth();
  const [items, setItems] = useState<KbRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("base_conhecimento")
      .select("id, tipo, nome_arquivo, conteudo_texto, conteudo_parsed, total_registros, atualizado_em")
      .eq("user_id", user.id)
      .order("atualizado_em", { ascending: false });
    setItems((data ?? []) as KbRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (tipo: KbTipo, payload: { nome_arquivo: string; conteudo_texto?: string | null; conteudo_parsed?: any; total_registros?: number }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("base_conhecimento")
        .insert({ user_id: user.id, tipo, atualizado_em: new Date().toISOString(), ...payload });
      if (error) throw error;
      await refresh();
    },
    [user, refresh],
  );

  const removeOne = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("base_conhecimento").delete().eq("user_id", user.id).eq("id", id);
      await refresh();
    },
    [user, refresh],
  );

  const removeAll = useCallback(
    async (tipo: KbTipo) => {
      if (!user) return;
      await supabase.from("base_conhecimento").delete().eq("user_id", user.id).eq("tipo", tipo);
      await refresh();
    },
    [user, refresh],
  );

  const byTipo = useMemo(() => {
    const map: Record<KbTipo, KbRow[]> = { cargos_salarios: [], descritivos: [] };
    items.forEach((r) => map[r.tipo as KbTipo]?.push(r));
    return map;
  }, [items]);

  return { items, byTipo, loading, refresh, add, removeOne, removeAll };
}