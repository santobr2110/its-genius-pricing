import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActivePresetId, ACTIVE_PRESET_CHANGED_EVENT } from "@/lib/activePreset";
import { SMART_ITO_NS } from "@/lib/offerings";
import {
  notifyPersistentStateRestored,
  PERSISTENT_STATE_RESTORED_EVENT,
} from "./usePersistentState";
import { PARAM_KEYS, type ParamPayload } from "./useParameterProfiles";
import type { PricingPreset } from "./usePricingPresets";
import { loadDefaultProfilePayload, mergePresetParamsForPricing } from "@/lib/presetPricingParams";

export const PRESET_LOCAL_WRITE_EVENT = "itsm:preset-local-write";

const SAVE_DEBOUNCE_MS = 800;

/** Insere o prefixo `preset.<id>.` em uma chave já namespeada (`ito.smart-ito.X`). */
function withPresetPrefix(key: string, presetId: string): string {
  return key.replace(
    /^(ito\.|datacenter\.|cloud\.|observabilidade\.)([^.]+\.)/,
    (_m, a, b) => `${a}${b}preset.${presetId}.`,
  );
}

/** Remove o prefixo `preset.<id>.` de uma chave namespeada. */
function stripPresetPrefix(key: string, presetId: string): string {
  return key.replace(
    new RegExp(`^(ito\\.|datacenter\\.|cloud\\.|observabilidade\\.)([^.]+\\.)preset\\.${presetId}\\.`),
    (_m, a, b) => `${a}${b}`,
  );
}

export interface ActivePresetStatus {
  activeId: string | null;
  name: string | null;
  savedAt: number | null;
  saving: boolean;
  error: string | null;
  loaded: boolean;
}

/**
 * Quando há `?preset=<id>` na aba:
 * 1. Carrega o preset do banco.
 * 2. Popula sessionStorage com cada fatia do payload (calculator, n1Team,
 *    n2Team, escopo, allParams), usando chaves prefixadas por preset.
 * 3. Dispara `PERSISTENT_STATE_RESTORED_EVENT` para hooks já montados se
 *    rehidratarem com os valores corretos.
 * 4. Observa escritas locais (custom event) e faz debounce de 800ms para
 *    persistir o snapshot atual em `pricing_presets.payload`.
 */
export function useActivePresetSession(): ActivePresetStatus {
  const [status, setStatus] = useState<ActivePresetStatus>({
    activeId: getActivePresetId(),
    name: null,
    savedAt: null,
    saving: false,
    error: null,
    loaded: false,
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const activeIdRef = useRef<string | null>(getActivePresetId());

  // Hidrata o sessionStorage a partir do payload do preset.
  const hydrate = useCallback(async (presetId: string) => {
    const { data, error } = await supabase
      .from("pricing_presets")
      .select("id, name, payload, updated_at")
      .eq("id", presetId)
      .maybeSingle();

    if (error || !data) {
      setStatus((s) => ({ ...s, error: error?.message ?? "Precificação não encontrada.", loaded: true }));
      return;
    }

    const payload = (data.payload ?? {}) as {
      calculator?: unknown;
      n1Team?: unknown;
      n2Team?: unknown;
      escopo?: { proposicao?: unknown; restricoesGerais?: unknown; itensAdicionais?: unknown };
      allParams?: ParamPayload;
    };

    const defaultParams = await loadDefaultProfilePayload();

    // Constrói o conjunto de entradas (chave namespeada → valor).
    const entries: Array<[string, unknown]> = [];

    // Preferência: allParams (snapshot completo) — formato moderno
    if (payload.allParams && Object.keys(payload.allParams).length) {
      const mergedParams = mergePresetParamsForPricing(
        payload.calculator as PricingPreset["calculator"] | undefined,
        payload.allParams,
        defaultParams,
      );
      for (const [k, v] of Object.entries(mergedParams)) {
        entries.push([k, v]);
      }
    } else {
      // Fallback: presets antigos que só guardam calculator/n1/n2/escopo
      const fallbackParams: ParamPayload = {};
      if (payload.calculator !== undefined) fallbackParams[SMART_ITO_NS + "itsm:calculator:v1"] = payload.calculator;
      if (payload.n1Team !== undefined) fallbackParams[SMART_ITO_NS + "itsm:n1team:v1"] = payload.n1Team;
      if (payload.n2Team !== undefined) fallbackParams[SMART_ITO_NS + "itsm:n2team:v1"] = payload.n2Team;
      if (payload.escopo?.proposicao !== undefined) fallbackParams[SMART_ITO_NS + "escopo:proposicao"] = payload.escopo.proposicao;
      if (payload.escopo?.restricoesGerais !== undefined) fallbackParams[SMART_ITO_NS + "escopo:restricoesGerais"] = payload.escopo.restricoesGerais;
      if (payload.escopo?.itensAdicionais !== undefined) fallbackParams[SMART_ITO_NS + "escopo:itensAdicionais"] = payload.escopo.itensAdicionais;
      const mergedParams = mergePresetParamsForPricing(
        payload.calculator as PricingPreset["calculator"] | undefined,
        fallbackParams,
        defaultParams,
      );
      for (const [k, v] of Object.entries(mergedParams)) entries.push([k, v]);
    }

    if (typeof window !== "undefined") {
      for (const [rawKey, value] of entries) {
        const presetKey = withPresetPrefix(rawKey, presetId);
        try { window.sessionStorage.setItem(presetKey, JSON.stringify(value)); } catch { /* ignore */ }
        // Dispara restoration usando a chave do preset (que é a vista pelos hooks).
        notifyPersistentStateRestored(presetKey, value);
      }
    }

    loadedRef.current = true;
    setStatus({
      activeId: presetId,
      name: data.name as string,
      savedAt: new Date(data.updated_at as string).getTime(),
      saving: false,
      error: null,
      loaded: true,
    });
  }, []);

  // Coleta o snapshot atual de sessionStorage e persiste no preset.
  const persist = useCallback(async (presetId: string) => {
    if (typeof window === "undefined") return;
    setStatus((s) => ({ ...s, saving: true }));

    const allParams: ParamPayload = {};
    for (const baseKey of PARAM_KEYS) {
      const presetKey = withPresetPrefix(baseKey, presetId);
      const raw = window.sessionStorage.getItem(presetKey);
      if (raw == null) continue;
      try {
        allParams[baseKey] = JSON.parse(raw);
      } catch { /* ignore */ }
    }

    // Extrai fatias estruturadas para compatibilidade com leitura legada.
    const calculator = allParams[SMART_ITO_NS + "itsm:calculator:v1"];
    const n1Team = allParams[SMART_ITO_NS + "itsm:n1team:v1"];
    const n2Team = allParams[SMART_ITO_NS + "itsm:n2team:v1"];
    const escopo = {
      proposicao: allParams[SMART_ITO_NS + "escopo:proposicao"],
      restricoesGerais: allParams[SMART_ITO_NS + "escopo:restricoesGerais"],
      itensAdicionais: allParams[SMART_ITO_NS + "escopo:itensAdicionais"],
    };

    const payload = { calculator, n1Team, n2Team, escopo, allParams };

    const { error } = await supabase
      .from("pricing_presets")
      .update({ payload: payload as unknown as never })
      .eq("id", presetId);

    if (error) {
      setStatus((s) => ({ ...s, saving: false, error: error.message }));
      return;
    }
    setStatus((s) => ({ ...s, saving: false, savedAt: Date.now(), error: null }));
  }, []);

  const scheduleSave = useCallback((presetId: string) => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(presetId);
    }, SAVE_DEBOUNCE_MS);
  }, [persist]);

  // Inicialização + reação a mudanças de preset ativo na aba.
  useEffect(() => {
    const id = getActivePresetId();
    activeIdRef.current = id;
    if (id) {
      void hydrate(id);
    } else {
      setStatus((s) => ({ ...s, loaded: true }));
    }

    const onChanged = () => {
      const newId = getActivePresetId();
      activeIdRef.current = newId;
      loadedRef.current = false;
      if (newId) void hydrate(newId);
    };
    window.addEventListener(ACTIVE_PRESET_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(ACTIVE_PRESET_CHANGED_EVENT, onChanged);
  }, [hydrate]);

  // Observa escritas locais — qualquer mudança em uma chave que pertence ao
  // namespace do preset ativo dispara save debounced.
  useEffect(() => {
    const id = activeIdRef.current;
    if (!id) return;
    const presetKeyPart = `preset.${id}.`;
    const onRestored = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (!detail?.key || !detail.key.includes(presetKeyPart)) return;
      // Não re-agendamos quando o evento veio da hidratação inicial (loadedRef false).
      if (!loadedRef.current) return;
      scheduleSave(id);
    };
    window.addEventListener(PERSISTENT_STATE_RESTORED_EVENT, onRestored);

    // Polling leve: quando o usuário edita campos, o hook usePersistentState
    // escreve em sessionStorage mas NÃO dispara um custom event próprio.
    // Solução: o ITSMProvider já reflete cada mudança em React state, então
    // disparamos save sempre que algum profissional chamar `usePersistentState`.
    // Fazemos isso interceptando o storage diretamente: a cada tick verificamos
    // se uma chave mudou. Aqui usamos polling de 1s — leve e suficiente.
    let lastSnapshot = "";
    const tick = () => {
      const parts: string[] = [];
      for (const baseKey of PARAM_KEYS) {
        const presetKey = withPresetPrefix(baseKey, id);
        const raw = window.sessionStorage.getItem(presetKey);
        if (raw != null) parts.push(presetKey + "=" + raw);
      }
      const snap = parts.join("|");
      if (lastSnapshot && snap !== lastSnapshot) {
        scheduleSave(id);
      }
      lastSnapshot = snap;
    };
    const interval = setInterval(tick, 1000);
    // primeira leitura sem agendar save
    setTimeout(tick, 200);

    return () => {
      window.removeEventListener(PERSISTENT_STATE_RESTORED_EVENT, onRestored);
      clearInterval(interval);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [scheduleSave, status.activeId]);

  return status;
}
