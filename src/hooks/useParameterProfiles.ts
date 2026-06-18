import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPersistentStateRestored } from "./usePersistentState";
import {
  ALL_PARAM_KEYS,
  keysForOffering,
  type ParamOffering,
} from "@/lib/paramKeys";
import {
  stripClientProfileFields,
  CALCULATOR_KEY,
  CLIENT_PROFILE_CALCULATOR_FIELDS,
} from "@/lib/clientProfileFields";
import { SMART_ITO_NS } from "@/lib/offerings";
import { getActivePresetId } from "@/lib/activePreset";
import type { ITSMState } from "./useITSMCalculator";
import type { N1TeamState } from "./useN1TeamState";
import type { N2TeamState } from "./useN2TeamState";

const GROUP_SLUG = "ito";
const N1_TEAM_KEY = SMART_ITO_NS + "itsm:n1team:v1";
const N2_TEAM_KEY = SMART_ITO_NS + "itsm:n2team:v1";

// Mantido por compatibilidade com código que ainda importa de useParameterProfiles.
export const PARAM_KEYS = ALL_PARAM_KEYS;

export type ParamPayload = Record<string, unknown>;

export interface ParameterProfile {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  payload: ParamPayload;
}

function withPresetPrefix(key: string, presetId: string): string {
  return key.replace(
    /^(ito\.|datacenter\.|cloud\.|observabilidade\.)([^.]+\.)/,
    (_m, a, b) => `${a}${b}preset.${presetId}.`,
  );
}

function readLocalParamValue(key: string): unknown | undefined {
  if (typeof window === "undefined") return undefined;
  const activePresetId = getActivePresetId();
  const read = (storage: Storage, storageKey: string) => {
    const raw = storage.getItem(storageKey);
    if (raw == null) return undefined;
    try { return JSON.parse(raw) as unknown; } catch { return undefined; }
  };
  if (activePresetId) {
    const presetValue = read(window.sessionStorage, withPresetPrefix(key, activePresetId));
    if (presetValue !== undefined) return presetValue;
  }
  return read(window.localStorage, key);
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

/** Lê o valor atual de cada chave do usuário (tela/local → nuvem). */
async function snapshotStoredParams(
  userId: string,
  offering?: ParamOffering,
): Promise<ParamPayload> {
  const out: ParamPayload = {};
  const keys = offering ? keysForOffering(offering) : ALL_PARAM_KEYS;
  const { data } = await supabase
    .from("user_app_state")
    .select("key, value")
    .eq("user_id", userId)
    .in("key", keys);
  const cloud = new Map((data ?? []).map((r) => [r.key as string, r.value]));
  for (const k of keys) {
    const local = readLocalParamValue(k);
    if (local !== undefined) out[k] = local;
    else if (cloud.has(k)) out[k] = cloud.get(k);
  }
  return out;
}

/** Lê o valor atual de cada chave para salvar Perfil de Parâmetros. */
export async function snapshotCurrentParams(
  userId: string,
  offering?: ParamOffering,
): Promise<ParamPayload> {
  const out = await snapshotStoredParams(userId, offering);
  // Remove campos de "Perfil de Cliente" / inputs pontuais do calculator
  // antes de retornar — eles não fazem parte do snapshot de parâmetros.
  return stripClientProfileFields(out);
}

/** Snapshot para precificação: mantém exatamente os inputs da tela. */
export async function snapshotCurrentPricingParams(
  userId: string,
  current: { calculator?: ITSMState; n1Team?: N1TeamState; n2Team?: N2TeamState },
  offering: ParamOffering = "smart-ito",
): Promise<ParamPayload> {
  const out = await snapshotStoredParams(userId, offering);
  if (current.calculator) out[CALCULATOR_KEY] = current.calculator;
  if (current.n1Team) out[N1_TEAM_KEY] = current.n1Team;
  if (current.n2Team) out[N2_TEAM_KEY] = current.n2Team;
  return out;
}

/** Aplica um payload de parâmetros: nuvem + localStorage + notifica hooks. */
export async function applyParamsPayload(payload: ParamPayload): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  // Ao aplicar um perfil, preservamos os campos de Perfil de Cliente
  // do estado atual da precificação. Se o payload do perfil contiver
  // esses campos (perfis legados), eles são ignorados; se o payload do
  // calculator chegar parcial, merge com o estado atual para não
  // limpar inventário/tiers/horas selecionadas.
  const safePayload = await mergeCalculatorPreservingClientProfile(payload, user?.id);
  const entries = Object.entries(safePayload);
  if (user && entries.length) {
    const rows = entries.map(([key, value]) => ({
      user_id: user.id,
      key,
      value: value as unknown as never,
    }));
    await supabase.from("user_app_state").upsert(rows, { onConflict: "user_id,key" });
  }
  if (typeof window !== "undefined") {
    for (const [key, value] of entries) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
      notifyPersistentStateRestored(key, value);
    }
  }
}

/**
 * Para a chave do calculator, retorna um merge:
 *   { ...campos do perfil (parâmetros), ...campos atuais do usuário (Perfil de Cliente) }
 * Garante que aplicar um perfil nunca sobrescreva o que o usuário digitou
 * sobre o cliente, tiers ou horas escolhidas para esta precificação.
 */
async function mergeCalculatorPreservingClientProfile(
  payload: ParamPayload,
  userId: string | undefined,
): Promise<ParamPayload> {
  const incoming = payload[CALCULATOR_KEY];
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return payload;

  // Lê o calculator atual (nuvem → localStorage)
  let current: Record<string, unknown> | null = null;
  if (userId) {
    const { data } = await supabase
      .from("user_app_state")
      .select("value")
      .eq("user_id", userId)
      .eq("key", CALCULATOR_KEY)
      .maybeSingle();
    if (data?.value && typeof data.value === "object") current = data.value as Record<string, unknown>;
  }
  if (!current && typeof window !== "undefined") {
    const raw = window.localStorage.getItem(CALCULATOR_KEY);
    if (raw) {
      try { current = JSON.parse(raw); } catch { /* ignore */ }
    }
  }

  // Começa pelo payload do perfil sem os campos de Perfil de Cliente
  const merged: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
    if (CLIENT_PROFILE_CALCULATOR_FIELDS.has(k)) continue;
    merged[k] = v;
  }
  // Sobrepõe com os valores atuais dos campos de Perfil de Cliente
  if (current) {
    for (const k of CLIENT_PROFILE_CALCULATOR_FIELDS) {
      if (k in current) merged[k] = current[k];
    }
  }
  return { ...payload, [CALCULATOR_KEY]: merged };
}

export function useParameterProfiles({
  autoLoad = true,
  offering,
}: { autoLoad?: boolean; offering?: ParamOffering } = {}) {
  const [profiles, setProfiles] = useState<ParameterProfile[]>([]);
  const [loading, setLoading] = useState(autoLoad);

  const refresh = useCallback(async () => {
    let q = supabase.from("parameter_profiles").select("*").order("updated_at", { ascending: false });
    if (offering) q = q.eq("offering_slug", offering);
    const { data, error } = await q;
    if (!error && data) {
      setProfiles((data as unknown as DbRow[]).map(fromRow));
    }
    setLoading(false);
  }, [offering]);

  useEffect(() => {
    if (!autoLoad) return;
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [autoLoad, refresh]);

  const save = useCallback(async (name: string, offeringOverride?: ParamOffering): Promise<ParameterProfile> => {
    const off = offeringOverride ?? offering;
    if (!off) throw new Error("Oferta não especificada para salvar o perfil.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login para salvar perfis.");
    const finalName = name.trim() || `Perfil ${new Date().toLocaleString("pt-BR")}`;
    const payload = await snapshotCurrentParams(user.id, off);
    const { data, error } = await supabase
      .from("parameter_profiles")
      .insert({
        user_id: user.id,
        name: finalName,
        payload: payload as unknown as never,
        group_slug: GROUP_SLUG,
        offering_slug: off,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Falha ao salvar.");
    const p = fromRow(data as unknown as DbRow);
    setProfiles((prev) => [p, ...prev]);
    return p;
  }, [offering]);

  const overwrite = useCallback(async (id: string, offeringOverride?: ParamOffering) => {
    const off = offeringOverride ?? offering;
    if (!off) throw new Error("Oferta não especificada para sobrescrever o perfil.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login.");
    const payload = await snapshotCurrentParams(user.id, off);
    const { error } = await supabase
      .from("parameter_profiles")
      .update({ payload: payload as unknown as never })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh, offering]);

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
    await applyParamsPayload(profile.payload);
  }, []);

  return { profiles, loading, save, overwrite, rename, remove, apply, refresh };
}
