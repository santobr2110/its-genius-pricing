import { supabase } from "@/integrations/supabase/client";
import type { ITSMState } from "@/hooks/useITSMCalculator";
import type { ParamPayload } from "@/hooks/useParameterProfiles";
import { CALCULATOR_KEY, CLIENT_PROFILE_CALCULATOR_FIELDS } from "@/lib/clientProfileFields";
import { PRICING_OWNED_PARAM_KEYS } from "@/lib/paramKeys";

const DEFAULT_OFFERING = "smart-ito";

let defaultProfilePayloadPromise: Promise<ParamPayload | null> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadDefaultProfilePayload(): Promise<ParamPayload | null> {
  if (defaultProfilePayloadPromise) return defaultProfilePayloadPromise;
  defaultProfilePayloadPromise = (async () => {
    const { data: def } = await supabase
      .from("app_default_profile")
      .select("profile_id")
      .eq("offering_slug", DEFAULT_OFFERING)
      .maybeSingle();

    if (!def?.profile_id) return null;

    const { data: profile } = await supabase
      .from("parameter_profiles")
      .select("payload")
      .eq("id", def.profile_id)
      .maybeSingle();

    const payload = profile?.payload;
    return isRecord(payload) ? (payload as ParamPayload) : null;
  })();
  return defaultProfilePayloadPromise;
}

export function mergeCalculatorWithParameterPayload(
  quoteCalculator: ITSMState,
  parameterPayload?: ParamPayload | null,
): ITSMState {
  const baseCalculator = parameterPayload?.[CALCULATOR_KEY];
  if (!isRecord(baseCalculator)) return quoteCalculator;

  const quoteRecord = quoteCalculator as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    ...quoteRecord,
    ...baseCalculator,
  };

  for (const key of CLIENT_PROFILE_CALCULATOR_FIELDS) {
    if (key in quoteRecord) merged[key] = quoteRecord[key];
  }

  return merged as unknown as ITSMState;
}

export function mergePresetParamsForPricing(
  quoteCalculator: ITSMState | undefined,
  savedParams?: ParamPayload,
  defaultParams?: ParamPayload | null,
): ParamPayload {
  // O snapshot salvo da precificação é a fonte de verdade: qualquer parâmetro
  // alterado durante aquela precificação prevalece sobre o perfil padrão.
  // O perfil padrão serve apenas para preencher chaves ausentes no snapshot
  // (ex.: parâmetros criados depois que a precificação foi salva).
  const params: ParamPayload = { ...(defaultParams ?? {}) };
  if (savedParams) {
    for (const [key, value] of Object.entries(savedParams)) {
      if (value !== undefined) params[key] = value;
    }
    // Reforço explícito das chaves que sempre pertencem à precificação.
    for (const key of PRICING_OWNED_PARAM_KEYS) {
      if (savedParams[key] !== undefined) params[key] = savedParams[key];
    }
  }

  const calcFromSaved = savedParams?.[CALCULATOR_KEY];
  const calculator = quoteCalculator ?? (isRecord(calcFromSaved) ? calcFromSaved as unknown as ITSMState : undefined);
  if (calculator) {
    params[CALCULATOR_KEY] = mergeCalculatorWithParameterPayload(calculator, params);
  }

  return params;
}