import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PARAM_KEYS } from "@/hooks/useParameterProfiles";

// Mesma lista (já namespeada por oferta) usada para salvar perfis de parâmetros.
const KEYS = PARAM_KEYS;

export default function SaveDefaultsButton() {
  const { can, user } = useAuth();
  const allowed = can("params.save_defaults");

  const handleSave = async () => {
    if (!user) {
      toast.error("Faça login para salvar os parâmetros padrão.");
      return;
    }
    try {
      // Lê o estado autoritativo direto do banco (funciona em qualquer
      // navegador/dispositivo, não depende do cache local).
      const { data: cloudRows, error: readErr } = await supabase
        .from("user_app_state")
        .select("key, value")
        .eq("user_id", user.id)
        .in("key", KEYS);
      if (readErr) throw readErr;

      const byKey = new Map<string, unknown>();
      (cloudRows ?? []).forEach((r) => byKey.set(r.key, r.value));

      // Fallback: se uma chave ainda não foi sincronizada (ex.: edição
      // muito recente, dentro da janela de debounce), usa o localStorage.
      for (const k of KEYS) {
        if (byKey.has(k)) continue;
        const raw = localStorage.getItem(k);
        if (raw != null) {
          try {
            byKey.set(k, JSON.parse(raw));
          } catch {
            /* skip */
          }
        }
      }

      const rows = Array.from(byKey.entries()).map(([key, value]) => ({
        key,
        value: value as never,
        updated_by: user.id,
      }));
      if (rows.length === 0) {
        toast.error("Nada a salvar ainda — preencha alguns campos primeiro.");
        return;
      }
      const { error } = await supabase
        .from("app_defaults")
        .upsert(rows as never[], { onConflict: "key" });
      if (error) throw error;
      toast.success(
        `Parâmetros (${rows.length}) salvos como padrão para todos os usuários.`,
        {
          description:
            "Cada alteração fica versionada em Administração › Parâmetros padrão e pode ser revertida a qualquer momento.",
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar os parâmetros.");
    }
  };

  if (!allowed) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs h-8"
      title="Salva os valores atuais de todas as páginas como padrão para novas precificações"
      onClick={handleSave}
    >
      <Save className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Salvar Status</span>
    </Button>
  );
}
