import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useITSMContext } from "@/contexts/ITSMContext";
import { usePricingPresets } from "@/hooks/usePricingPresets";
import { toast } from "sonner";

export default function SavePresetButton() {
  const { state, n1Team } = useITSMContext();
  const { save } = usePricingPresets();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSave = () => {
    const preset = save(name, state, n1Team);
    toast.success(`Precificação "${preset.name}" salva.`);
    setName("");
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8"
        onClick={() => setOpen(true)}
      >
        <Save className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Salvar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar precificação</DialogTitle>
            <DialogDescription>
              Dê um nome para identificar esta configuração. Todos os parâmetros atuais
              (inventário, taxas, financeiro e equipes) serão salvos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preset-name">Nome da precificação</Label>
            <Input
              id="preset-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Cliente Acme - Proposta v1"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
