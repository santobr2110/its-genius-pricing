import { useState } from "react";
import { Layers, Save, RotateCcw, Loader2, Settings2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useParameterProfiles, type ParameterProfile } from "@/hooks/useParameterProfiles";

export default function ParametrosMenu() {
  const { profiles, loading, save, apply, refresh } = useParameterProfiles({ autoLoad: false });
  const [saveOpen, setSaveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ParameterProfile | null>(null);

  const handleSave = async () => {
    setBusy(true);
    try {
      const p = await save(name);
      toast.success(`Perfil "${p.name}" salvo.`);
      setSaveOpen(false);
      setName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async (p: ParameterProfile) => {
    setBusy(true);
    try {
      await apply(p);
      toast.success(`Perfil "${p.name}" restaurado.`);
      setConfirm(null);
      setRestoreOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao restaurar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <Layers className="h-3.5 w-3.5" />
            <span>Parâmetros</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Perfis de parâmetros</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
            <Save className="h-3.5 w-3.5 mr-2" /> Salvar atual…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { setRestoreOpen(true); refresh(); }}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Restaurar…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/perfis-parametros">
              <Settings2 className="h-3.5 w-3.5 mr-2" /> Gerenciar perfis
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar perfil de parâmetros</DialogTitle>
            <DialogDescription>
              Captura todos os parâmetros atuais de todas as calculadoras: Smart ITO (equipes N1/N2, Field Service, rotinas, GMUDs, cortes) e Precificação de Profissionais Alocados (impostos, markup, comissões, benefícios).
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nome do perfil"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !busy) handleSave(); }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreOpen} onOpenChange={(o) => { setRestoreOpen(o); if (!o) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar perfil</DialogTitle>
            <DialogDescription>
              {confirm
                ? `Substituir todos os parâmetros atuais pelo perfil "${confirm.name}"?`
                : "Escolha um perfil para aplicar."}
            </DialogDescription>
          </DialogHeader>
          {!confirm && (
            <div className="max-h-80 overflow-auto divide-y rounded-md border">
              {loading && <div className="p-3 text-xs text-muted-foreground">Carregando…</div>}
              {!loading && profiles.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">Nenhum perfil salvo ainda.</div>
              )}
              {profiles.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                  onClick={() => setConfirm(p)}
                >
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Atualizado {new Date(p.updatedAt).toLocaleString("pt-BR")}
                  </div>
                </button>
              ))}
            </div>
          )}
          {confirm && (
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>Voltar</Button>
              <Button onClick={() => handleApply(confirm)} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-2" />}
                Restaurar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}