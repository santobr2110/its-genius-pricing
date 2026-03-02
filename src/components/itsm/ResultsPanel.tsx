import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ITSMState, ITSMResults, formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import { DollarSign, Clock, TrendingUp, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  state: ITSMState;
  results: ITSMResults;
}

export default function ResultsPanel({ state, results }: Props) {
  const hasDeficit = results.horasPrevencao <= 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <HighlightCard icon={DollarSign} label="Preço Sugerido" value={formatBRL(results.precoVendaMensal)} accent="text-emerald-600 bg-emerald-50" />
        <HighlightCard icon={TrendingUp} label="Custo Total" value={formatBRL(results.custoTotalOperacao)} accent="text-blue-600 bg-blue-50" />
        <HighlightCard
          icon={Clock}
          label="Horas N3/Mês"
          value={`${formatNumber(results.horasN3)}h`}
          accent={hasDeficit ? "text-destructive bg-destructive/10" : "text-amber-600 bg-amber-50"}
          badge={hasDeficit ? "Deficit" : undefined}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ReportRow label="Chamados Gerados" value={formatNumber(results.volumeTotalBruto)} />
          <ReportRow label="Evitados (N0)" value={formatNumber(results.chamadosResolvidosN0)} highlight />
          <ReportRow label="Atendimento Humano" value={formatNumber(results.volumeAtendimentoHumano)} />
          <div className="border-t pt-2 mt-2 space-y-1">
            <ReportRow label={`→ N1 (${state.percN1}%)`} value={formatNumber(results.volumeN1)} sub />
            <ReportRow label="→ N1 custo/chamado" value={formatBRL(results.custoPorChamadoN1)} sub />
            <ReportRow label={`→ N2 (${state.percN2}%)`} value={formatNumber(results.volumeN2)} sub />
            <ReportRow label="→ N2 custo/servidor" value={formatBRL(results.custoPorServidorN2)} sub />
            <ReportRow label={`→ N3 (${state.percN3}%)`} value={formatNumber(results.volumeN3)} sub />
            <ReportRow label="→ N3 horas atend." value={`${formatNumber(results.horasAtendimentoN3, 1)}h`} sub />
            <ReportRow label="→ N3 horas prevenção" value={`${formatNumber(results.horasPrevencao, 1)}h`} sub />
          </div>
          <div className="border-t pt-2 mt-2 space-y-1">
            <ReportRow label="Custo N1" value={formatBRL(results.custoN1)} />
            <ReportRow label="Custo N2" value={formatBRL(results.custoN2)} />
            <ReportRow label="Custo N3" value={formatBRL(results.custoN3)} />
            <ReportRow label="Ferramentas" value={formatBRL(state.custoFixoFerramentas)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HighlightCard({ icon: Icon, label, value, accent, badge }: {
  icon: React.ElementType; label: string; value: string; accent: string; badge?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold text-foreground truncate leading-tight">{value}</p>
        </div>
        {badge && (
          <Badge variant="destructive" className="text-[10px] gap-1 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            {badge}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function ReportRow({ label, value, highlight, sub }: {
  label: string; value: string; highlight?: boolean; sub?: boolean;
}) {
  return (
    <div className={`flex justify-between ${sub ? "pl-2 text-xs" : ""}`}>
      <span className={`text-muted-foreground ${sub ? "text-xs" : "text-sm"}`}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-primary" : "text-foreground"} ${sub ? "text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}
