import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Check, X, RefreshCw, Inbox, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Decision = {
  id: string;
  request_id: string;
  role_id: string;
  decision: "pending" | "approved" | "rejected";
  decided_at: string | null;
  comment: string | null;
  created_at: string;
};

type RequestRow = {
  id: string;
  offering: string;
  target_type: string;
  target_id: string;
  rentabilidade_pct: number;
  status: "pending" | "approved" | "rejected" | "canceled" | "not_required";
  summary: Record<string, any> | null;
  created_at: string;
  decided_at: string | null;
};

type Row = Decision & { request: RequestRow | null; roleLabel: string };

function statusVariant(s: string) {
  return s === "approved" ? "default" : s === "rejected" ? "destructive" : s === "pending" ? "secondary" : "outline";
}

export default function MinhasAprovacoes() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ row: Row; action: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: decs, error } = await supabase
      .from("approval_decisions")
      .select("id, request_id, role_id, decision, decided_at, comment, created_at")
      .eq("approver_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const reqIds = Array.from(new Set((decs ?? []).map((d) => d.request_id)));
    const roleIds = Array.from(new Set((decs ?? []).map((d) => d.role_id)));
    const [{ data: reqs }, { data: roles }] = await Promise.all([
      reqIds.length
        ? supabase.from("approval_requests")
            .select("id, offering, target_type, target_id, rentabilidade_pct, status, summary, created_at, decided_at")
            .in("id", reqIds)
        : Promise.resolve({ data: [] as any[] }),
      roleIds.length
        ? supabase.from("approval_roles").select("id, label").in("id", roleIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const reqMap = new Map((reqs ?? []).map((r: any) => [r.id, r as RequestRow]));
    const roleMap = new Map((roles ?? []).map((r: any) => [r.id, r.label as string]));
    setRows((decs ?? []).map((d) => ({
      ...(d as Decision),
      request: reqMap.get(d.request_id) ?? null,
      roleLabel: roleMap.get(d.role_id) ?? "—",
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const pending = useMemo(
    () => rows.filter((r) => r.decision === "pending" && r.request?.status === "pending"),
    [rows],
  );
  const history = useMemo(
    () => rows.filter((r) => !(r.decision === "pending" && r.request?.status === "pending")),
    [rows],
  );

  async function submit() {
    if (!dialog) return;
    setBusyId(dialog.row.id);
    const { data, error } = await supabase.functions.invoke("decide-pricing-approval-auth", {
      body: { decisionId: dialog.row.id, action: dialog.action, comment: comment || null },
    });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error(error?.message ?? (data as any)?.error ?? "Falha ao registrar decisão");
      return;
    }
    toast.success(dialog.action === "approve" ? "Aprovação registrada" : "Rejeição registrada");
    setDialog(null);
    setComment("");
    refresh();
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-3 px-4">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-sm font-bold">Minhas Aprovações</h1>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-4 w-4" /> Pendentes ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhuma aprovação aguardando sua decisão.</div>
            )}
            {pending.map((r) => (
              <RowCard key={r.id} row={r} busy={busyId === r.id}
                onApprove={() => { setComment(""); setDialog({ row: r, action: "approve" }); }}
                onReject={() => { setComment(""); setDialog({ row: r, action: "reject" }); }}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Histórico ({history.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 && (
              <div className="text-sm text-muted-foreground">Sem histórico de decisões.</div>
            )}
            {history.map((r) => <RowCard key={r.id} row={r} readOnly />)}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.action === "approve" ? "Aprovar precificação" : "Rejeitar precificação"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.row?.request?.summary?.cliente && <>Cliente: <b>{String(dialog?.row?.request?.summary?.cliente)}</b><br /></>}
              Rentabilidade: <b>{Number(dialog?.row?.request?.rentabilidade_pct ?? 0).toFixed(2)}%</b>
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Comentário (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button
              variant={dialog?.action === "reject" ? "destructive" : "default"}
              disabled={busyId === dialog?.row?.id}
              onClick={submit}
            >
              {dialog?.action === "approve" ? <><Check className="h-4 w-4 mr-1" /> Aprovar</> : <><X className="h-4 w-4 mr-1" /> Rejeitar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowCard({ row, onApprove, onReject, busy, readOnly }: {
  row: Row; onApprove?: () => void; onReject?: () => void; busy?: boolean; readOnly?: boolean;
}) {
  const r = row.request;
  const s = (r?.summary ?? {}) as Record<string, any>;
  return (
    <div className="rounded border p-3 text-sm space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{r?.offering ?? "—"}</Badge>
        <Badge variant="secondary">{Number(r?.rentabilidade_pct ?? 0).toFixed(2)}% rent.</Badge>
        <Badge variant="outline">Papel: {row.roleLabel}</Badge>
        <Badge variant={statusVariant(row.decision) as any}>
          Minha decisão: {row.decision === "approved" ? "Aprovada" : row.decision === "rejected" ? "Rejeitada" : "Pendente"}
        </Badge>
        {r && (
          <Badge variant={statusVariant(r.status) as any}>
            Solicitação: {r.status}
          </Badge>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleString()}
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {s.cliente && <div><b className="text-foreground">Cliente:</b> {String(s.cliente)}</div>}
        {s.quote_code && <div><b className="text-foreground">Código:</b> {String(s.quote_code)}</div>}
        {s.preco_mensal != null && <div><b className="text-foreground">Preço mensal:</b> {String(s.preco_mensal)}</div>}
        {s.custo_total != null && <div><b className="text-foreground">Custo total:</b> {String(s.custo_total)}</div>}
        {row.comment && <div><b className="text-foreground">Meu comentário:</b> {row.comment}</div>}
      </div>
      {!readOnly && (
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="destructive" disabled={busy} onClick={onReject}>
            <X className="h-3.5 w-3.5 mr-1" /> Rejeitar
          </Button>
          <Button size="sm" disabled={busy} onClick={onApprove}>
            <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
          </Button>
        </div>
      )}
    </div>
  );
}