import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Send, ShieldCheck, ShieldAlert, ShieldX, Clock, History } from "lucide-react";
import { toast } from "sonner";
import type { PricingApprovalState } from "@/hooks/usePricingApproval";

interface Props {
  approval: PricingApprovalState;
  canRequest: boolean;
  disabledReason?: string;
}

export default function ApprovalBadge({ approval, canRequest, disabledReason }: Props) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [links, setLinks] = useState<{ email: string; url: string; role: string }[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const status = approval.effectiveStatus;
  const variant = status === "approved" ? "default"
    : status === "rejected" ? "destructive"
    : status === "pending" ? "secondary"
    : "outline";
  const Icon = status === "approved" ? ShieldCheck
    : status === "rejected" ? ShieldX
    : status === "pending" ? Clock
    : ShieldAlert;

  async function handleRequest() {
    setSubmitting(true);
    const res = await approval.requestApproval();
    setSubmitting(false);
    if (!res.ok) { toast.error(res.error ?? "Falha ao solicitar aprovação"); return; }
    setLinks(res.approvalLinks ?? []);
    toast.success("Solicitação de aprovação enviada");
    setOpen(true);
  }

  const copyLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    catch { toast.error("Falha ao copiar"); }
  };

  return (
    <div className="flex h-10 w-full min-w-0 items-center justify-center gap-x-2 overflow-hidden rounded-lg border border-primary/30 bg-primary/5 px-3 py-0 text-xs">
      <span className="shrink-0 text-xs font-semibold text-foreground">Aprovação:</span>
      <Badge variant={variant as any} className="min-w-0 gap-1 text-[10px]">
        <Icon className="h-3 w-3 shrink-0" /> <span className="min-w-0 break-words">{approval.statusLabel}</span>
      </Badge>
      {!approval.requiresApproval ? null : status === "approved" ? null : (
        <>
          <Button
            size="sm" variant="outline"
            className="h-7 shrink-0 gap-1 text-[11px]"
            disabled={submitting || !canRequest}
            title={!canRequest ? (disabledReason ?? "Indisponível") : "Solicitar aprovação"}
            onClick={handleRequest}
          >
            <Send className="h-3 w-3" />
            {status === "rejected" ? "Reenviar" : approval.request ? "Reabrir" : "Solicitar"}
          </Button>
        </>
      )}
      {approval.request && (
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setHistory(true)} title="Histórico">
          <History className="h-3.5 w-3.5" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitação enviada</DialogTitle>
            <DialogDescription>
              E-mails de aprovação foram disparados aos aprovadores. Se preferir,
              copie e compartilhe manualmente os links abaixo (cada link aprova/rejeita por um aprovador).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-auto">
            {(links ?? []).map((l, i) => (
              <div key={i} className="flex items-center gap-2 rounded border p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{l.role}</div>
                  <div className="text-muted-foreground truncate">{l.email}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{l.url}</div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyLink(l.url)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={history} onOpenChange={setHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico de aprovação</DialogTitle>
            <DialogDescription>Decisões registradas para esta precificação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            {approval.decisions.length === 0 && <div className="text-muted-foreground">Sem decisões.</div>}
            {approval.decisions.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded border p-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{d.approver_email}</div>
                  {d.comment && <div className="text-muted-foreground">{d.comment}</div>}
                </div>
                <Badge variant={d.decision === "approved" ? "default" : d.decision === "rejected" ? "destructive" : "secondary"}>
                  {d.decision === "approved" ? "Aprovou" : d.decision === "rejected" ? "Rejeitou" : "Pendente"}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setHistory(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}