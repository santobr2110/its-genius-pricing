import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isPresetActive } from "@/lib/activePreset";
import {
  AVISO_NOVA_PRECIFICACAO_KEY, iniciarNovaPrecificacao, rascunhoTemAlteracoes,
} from "@/lib/novaPrecificacao";

export default function NovaPrecificacaoButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const [open, setOpen] = useState(false);
  const [perdeRascunho, setPerdeRascunho] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(AVISO_NOVA_PRECIFICACAO_KEY)) {
        window.sessionStorage.removeItem(AVISO_NOVA_PRECIFICACAO_KEY);
        toast.success("Precificação nova iniciada");
        window.scrollTo({ top: 0 });
      }
    } catch { /* ignore */ }
  }, []);

  const abrir = () => {
    setPerdeRascunho(!isPresetActive() && rascunhoTemAlteracoes());
    setOpen(true);
  };

  const confirmar = async () => {
    setBusy(true);
    try {
      await iniciarNovaPrecificacao();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar nova precificação.");
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size={size} className="gap-1.5" onClick={abrir}>
        <FilePlus2 className="h-4 w-4" />
        Nova precificação
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nova precificação</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Começar uma precificação nova? Inventário, camadas, horas, escopo, restrições, itens adicionais,
                rotinas desligadas e cidade do ISS voltam ao padrão. Seus parâmetros e o catálogo não mudam.
              </span>
              {perdeRascunho && (
                <span className="block font-medium text-destructive">
                  O rascunho atual não foi salvo como precificação e será perdido.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void confirmar(); }}>
              Começar nova
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
