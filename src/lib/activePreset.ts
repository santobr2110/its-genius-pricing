/**
 * Active Preset (modo "precificação aberta em aba").
 *
 * Quando a aba é aberta com `?preset=<id>` na URL, persiste esse id em
 * `sessionStorage` (escopo da aba) e passa a usar storage de aba (sessionStorage)
 * com chaves prefixadas por `preset.<id>.`. As escritas em nuvem (user_app_state)
 * são suprimidas — a sincronização cloud passa a ser via `pricing_presets.payload`
 * (gerenciada por `useActivePresetSession`).
 */

const SS_KEY = "lovable.active-preset-id";
export const ACTIVE_PRESET_CHANGED_EVENT = "itsm:active-preset-changed";

function readUrlPresetId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("preset");
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

function readSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(SS_KEY);
  } catch {
    return null;
  }
}

let cachedId: string | null = (() => {
  if (typeof window === "undefined") return null;
  const fromUrl = readUrlPresetId();
  if (fromUrl) {
    try { window.sessionStorage.setItem(SS_KEY, fromUrl); } catch { /* ignore */ }
    return fromUrl;
  }
  return readSession();
})();

export function getActivePresetId(): string | null {
  return cachedId;
}

export function isPresetActive(): boolean {
  return !!cachedId;
}

/**
 * Prefixo aplicado ANTES do namespace de oferta nas chaves persistidas.
 * Vazio quando não há preset ativo.
 */
export function getPresetKeyPrefix(): string {
  return cachedId ? `preset.${cachedId}.` : "";
}

export function setActivePresetId(id: string | null) {
  cachedId = id;
  if (typeof window === "undefined") return;
  try {
    if (id) window.sessionStorage.setItem(SS_KEY, id);
    else window.sessionStorage.removeItem(SS_KEY);
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(ACTIVE_PRESET_CHANGED_EVENT, { detail: { id } }));
}

/**
 * Fecha a precificação ativa e volta ao modo rascunho (mesma aba).
 * Faz hard-navigate para `/ito` para reidratar todos os hooks com o workspace
 * pessoal.
 */
export function closeActivePreset() {
  setActivePresetId(null);
  if (typeof window !== "undefined") {
    window.location.href = "/ito";
  }
}

/** Abre uma precificação em nova aba. */
export function openPresetInNewTab(id: string) {
  if (typeof window === "undefined") return;
  const url = `/ito?preset=${encodeURIComponent(id)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
