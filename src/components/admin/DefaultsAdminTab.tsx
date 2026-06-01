import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { labelForDefaultKey, offeringForDefaultKey } from "@/lib/defaultsLabels";

interface DefaultRow {
  key: string;
  updated_at: string;
  updated_by: string | null;
  value: unknown;
}
interface HistoryRow {
  id: string;
  key: string;
  version: number;
  value: unknown;
  changed_by: string | null;
  changed_at: string;
  change_kind: "insert" | "update" | "revert";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function DefaultsAdminTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DefaultRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewRow, setViewRow] = useState<DefaultRow | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_defaults")
      .select("key, updated_at, updated_by, value")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as DefaultRow[];
    setRows(list);
    const userIds = Array.from(
      new Set(list.map((r) => r.updated_by).filter((u): u is string => !!u)),
    );
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => {
        map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      });
      setAuthors(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Parâmetros padrão</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Valores aplicados como ponto de partida para todos os usuários. Toda alteração é versionada — você pode reverter para qualquer versão anterior.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum parâmetro salvo ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parâmetro</TableHead>
                <TableHead>Oferta</TableHead>
                <TableHead>Última alteração</TableHead>
                <TableHead>Por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="text-sm font-medium">{labelForDefaultKey(r.key)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{offeringForDefaultKey(r.key)}</TableCell>
                  <TableCell className="text-xs">{formatDate(r.updated_at)}</TableCell>
                  <TableCell className="text-xs">{r.updated_by ? (authors[r.updated_by] ?? r.updated_by.slice(0, 8)) : "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" className="gap-1 h-8" onClick={() => setViewRow(r)}>
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 h-8" onClick={() => setHistoryKey(r.key)}>
                      <History className="h-3.5 w-3.5" /> Histórico
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ViewValueDialog row={viewRow} onClose={() => setViewRow(null)} />
      <HistoryDialog
        keyName={historyKey}
        currentUserId={user?.id}
        authors={authors}
        onClose={() => setHistoryKey(null)}
        onReverted={() => { setHistoryKey(null); load(); }}
      />
    </Card>
  );
}

function ViewValueDialog({ row, onClose }: { row: DefaultRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {row ? labelForDefaultKey(row.key) : ""}
          </DialogTitle>
          <DialogDescription className="text-xs font-mono">{row?.key}</DialogDescription>
        </DialogHeader>
        <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-[60vh]">
          {row ? JSON.stringify(row.value, null, 2) : ""}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  keyName, currentUserId, authors, onClose, onReverted,
}: {
  keyName: string | null;
  currentUserId?: string;
  authors: Record<string, string>;
  onClose: () => void;
  onReverted: () => void;
}) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<HistoryRow | null>(null);
  const [confirming, setConfirming] = useState<HistoryRow | null>(null);
  const [extraAuthors, setExtraAuthors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!keyName) {
      setHistory([]);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_defaults_history")
        .select("id, key, version, value, changed_by, changed_at, change_kind")
        .eq("key", keyName)
        .order("version", { ascending: false });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const list = (data ?? []) as HistoryRow[];
      setHistory(list);
      const ids = Array.from(new Set(list.map((h) => h.changed_by).filter((u): u is string => !!u && !authors[u])));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p) => { map[p.id] = p.full_name || p.email || p.id.slice(0, 8); });
        setExtraAuthors(map);
      } else {
        setExtraAuthors({});
      }
      setLoading(false);
    })();
  }, [keyName, authors]);

  const authorName = (id: string | null) =>
    !id ? "—" : (authors[id] ?? extraAuthors[id] ?? id.slice(0, 8));

  const doRevert = async (h: HistoryRow) => {
    setBusy(true);
    const { error } = await supabase.rpc("revert_app_default", {
      _key: h.key, _version: h.version,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Revertido para a versão ${h.version}.`);
    setConfirming(null);
    onReverted();
  };

  return (
    <>
      <Dialog open={!!keyName} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Histórico — {keyName ? labelForDefaultKey(keyName) : ""}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">{keyName}</DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem versões registradas.</p>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versão</TableHead>
                    <TableHead>Data/hora</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h, idx) => {
                    const isCurrent = idx === 0;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm font-mono">
                          v{h.version}
                          {isCurrent && <Badge variant="secondary" className="ml-2 text-[10px]">atual</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(h.changed_at)}</TableCell>
                        <TableCell className="text-xs">
                          {authorName(h.changed_by)}
                          {h.changed_by === currentUserId && <Badge variant="secondary" className="ml-2 text-[10px]">você</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">{h.change_kind}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" className="gap-1 h-8" onClick={() => setViewing(h)}>
                            <Eye className="h-3.5 w-3.5" /> Ver
                          </Button>
                          {!isCurrent && (
                            <Button variant="ghost" size="sm" className="gap-1 h-8" onClick={() => setConfirming(h)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Reverter
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {viewing ? `${labelForDefaultKey(viewing.key)} — v${viewing.version}` : ""}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewing ? `${formatDate(viewing.changed_at)} · ${authorName(viewing.changed_by)} · ${viewing.change_kind}` : ""}
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-[60vh]">
            {viewing ? JSON.stringify(viewing.value, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirming} onOpenChange={(v) => !v && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverter parâmetro?</DialogTitle>
            <DialogDescription>
              Esta ação substituirá o valor atual de <strong>{confirming ? labelForDefaultKey(confirming.key) : ""}</strong> pelo conteúdo da <strong>versão {confirming?.version}</strong>. A operação fica registrada no histórico como nova versão.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={() => confirming && doRevert(confirming)} disabled={busy} className="gap-1.5">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              <RotateCcw className="h-4 w-4" /> Reverter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}