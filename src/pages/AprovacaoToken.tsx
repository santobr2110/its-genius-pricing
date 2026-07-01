import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Info {
  decision?: { decision: string; comment: string | null; decided_at: string | null; approver_email: string };
  request?: { status: string; offering: string; rentabilidade_pct: number; summary: Record<string, unknown> | null };
  error?: string;
  alreadyResolved?: boolean;
  alreadyDecided?: boolean;
}

export default function AprovacaoToken() {
  const { token = "" } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState<null | "approved" | "rejected">(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("decide-pricing-approval", {
        body: { token, action: "info" },
      });
      setInfo(error ? { error: error.message } : (data as Info));
      setLoading(false);
    })();
  }, [token]);

  async function decide(action: "approve" | "reject") {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("decide-pricing-approval", {
      body: { token, action, comment: comment || null },
    });
    setSubmitting(false);
    if (error) { setInfo({ error: error.message }); return; }
    setDone(action === "approve" ? "approved" : "rejected");
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;
  }

  if (info?.error) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Link inválido</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {info.error === "invalid_token" ? "Este link de aprovação não é válido ou expirou." : info.error}
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = (info?.request?.summary ?? {}) as Record<string, any>;
  const alreadyDecided = (info?.decision?.decision ?? "pending") !== "pending" || info?.alreadyResolved;

  const fmtBRL = (v: unknown) =>
    typeof v === "number"
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })
      : String(v ?? "—");
  const fmtPct = (v: unknown) => (typeof v === "number" ? `${v.toFixed(2)}%` : String(v ?? "—"));
  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-muted/30">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Aprovação de Precificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{info?.request?.offering ?? "—"}</Badge>
            <Badge>{Number(info?.request?.rentabilidade_pct ?? 0).toFixed(2)}% rentabilidade</Badge>
            <Badge variant="secondary">{info?.request?.status}</Badge>
          </div>
          <div className="rounded border p-4 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Dados comerciais</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cliente" value={summary.cliente} />
                <Field label="Nº da Cotação" value={summary.quote_code} />
                <Field label="Salesforce" value={summary.salesforce_code} />
                <Field label="Prazo do contrato" value={summary.contract_term} />
                <Field label="Account Manager" value={summary.account_manager} />
                <Field label="Especialista BU" value={summary.bu_specialist} />
                <Field label="Arquiteto BU" value={summary.bu_architect} />
                <Field label="Nome da precificação" value={summary.preset_name} />
              </div>
            </div>
            {Array.isArray(summary.camadas_ativas) && summary.camadas_ativas.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Camadas contratadas</div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.camadas_ativas.map((c: string) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Financeiro</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço mensal" value={fmtBRL(summary.preco_mensal)} />
                <Field label="Custo mensal" value={fmtBRL(summary.custo_total)} />
                <Field label="Investimento total" value={fmtBRL(summary.investimento_total)} />
                <Field label="Prazo (meses)" value={summary.meses ?? "—"} />
                <Field label="Rentabilidade" value={fmtPct(summary.rentabilidade_pct)} />
                <Field label="Comissão" value={fmtPct(summary.comissao_pct)} />
                <Field label="Impostos" value={fmtPct(summary.impostos_pct)} />
              </div>
            </div>
            {summary.observacoes && (
              <div className="text-muted-foreground text-xs border-t pt-2">{String(summary.observacoes)}</div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Aprovador: {info?.decision?.approver_email}</div>

          {done ? (
            <div className="rounded border p-3 bg-muted">
              {done === "approved" ? "Decisão registrada: APROVADO." : "Decisão registrada: REJEITADO."}
            </div>
          ) : alreadyDecided ? (
            <div className="rounded border p-3 bg-muted">
              Esta solicitação já foi decidida. Sua decisão anterior: <b>{info?.decision?.decision ?? "—"}</b>.
            </div>
          ) : (
            <>
              <Textarea placeholder="Comentário (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <Button variant="destructive" disabled={submitting} onClick={() => decide("reject")}>
                  <X className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
                <Button disabled={submitting} onClick={() => decide("approve")}>
                  <Check className="h-4 w-4 mr-1" /> Aprovar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}