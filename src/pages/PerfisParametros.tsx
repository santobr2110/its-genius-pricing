import { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, Save, Trash2, Download, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import UserMenu from "@/components/auth/UserMenu";
import { useParameterProfiles, ParameterProfile, PARAM_KEYS } from "@/hooks/useParameterProfiles";

export default function PerfisParametros() {
  const { profiles, loading, save, overwrite, rename, remove, apply } = useParameterProfiles();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmApply, setConfirmApply] = useState<ParameterProfile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ParameterProfile | null>(null);

  const handleSave = async () => {
    setBusy(true);
    try {
      const p = await save(name);
      setName("");
      toast({ title: "Perfil salvo", description: `"${p.name}" criado com todos os parâmetros atuais.` });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleOverwrite = async (p: ParameterProfile) => {
    setBusy(true);
    try {
      await overwrite(p.id);
      toast({ title: "Atualizado", description: `"${p.name}" agora reflete os parâmetros atuais.` });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleApply = async () => {
    if (!confirmApply) return;
    setBusy(true);
    try {
      await apply(confirmApply);
      toast({ title: "Perfil aplicado", description: `"${confirmApply.name}" restaurado nos parâmetros atuais.` });
      setConfirmApply(null);
    }
    catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await remove(confirmDelete.id);
      toast({ title: "Perfil removido" });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); setConfirmDelete(null); }
  };

  const startEdit = (p: ParameterProfile) => { setEditingId(p.id); setEditingName(p.name); };
  const commitEdit = async () => {
    if (!editingId) return;
    const newName = editingName.trim();
    if (!newName) { setEditingId(null); return; }
    try { await rename(editingId, newName); }
    catch (e) { toast({ title: "Erro", description: (e as Error).message, variant: "destructive" }); }
    finally { setEditingId(null); }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <Calculator className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Perfis de Parâmetros</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="home" />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Save className="h-4 w-4" /> Salvar parâmetros atuais como novo perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do perfil (ex.: Cliente X — Operação 24x7)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                className="h-9"
              />
              <Button onClick={handleSave} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Captura snapshot de {PARAM_KEYS.length} grupos: calculadora, equipes N1/N2 e Field Service de Microinformática, rotinas, GMUDs e cortes Smart Perf.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Perfis salvos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum perfil salvo ainda.</p>
            ) : (
              <ul className="divide-y">
                {profiles.map((p) => (
                  <li key={p.id} className="py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === p.id ? (
                        <Input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                          className="h-8 text-sm"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{p.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {Object.keys(p.payload).length} grupos
                          </Badge>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Atualizado {new Date(p.updatedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setConfirmApply(p)} disabled={busy}>
                      <Download className="h-3.5 w-3.5" /> Aplicar
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => handleOverwrite(p)} disabled={busy} title="Sobrescrever com parâmetros atuais">
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => startEdit(p)} disabled={busy} title="Renomear">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(p)} disabled={busy} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!confirmApply} onOpenChange={(o) => !o && setConfirmApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar perfil "{confirmApply?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto vai substituir todos os parâmetros atuais (equipes, financeiro, taxas, rotinas, GMUDs, etc.) pelos valores do perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
