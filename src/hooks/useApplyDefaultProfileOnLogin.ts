import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  keysForOffering,
  type ParamOffering,
} from "@/lib/paramKeys";
import { applyParamsPayload } from "@/hooks/useParameterProfiles";
import { isPresetActive } from "@/lib/activePreset";
import { setAppliedProfile } from "@/lib/appliedProfile";

const OFFERINGS: ParamOffering[] = ["smart-ito", "profissionais-alocados"];

function flagKey(uid: string, offering: ParamOffering) {
  return `defaultProfile:applied:${uid}:${offering}`;
}

/**
 * Aplica automaticamente o "Perfil padrão" (registrado em
 * `app_default_profile`) da oferta para usuários que ainda não têm
 * parâmetros próprios salvos em `user_app_state`.
 *
 * Executa uma vez por usuário+oferta (guardado em localStorage). Não roda
 * quando a aba está editando uma precificação ativa.
 */
export function useApplyDefaultProfileOnLogin() {
  useEffect(() => {
    if (isPresetActive()) return;
    let cancelled = false;

    async function run(uid: string) {
      for (const offering of OFFERINGS) {
        if (cancelled) return;
        try {
          const flag = flagKey(uid, offering);
          if (typeof window !== "undefined" && window.localStorage.getItem(flag)) continue;

          const { data: dp } = await supabase
            .from("app_default_profile")
            .select("profile_id")
            .eq("offering_slug", offering)
            .maybeSingle();

          if (!dp?.profile_id) continue;

          const keys = keysForOffering(offering);
          const { data: existing } = await supabase
            .from("user_app_state")
            .select("key")
            .eq("user_id", uid)
            .in("key", keys)
            .limit(1);

          if (existing && existing.length > 0) {
            // Usuário já tem parâmetros próprios — não sobrescrever.
            if (typeof window !== "undefined") window.localStorage.setItem(flag, "1");
            continue;
          }

          const { data: profile } = await supabase
            .from("parameter_profiles")
            .select("payload, name")
            .eq("id", dp.profile_id)
            .maybeSingle();

          const payload = (profile?.payload ?? null) as Record<string, unknown> | null;
          if (payload && Object.keys(payload).length > 0) {
            await applyParamsPayload(payload);
            const name = (profile as { name?: string } | null)?.name;
            if (name) setAppliedProfile(offering, { id: dp.profile_id, name });
          }
          if (typeof window !== "undefined") window.localStorage.setItem(flag, "1");
        } catch {
          /* ignore — tenta novamente em outro login */
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user?.id) return;
      run(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN") return;
      if (!session?.user?.id) return;
      run(session.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
}