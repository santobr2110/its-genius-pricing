import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FolderOpen, Trash2, Pencil, Download, Calendar, ExternalLink, Search, UserRoundCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePricingPresets, type PricingPreset } from "@/hooks/usePricingPresets";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, computeITSMResults } from "@/hooks/useITSMCalculator";
import { computeExtrasOperacionais, recomputeComposicaoComExtras } from "@/lib/extrasOperacionais";
import { SMART_ITO_NS } from "@/lib/offerings";
import { ROTINAS_DEFAULT, type Rotina } from "@/data/rotinas";
import { GMUDS_DEFAULT, type Gmud } from "@/data/gmuds";
import { openPresetInNewTab } from "@/lib/activePreset";
import {
  loadDefaultProfilePayload,
  mergeCalculatorWithParameterPayload,
  mergePresetParamsForPricing,
} from "@/lib/presetPricingParams";
import type { ParamPayload } from "@/hooks/useParameterProfiles";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { toast } from "sonner";

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Precificacoes() {
  const { presets, remove, updateCommercial, transferOwnership } = usePricingPresets();
  const { loadPreset } = useITSMContext();
  const [confirmDel, setConfirmDel] = useState<PricingPreset | null>(null);
  const [editPreset, setEditPreset] = useState<PricingPreset | null>(null);
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    accountManager: "",
    buSpecialist: "",
    buArchitect: "",
    contractTerm: "",
    salesforceCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [defaultParams, setDefaultParams] = useState<ParamPayload | null>(null);
  const [query, setQuery] = useState("");
  const [transferPreset, setTransferPreset] = useState<PricingPreset | null>(null);
  const [targets, setTargets] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [targetId, setTargetId] = useState("");
  const [transferring, setTransferring] = useState(false);

  const startTransfer = async (p: PricingPreset) => {
    setTransferPreset(p);
    setTargetId("");
    const { data } = await supabase.rpc("list_pricing_transfer_targets");
    setTargets((data ?? []) as { id: string; full_name: string | null; email: string | null }[]);
  };

  const confirmTransfer = async () => {
    if (!transferPreset || !targetId) return;
    setTransferring(true);
    const res = await transferOwnership(transferPreset.id, targetId);
    setTransferring(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Precificação transferida.");
    setTransferPreset(null);
  };

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter((p) =>
      [p.name, p.clientName, p.quoteCode, p.salesforceCode]
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [presets, query]);

  useEffect(() => {
    let cancelled = false;
    loadDefaultProfilePayload().then((payload) => {
      if (!cancelled) setDefaultParams(payload);
    });
    return () => { cancelled = true; };
  }, []);

  const handleLoad = (p: PricingPreset) => {
    if (typeof window !== "undefined") {
      window.location.href = `/ito?preset=${encodeURIComponent(p.id)}`;
    }
  };

  const handleOpenInNewTab = (p: PricingPreset) => {
    openPresetInNewTab(p.id);
  };

  const startEdit = (p: PricingPreset) => {
    setEditPreset(p);
    setForm({
      name: p.name ?? "",
      clientName: p.clientName ?? "",
      accountManager: p.accountManager ?? "",
      buSpecialist: p.buSpecialist ?? "",
      buArchitect: p.buArchitect ?? "",
      contractTerm: p.contractTerm ?? "",
      salesforceCode: p.salesforceCode ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editPreset) return;
    setSaving(true);
    const ok = await updateCommercial(editPreset.id, {
      name: form.name,
      clientName: form.clientName,
      accountManager: form.accountManager,
      buSpecialist: form.buSpecialist,
      buArchitect: form.buArchitect,
      contractTerm: form.contractTerm,
      salesforceCode: form.salesforceCode,
    });
    setSaving(false);
    if (ok) {
      toast.success("Precificação atualizada.");
      setEditPreset(null);
    } else {
      toast.error("Falha ao atualizar.");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton />
          <h1 className="text-sm font-bold truncate">Precificações Salvas</h1>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="precificacoes" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-4">
        <Card className="p-4">
          {presets.length > 0 && (
            <div className="relative mb-3 max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou cliente..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}
          {presets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma precificação salva ainda.</p>
              <p className="text-xs mt-1">Use o botão "Salvar" no cabeçalho da calculadora.</p>
            </div>
          ) : filteredPresets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma precificação encontrada para "{query}".</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>No. Oportunidade SF</TableHead>
                  <TableHead className="hidden md:table-cell">Contrato</TableHead>
                  <TableHead className="hidden md:table-cell">Salvo por</TableHead>
                  <TableHead className="hidden md:table-cell">Atualizada</TableHead>
                  <TableHead className="text-right">Preço Mensal</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPresets.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-[11px]">
                      {p.quoteCode || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">
                      <button onClick={() => startEdit(p)} className="text-left hover:underline">
                        {p.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.clientName || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.salesforceCode || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {p.contractTerm || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {p.savedByName || p.savedByEmail || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(p.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {(() => {
                        try {
                          const params = mergePresetParamsForPricing(p.calculator, p.allParams, defaultParams);
                          const effectiveCalculator = mergeCalculatorWithParameterPayload(p.calculator, params);
                          const base = computeITSMResults(effectiveCalculator);
                          const rotinas = (params[`${SMART_ITO_NS}gestao-ti:rotinas`] as Rotina[] | undefined) ?? ROTINAS_DEFAULT;
                          const gmuds = (params[`${SMART_ITO_NS}gestao-ti:gmuds`] as Gmud[] | undefined) ?? GMUDS_DEFAULT;
                          const extras = computeExtrasOperacionais(effectiveCalculator, base, rotinas, gmuds);
                          const unified = recomputeComposicaoComExtras(effectiveCalculator, base, extras.custoTotal);
                          const v = unified.composicaoPreco?.precoVenda || 0;
                          return v > 0 ? formatBRL(v) : <span className="text-muted-foreground italic">—</span>;
                        } catch {
                          return <span className="text-muted-foreground italic">—</span>;
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => handleOpenInNewTab(p)}
                          title="Abre esta precificação em uma nova aba, com auto-save direto nela"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden md:inline text-xs">Abrir em nova aba</span>
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleLoad(p)}>
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Carregar</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEdit(p)}
                          title="Editar dados da precificação"
                        >
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

      <Dialog open={!!editPreset} onOpenChange={(o) => !o && setEditPreset(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Editar Precificação</DialogTitle>
            <DialogDescription>
              {editPreset?.quoteCode ? `Código: ${editPreset.quoteCode}` : "Atualize os dados comerciais da precificação."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="ed-name">Nome da Precificação</Label>
              <Input id="ed-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-client">Nome do Cliente</Label>
              <Input id="ed-client" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-am">Gerente de Conta</Label>
              <Input id="ed-am" value={form.accountManager} onChange={(e) => setForm((f) => ({ ...f, accountManager: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-spec">Especialista da BU</Label>
              <Input id="ed-spec" value={form.buSpecialist} onChange={(e) => setForm((f) => ({ ...f, buSpecialist: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-arch">Arquiteto BU</Label>
              <Input id="ed-arch" value={form.buArchitect} onChange={(e) => setForm((f) => ({ ...f, buArchitect: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-term">Prazo de Contrato</Label>
              <Input
                id="ed-term"
                value={form.contractTerm}
                onChange={(e) => setForm((f) => ({ ...f, contractTerm: e.target.value }))}
                placeholder="Ex.: 12 meses"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-sf">No. Oportunidade Sales Force</Label>
              <Input id="ed-sf" value={form.salesforceCode} onChange={(e) => setForm((f) => ({ ...f, salesforceCode: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPreset(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
