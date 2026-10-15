import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Download, ExternalLink, FolderOpen, Pencil, Search, Trash2, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useZabbixCotacoes, type ZabbixCotacao } from "@/hooks/useZabbixCotacoes";
import { useZbxState as useCarrinhoState, urlNovaAbaZbx as urlNovaAba } from "./useZbxState";
import { CONFIG_ZBX_PADRAO as CONFIG_PADRAO } from "@/lib/zabbix/carrinho";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const Vazio = () => <span className="text-muted-foreground italic">—</span>;

type Form = { name: string; client_name: string; account_manager: string; bu_specialist: string; salesforce_code: string; bu_architect: string };
type Alvo = { id: string; full_name: string | null; email: string | null };

/** Cotações de Subscrições Zabbix — mesmo padrão da tela "Precificações Salvas" do Smart ITO. */
export default function ZbxCotacoes() {
  const { lista, loading, excluir, editarDados, transferir } = useZabbixCotacoes();
  const { setLinhas, setConfig, setAtual, atual, setSnapshot } = useCarrinhoState();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<ZabbixCotacao | null>(null);
  const [form, setForm] = useState<Form>({ name: "", client_name: "", account_manager: "", bu_specialist: "", salesforce_code: "", bu_architect: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ZabbixCotacao | null>(null);
  const [transf, setTransf] = useState<ZabbixCotacao | null>(null);
  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const [alvoId, setAlvoId] = useState("");
  const [transferindo, setTransferindo] = useState(false);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((c) => [c.name, c.client_name, c.quote_code, c.salesforce_code].some((v) => (v ?? "").toLowerCase().includes(q)));
  }, [lista, query]);

  const abrir = (c: ZabbixCotacao) => {
    setLinhas(c.payload?.linhas ?? []);
    setConfig({ ...CONFIG_PADRAO, ...(c.payload?.config ?? {}) });
    setSnapshot(c.payload?.snapshot ?? null);
    setAtual({ id: c.id, nome: c.name, cliente: c.client_name ?? "", codigo: c.quote_code, gerenteConta: c.account_manager ?? "", especialistaBU: c.bu_specialist ?? "", salesforce: c.salesforce_code ?? "", arquitetoBU: c.bu_architect ?? "" });
    navigate("/observabilidade/subscricoes-zabbix");
  };

  const startEdit = (c: ZabbixCotacao) => {
    setEdit(c);
    setForm({ name: c.name ?? "", client_name: c.client_name ?? "", account_manager: c.account_manager ?? "", bu_specialist: c.bu_specialist ?? "", salesforce_code: c.salesforce_code ?? "", bu_architect: c.bu_architect ?? "" });
  };
  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await editarDados(edit.id, form);
      // Se a cotação editada está aberta no configurador, atualiza os dados na tela também.
      if (atual.id === edit.id) setAtual({ ...atual, nome: form.name, cliente: form.client_name, gerenteConta: form.account_manager, especialistaBU: form.bu_specialist, salesforce: form.salesforce_code, arquitetoBU: form.bu_architect });
      toast.success("Cotação atualizada.");
      setEdit(null);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const startTransfer = async (c: ZabbixCotacao) => {
    setTransf(c); setAlvoId("");
    const { data } = await supabase.rpc("list_pricing_transfer_targets");
    setAlvos((data ?? []) as Alvo[]);
  };
  const confirmTransfer = async () => {
    if (!transf || !alvoId) return;
    setTransferindo(true);
    try { await transferir(transf.id, alvoId); toast.success("Cotação transferida."); setTransf(null); }
    catch (e) { toast.error((e as Error).message); } finally { setTransferindo(false); }
  };

  const campo = (k: keyof Form, label: string, span = false) => (
    <div className={`space-y-1 ${span ? "md:col-span-2" : ""}`}>
      <Label htmlFor={`zbx-ed-${k}`}>{label}</Label>
      <Input id={`zbx-ed-${k}`} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  return (
    <Card className="p-4">
      {lista.length > 0 && (
        <div className="relative mb-3 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, cliente ou código..." className="h-8 pl-8 text-xs" />
        </div>
      )}
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : lista.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma cotação salva ainda.</p>
          <p className="text-xs mt-1">Monte os itens no Configurador e clique em Salvar.</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma cotação encontrada para "{query}".</p>
        </div>
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Cliente</TableHead>
            <TableHead>No. Oportunidade SF</TableHead>
            <TableHead className="hidden md:table-cell text-right">Itens</TableHead>
            <TableHead className="hidden md:table-cell">Salvo por</TableHead>
            <TableHead className="hidden md:table-cell">Atualizada</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtradas.map((c) => (
              <TableRow key={c.id} className={atual.id === c.id ? "bg-primary/5" : ""}>
                <TableCell className="font-mono text-[11px]">{c.quote_code || <Vazio />}</TableCell>
                <TableCell className="font-medium">
                  <button onClick={() => startEdit(c)} className="text-left hover:underline">{c.name}</button>
                </TableCell>
                <TableCell className="text-xs">{c.client_name || <Vazio />}</TableCell>
                <TableCell className="font-mono text-xs">{c.salesforce_code || <Vazio />}</TableCell>
                <TableCell className="hidden md:table-cell text-right tabular-nums text-xs">{c.payload?.linhas?.length ?? 0}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{c.saved_by_name || c.saved_by_email || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(c.updated_at)}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {typeof c.payload?.resumo?.precoFinalTotal === "number" ? brl(c.payload.resumo.precoFinalTotal as number) : <Vazio />}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => window.open(urlNovaAba(c.id), "_blank")} title="Abre esta cotação em uma nova aba, sem mexer na cotação aberta aqui">
                      <ExternalLink className="h-3.5 w-3.5" /><span className="hidden md:inline text-xs">Abrir em nova aba</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => abrir(c)}>
                      <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline text-xs">Carregar</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(c)} title="Editar dados da cotação"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startTransfer(c)} title="Transferir para outro usuário"><UserRoundCog className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDel(c)} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Editar Cotação</DialogTitle>
            <DialogDescription>{edit?.quote_code ? `Código: ${edit.quote_code}` : "Atualize os dados comerciais da cotação."}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            {campo("name", "Nome da cotação", true)}
            {campo("client_name", "Nome do Cliente")}
            {campo("account_manager", "Gerente de Conta")}
            {campo("bu_specialist", "Especialista da BU")}
            {campo("bu_architect", "Arquiteto BU")}
            {campo("salesforce_code", "No. Oportunidade Sales Force", true)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transf} onOpenChange={(o) => !o && setTransf(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Transferir cotação</DialogTitle>
            <DialogDescription>"{transf?.name}" passará a pertencer ao usuário escolhido e sairá da sua lista.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <Label>Novo responsável</Label>
            <Select value={alvoId} onValueChange={setAlvoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {alvos.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.email || t.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransf(null)} disabled={transferindo}>Cancelar</Button>
            <Button onClick={confirmTransfer} disabled={!alvoId || transferindo}>{transferindo ? "Transferindo..." : "Transferir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cotação?</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDel?.name}" será removida da lista. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const c = confirmDel; setConfirmDel(null);
              if (!c) return;
              try { await excluir(c.id); toast.success("Cotação excluída."); } catch (e) { toast.error((e as Error).message); }
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
