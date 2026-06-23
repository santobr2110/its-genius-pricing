/**
 * Rastreia qual Perfil de Parâmetros está atualmente aplicado por oferta.
 * Persistido em localStorage e propagado via CustomEvent para componentes
 * exibirem o perfil ativo (ex.: SmartTiersPanel).
 */
import type { ParamOffering } from "@/lib/paramKeys";

export const APPLIED_PROFILE_CHANGED_EVENT = "itsm:applied-profile-changed";

export interface AppliedProfileInfo {
  id: string;
  name: string;
}

function storageKey(offering: ParamOffering): string {
  return `appliedProfile:${offering}`;
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
}