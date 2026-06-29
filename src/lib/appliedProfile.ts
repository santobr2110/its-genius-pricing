/**
 * Rastreia qual Perfil de Parâmetros está atualmente aplicado por oferta.
 * Persistido em localStorage e propagado via CustomEvent para componentes
 * exibirem o perfil ativo (ex.: SmartTiersPanel).
 */
import type { ParamOffering } from "@/lib/paramKeys";
import { supabase } from "@/integrations/supabase/client";

export const APPLIED_PROFILE_CHANGED_EVENT = "itsm:applied-profile-changed";

export interface AppliedProfileInfo {
  id: string;
  name: string;
}

function storageKey(offering: ParamOffering): string {
  return `appliedProfile:${offering}`;
}

function metaKey(offering: ParamOffering): string {
  return `meta:appliedProfile:${offering}`;
}

export function getAppliedProfile(offering: ParamOffering): AppliedProfileInfo | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(offering));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppliedProfileInfo;
    if (parsed?.id && parsed?.name) return parsed;
  } catch { /* ignore */ }
  return null;
}

/**
 * Lê o perfil ativo do banco para este usuário. Use quando localStorage
 * estiver vazio (ex.: outro dispositivo / nova sessão).
 */
export async function fetchAppliedProfileFromDb(
  offering: ParamOffering,
): Promise<AppliedProfileInfo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("user_app_state")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", metaKey(offering))
      .maybeSingle();
    const value = data?.value as AppliedProfileInfo | null;
    if (value?.id && value?.name) return value;
  } catch { /* ignore */ }
  return null;
}

export function setAppliedProfile(offering: ParamOffering, info: AppliedProfileInfo | null): void {
  if (typeof window === "undefined") return;
  if (info) {
    window.localStorage.setItem(storageKey(offering), JSON.stringify(info));
  } else {
    window.localStorage.removeItem(storageKey(offering));
  }
  window.dispatchEvent(
    new CustomEvent(APPLIED_PROFILE_CHANGED_EVENT, { detail: { offering, info } }),
  );
  // Persiste também por usuário no banco (assíncrono / best-effort).
  void persistAppliedProfile(offering, info);
}

async function persistAppliedProfile(
  offering: ParamOffering,
  info: AppliedProfileInfo | null,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (info) {
      await supabase
        .from("user_app_state")
        .upsert(
          { user_id: user.id, key: metaKey(offering), value: info as unknown as never },
          { onConflict: "user_id,key" },
        );
    } else {
      await supabase
        .from("user_app_state")
        .delete()
        .eq("user_id", user.id)
        .eq("key", metaKey(offering));
    }
  } catch { /* ignore */ }
}