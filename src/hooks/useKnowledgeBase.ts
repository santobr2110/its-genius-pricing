import { useEffect, useState, useCallback } from "react";
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
  const [rows, setRows] = useState<Record<KbTipo, KbRow | null>>({ cargos_salarios: null, descritivos: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("base_conhecimento")
      .select("id, tipo, nome_arquivo, conteudo_texto, conteudo_parsed, total_registros, atualizado_em")
      .eq("user_id", user.id);
    const map: Record<KbTipo, KbRow | null> = { cargos_salarios: null, descritivos: null };
    (data ?? []).forEach((r: any) => {
      map[r.tipo as KbTipo] = r as KbRow;
    });
    setRows(map);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsert = useCallback(
    async (tipo: KbTipo, payload: { nome_arquivo: string; conteudo_texto?: string | null; conteudo_parsed?: any; total_registros?: number }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("base_conhecimento")
        .upsert(
          { user_id: user.id, tipo, atualizado_em: new Date().toISOString(), ...payload },
          { onConflict: "user_id,tipo" },
        );
      if (error) throw error;
      await refresh();
    },
    [user, refresh],
  );

  const remove = useCallback(
    async (tipo: KbTipo) => {
      if (!user) return;
      await supabase.from("base_conhecimento").delete().eq("user_id", user.id).eq("tipo", tipo);
      await refresh();
    },
    [user, refresh],
  );

  return { rows, loading, refresh, upsert, remove };
}