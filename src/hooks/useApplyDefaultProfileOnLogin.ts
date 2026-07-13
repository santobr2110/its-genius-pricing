import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  keysForOffering,
  type ParamOffering,
} from "@/lib/paramKeys";
import { applyParamsPayload } from "@/hooks/useParameterProfiles";
import { isPresetActive } from "@/lib/activePreset";
import { getAppliedProfile, fetchAppliedProfileFromDb, setAppliedProfile } from "@/lib/appliedProfile";

const OFFERINGS: ParamOffering[] = ["smart-ito", "profissionais-alocados"];

/**
 * Aplica automaticamente o "Perfil padrão" (registrado em
 * `app_default_profile`) da oferta para usuários que ainda não têm
 * parâmetros próprios salvos em `user_app_state`.
 *
 * Executa apenas no PRIMEIRO login do usuário (detectado por
 * `profiles.first_login_at IS NULL`). Após aplicar, marca o timestamp
 * para não repetir em logins futuros. Não roda quando a aba está
 * editando uma precificação ativa.
 */
export function useApplyDefaultProfileOnLogin() {
  useEffect(() => {
    if (isPresetActive()) return;
    let cancelled = false;

    async function run(uid: string) {
      // Verifica se é o primeiro login (first_login_at nulo).
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_login_at")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled) return;
      // Se não conseguiu ler, aborta silenciosamente.
      if (!prof) return;
      const isFirstLogin = !prof.first_login_at;

      for (const offering of OFFERINGS) {
        if (cancelled) return;
        try {
          const { data: dp } = await supabase
            .from("app_default_profile")
            .select("profile_id")
            .eq("offering_slug", offering)
            .maybeSingle();

          if (!dp?.profile_id) continue;

          if (!isFirstLogin) {
            // Logins subsequentes: nunca sobrescreve valores; apenas
            // garante que o "perfil ativo" exibido reflita algo coerente.
            const hasLocal = getAppliedProfile(offering);
            if (!hasLocal) {
              const remote = await fetchAppliedProfileFromDb(offering);
              if (!remote) {
                const { data: prof } = await supabase
                  .from("parameter_profiles")
                  .select("id, name")
                  .eq("id", dp.profile_id)
                  .maybeSingle();
                const name = (prof as { name?: string } | null)?.name;
                if (name) setAppliedProfile(offering, { id: dp.profile_id, name });
              } else {
                setAppliedProfile(offering, remote);
              }
            }
            continue;
          }

          // Primeiro login: aplica o payload do perfil padrão.
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
        } catch {
          /* ignore — tenta novamente em outro login */
        }
      }

      // Marca o primeiro login como concluído (idempotente).
      if (isFirstLogin && !cancelled) {
        try {
          await supabase
            .from("profiles")
            .update({ first_login_at: new Date().toISOString() })
            .eq("id", uid)
            .is("first_login_at", null);
        } catch {
          /* ignore */
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