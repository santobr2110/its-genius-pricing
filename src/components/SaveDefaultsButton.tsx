import { BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const KEYS = ["itsm:calculator:v1", "itsm:n1team:v1", "itsm:n2team:v1"];

export default function SaveDefaultsButton() {
  const handleSave = () => {
    try {
      let saved = 0;
      for (const k of KEYS) {
        const raw = localStorage.getItem(k);
        if (raw != null) {
          localStorage.setItem(`${k}:default`, raw);
          saved++;
        }
      }
      toast.success(
        saved > 0
          ? "Parâmetros atuais salvos como padrão."
          : "Nada a salvar ainda — preencha alguns campos primeiro."
      );
    } catch {
      toast.error("Não foi possível salvar os parâmetros.");
    }
  };

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
