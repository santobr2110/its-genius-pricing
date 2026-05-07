import { useState } from "react";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import { Link } from "react-router-dom";
import { ArrowLeft, FolderOpen, Trash2, Pencil, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePricingPresets, type PricingPreset } from "@/hooks/usePricingPresets";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL } from "@/hooks/useITSMCalculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { toast } from "sonner";

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Precificacoes() {
  const { presets, remove, rename } = usePricingPresets();
  const { loadPreset } = useITSMContext();
  const [confirmDel, setConfirmDel] = useState<PricingPreset | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleLoad = (p: PricingPreset) => {
    loadPreset(p);
    toast.success(`"${p.name}" carregada.`);
  };

  const startEdit = (p: PricingPreset) => {
    setEditing(p.id);
    setEditName(p.name);
  };

  const commitEdit = (id: string) => {
    if (editName.trim()) rename(id, editName.trim());
    setEditing(null);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton />
          <h1 className="text-sm font-bold truncate">Precificações Salvas</h1>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SaveDefaultsButton />
            <SortableNav current="precificacoes" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-4">
        <Card className="p-4">
          {presets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma precificação salva ainda.</p>
              <p className="text-xs mt-1">Use o botão "Salvar" no cabeçalho da calculadora.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Atualizada</TableHead>
                  <TableHead className="text-right">Preço Mensal</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {editing === p.id ? (
                        <Input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => commitEdit(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(p.id);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="h-8"
                        />
                      ) : (
                        <button onClick={() => startEdit(p)} className="text-left hover:underline">
                          {p.name}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(p.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {/* Aproximado: usa preço já calculado quando carregado; aqui mostra um preview rápido */}
                      —
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleLoad(p)}>
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Carregar</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDel(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir precificação?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel?.name}" será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDel) {
                  remove(confirmDel.id);
                  toast.success("Precificação excluída.");
                }
                setConfirmDel(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
