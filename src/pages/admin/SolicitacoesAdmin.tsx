import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { describeStatus, type ApprovalStatus } from "@/lib/approval/types";

interface Row {
  id: string;
  offering: string;
  rentabilidade_pct: number;
  status: ApprovalStatus;
  requester_id: string;
  created_at: string;
  decided_at: string | null;
  target_type: string;
  target_id: string;
  summary: any;
  requester_email?: string | null;
  requester_name?: string | null;
}

const STATUS_VARIANT: Record<ApprovalStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  canceled: "outline",
  not_required: "outline",
};

export default function SolicitacoesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Row[];
    const ids = Array.from(new Set(list.map((r) => r.requester_id))).filter(Boolean);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((r) => {
        const p: any = map.get(r.requester_id);
        r.requester_email = p?.email ?? null;
        r.requester_name = p?.full_name ?? null;
      });
    }
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (r: Row) => {
    if (!confirm(`Remover solicitação de ${r.requester_email ?? r.requester_id}?\nDecisões vinculadas também serão apagadas.`)) return;
    const { error } = await supabase.from("approval_requests").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitação removida.");
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  };

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (r.requester_email ?? "").toLowerCase().includes(s) ||
      (r.requester_name ?? "").toLowerCase().includes(s) ||
      r.offering.toLowerCase().includes(s) ||
      (r.summary?.cliente ?? "").toString().toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-4">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-sm font-bold">Administração · Solicitações de Aprovação</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
            <CardTitle>Todas as Solicitações</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por solicitante, calculadora, cliente…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8 w-72"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={load} className="h-8 gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Nenhuma solicitação encontrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Calculadora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Rent. %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{r.requester_name || r.requester_email || "—"}</div>
                        {r.requester_name && r.requester_email && (
                          <div className="text-xs text-muted-foreground">{r.requester_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.offering}</TableCell>
                      <TableCell className="text-sm">{r.summary?.cliente ?? "—"}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">
                        {Number(r.rentabilidade_pct).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status]}>{describeStatus(r.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-destructive"
                          onClick={() => remove(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}