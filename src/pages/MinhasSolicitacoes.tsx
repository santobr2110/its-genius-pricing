import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Send, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

type DecisionRow = {
  id: string;
  request_id: string;
  role_id: string;
  decision: "pending" | "approved" | "rejected";
  decided_at: string | null;
  comment: string | null;
};

type Row = RequestRow & { decisions: (DecisionRow & { roleLabel: string })[] };

function statusVariant(s: string) {
  return s === "approved" ? "default" : s === "rejected" ? "destructive" : s === "pending" ? "secondary" : "outline";
}

function statusLabel(s: string) {
  return s === "approved" ? "Aprovada" : s === "rejected" ? "Rejeitada" : s === "pending" ? "Pendente" : s === "canceled" ? "Cancelada" : "Não requerida";
}

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: reqs, error } = await supabase
      .from("approval_requests")
      .select("id, offering, target_type, target_id, rentabilidade_pct, status, summary, created_at, decided_at")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const reqIds = (reqs ?? []).map((r) => r.id);
    const [{ data: decs }, { data: roles }] = await Promise.all([
      reqIds.length
        ? supabase.from("approval_decisions")
            .select("id, request_id, role_id, decision, decided_at, comment")
            .in("request_id", reqIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("approval_roles").select("id, label"),
    ]);
    const roleMap = new Map((roles ?? []).map((r: any) => [r.id, r.label as string]));
    const decsByReq = new Map<string, (DecisionRow & { roleLabel: string })[]>();
    (decs ?? []).forEach((d: any) => {
      const list = decsByReq.get(d.request_id) ?? [];
      list.push({ ...d, roleLabel: roleMap.get(d.role_id) ?? "—" });
      decsByReq.set(d.request_id, list);
    });
    setRows((reqs ?? []).map((r: any) => ({ ...(r as RequestRow), decisions: decsByReq.get(r.id) ?? [] })));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const history = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-3 px-4">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-sm font-bold">Minhas Solicitações</h1>
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
              <Send className="h-4 w-4" /> Aguardando aprovação ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</div>
            )}
            {pending.map((r) => <RowCard key={r.id} row={r} />)}
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
              <div className="text-sm text-muted-foreground">Sem histórico de solicitações.</div>
            )}
            {history.map((r) => <RowCard key={r.id} row={r} />)}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function RowCard({ row }: { row: Row }) {
  const s = (row.summary ?? {}) as Record<string, any>;
  return (
    <div className="rounded border p-3 text-sm space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{row.offering}</Badge>
        <Badge variant="secondary">{Number(row.rentabilidade_pct ?? 0).toFixed(2)}% rent.</Badge>
        <Badge variant={statusVariant(row.status) as any}>Status: {statusLabel(row.status)}</Badge>
        <div className="ml-auto text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleString()}
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {s.cliente && <div><b className="text-foreground">Cliente:</b> {String(s.cliente)}</div>}
        {s.quote_code && <div><b className="text-foreground">Código:</b> {String(s.quote_code)}</div>}
        {s.preco_mensal != null && <div><b className="text-foreground">Preço mensal:</b> {String(s.preco_mensal)}</div>}
        {s.custo_total != null && <div><b className="text-foreground">Custo total:</b> {String(s.custo_total)}</div>}
      </div>
      {row.decisions.length > 0 && (
        <div className="pt-1 space-y-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Aprovadores</div>
          <div className="grid gap-1">
            {row.decisions.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{d.roleLabel}</Badge>
                <Badge variant={statusVariant(d.decision) as any}>
                  {d.decision === "approved" ? "Aprovou" : d.decision === "rejected" ? "Rejeitou" : "Pendente"}
                </Badge>
                {d.decided_at && (
                  <span className="text-muted-foreground">{new Date(d.decided_at).toLocaleString()}</span>
                )}
                {d.comment && <span className="text-muted-foreground italic">"{d.comment}"</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}