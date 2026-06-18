import { useEffect, useState } from "react";
import { useITSMContext } from "@/contexts/ITSMContext";
import { closeActivePreset } from "@/lib/activePreset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileEdit, X, Save, Loader2, Check } from "lucide-react";
import { usePricingPresets } from "@/hooks/usePricingPresets";
import { snapshotCurrentPricingParams } from "@/hooks/useParameterProfiles";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function timeAgo(ts: number | null): string {
  if (!ts) return "—";
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 5) return "agora";
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.round(diff / 60)}min`;
  return `há ${Math.round(diff / 3600)}h`;
}

export default function ActivePresetBanner() {
  const { activePreset, state, n1Team, n2Team } = useITSMContext();
  const { save } = usePricingPresets();
  const [tick, setTick] = useState(0);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Atualiza o "há Xs" a cada 15s.
  useEffect(() => {
    if (!activePreset?.activeId) return;
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, [activePreset?.activeId]);

  if (!activePreset?.activeId) return null;

  const handleSaveAs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const allParams = user
        ? await snapshotCurrentPricingParams(user.id, { calculator: state, n1Team, n2Team })
        : undefined;
      const p = await save(newName, state, n1Team, n2Team, undefined, undefined, allParams);
      toast.success(`"${p.name}" salva como nova precificação.`);
      setSaveAsOpen(false);
      setNewName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  };

  return (
    <>
      <div className="border-b bg-primary/10 border-primary/20">
        <div className="mx-auto flex h-9 max-w-[1600px] items-center gap-3 px-4 text-xs">
          <Badge variant="default" className="gap-1 h-6 px-2">
            <FileEdit className="h-3 w-3" />
            Editando precificação
          </Badge>
          <span className="font-medium truncate">{activePreset.name ?? "Carregando…"}</span>
          <span className="text-muted-foreground inline-flex items-center gap-1">
            {activePreset.saving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> salvando…</>
            ) : activePreset.error ? (
              <span className="text-destructive">⚠ {activePreset.error}</span>
            ) : (
              <><Check className="h-3 w-3 text-green-600" /> salvo {timeAgo(activePreset.savedAt) /* refresh tick */}{tick ? "" : ""}</>
            )}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => setSaveAsOpen(true)}
            >
              <Save className="h-3.5 w-3.5" />
              Salvar como nova
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={closeActivePreset}
              title="Voltar ao workspace pessoal (rascunho)"
            >
              <X className="h-3.5 w-3.5" />
              Fechar
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como nova precificação</DialogTitle>
            <DialogDescription>
              Cria uma cópia desta precificação com um novo nome. A precificação
              atual permanece inalterada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-preset-name">Nome</Label>
            <Input
              id="new-preset-name"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Cópia de ${activePreset.name ?? ""}`}
              onKeyDown={(e) => e.key === "Enter" && handleSaveAs()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveAsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAs}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
