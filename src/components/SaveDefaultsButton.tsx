import { BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const KEYS = [
  "itsm:calculator:v1",
  "itsm:n1team:v1",
  "itsm:n2team:v1",
  "itsm:fieldteams:v1",
  "gestao-ti:rotinas",
  "gestao-ti:gmuds",
  "gestao-ti:smartPerf:n3Cortes",
];

export default function SaveDefaultsButton() {
  const { can, user } = useAuth();
  const allowed = can("params.save_defaults");

  const handleSave = async () => {
    if (!user) {
      toast.error("Faça login para salvar os parâmetros padrão.");
      return;
    }
    try {
      const rows: { key: string; value: unknown; updated_by: string }[] = [];
      for (const k of KEYS) {
        const raw = localStorage.getItem(k);
        if (raw != null) {
          try {
            rows.push({ key: k, value: JSON.parse(raw), updated_by: user.id });
          } catch {
            /* skip */
          }
        }
      }
      if (rows.length === 0) {
        toast.error("Nada a salvar ainda — preencha alguns campos primeiro.");
        return;
      }
      const { error } = await supabase
        .from("app_defaults")
        .upsert(rows as never, { onConflict: "key" });
      if (error) throw error;
      toast.success("Parâmetros atuais salvos como padrão para todos os usuários.");
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
      onClick={handleSave}
      title="Salva os valores atuais de todas as páginas como padrão para novas precificações"
    >
      <BookmarkCheck className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Salvar Parâmetros</span>
    </Button>
  );
}
