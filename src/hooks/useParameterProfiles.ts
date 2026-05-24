import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPersistentStateRestored } from "./usePersistentState";
import { SMART_ITO_NS } from "@/lib/offerings";

const GROUP_SLUG = "ito";
const OFFERING_SLUG = "smart-ito";

// Todas as chaves de parâmetros persistidos (equipes + configurações + gestão TI),
// já namespeadas pela oferta Smart ITO.
const RAW_PARAM_KEYS = [
  "itsm:calculator:v1",
  "itsm:n1team:v1",
  "itsm:n2team:v1",
  "itsm:fieldteams:v1",
  "gestao-ti:rotinas",
  "gestao-ti:gmuds",
  "gestao-ti:smartPerf:n3Cortes",
] as const;

export const PARAM_KEYS = RAW_PARAM_KEYS.map((k) => SMART_ITO_NS + k);

export type ParamPayload = Record<string, unknown>;

export interface ParameterProfile {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  payload: ParamPayload;
}

interface DbRow {
  id: string;
  name: string;
  payload: ParamPayload;
  created_at: string;
  updated_at: string;
}

function fromRow(r: DbRow): ParameterProfile {
  return {
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    payload: r.payload ?? {},
  };
}

/** Lê o valor atual de cada chave do usuário (nuvem → localStorage). */
async function snapshotCurrent(userId: string): Promise<ParamPayload> {
  const out: ParamPayload = {};
  const { data } = await supabase
    .from("user_app_state")
    .select("key, value")
    .eq("user_id", userId)
    .in("key", PARAM_KEYS as unknown as string[]);
  const cloud = new Map((data ?? []).map((r) => [r.key as string, r.value]));
  for (const k of PARAM_KEYS) {
    if (cloud.has(k)) {
      out[k] = cloud.get(k);
    } else if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(k);
      if (raw != null) {
        try { out[k] = JSON.parse(raw); } catch { /* ignore */ }
      }
    }
  }
  return out;
}

export function useParameterProfiles({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [profiles, setProfiles] = useState<ParameterProfile[]>([]);
  const [loading, setLoading] = useState(autoLoad);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("parameter_profiles")
      .select("*")
      .eq("offering_slug", OFFERING_SLUG)
      .order("updated_at", { ascending: false });
    if (!error && data) {
      setProfiles((data as unknown as DbRow[]).map(fromRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [autoLoad, refresh]);

  const save = useCallback(async (name: string): Promise<ParameterProfile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login para salvar perfis.");
    const finalName = name.trim() || `Perfil ${new Date().toLocaleString("pt-BR")}`;
    const payload = await snapshotCurrent(user.id);
    const { data, error } = await supabase
      .from("parameter_profiles")
      .insert({
        user_id: user.id,
        name: finalName,
        payload: payload as unknown as never,
        group_slug: GROUP_SLUG,
        offering_slug: OFFERING_SLUG,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Falha ao salvar.");
    const p = fromRow(data as unknown as DbRow);
    setProfiles((prev) => [p, ...prev]);
    return p;
  }, []);

  const overwrite = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login.");
    const payload = await snapshotCurrent(user.id);
    const { error } = await supabase
      .from("parameter_profiles")
      .update({ payload: payload as unknown as never })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);

  const rename = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("parameter_profiles").update({ name }).eq("id", id);
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("parameter_profiles").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /** Aplica um perfil: grava em user_app_state + localStorage e notifica os hooks ativos. */
  const apply = useCallback(async (profile: ParameterProfile) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login.");
    const rows = Object.entries(profile.payload).map(([key, value]) => ({
      user_id: user.id,
      key,
      value: value as unknown as never,
    }));
    if (rows.length) {
      const { error } = await supabase
        .from("user_app_state")
        .upsert(rows, { onConflict: "user_id,key" });
      if (error) throw new Error(error.message);
    }
    if (typeof window !== "undefined") {
      for (const [key, value] of Object.entries(profile.payload)) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
        notifyPersistentStateRestored(key, value);
      }
    }
  }, []);

  return { profiles, loading, save, overwrite, rename, remove, apply, refresh };
}
