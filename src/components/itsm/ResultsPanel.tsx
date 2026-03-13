import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ITSMState, ITSMResults, formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import { DollarSign, Clock, TrendingUp, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildAreas, getAreaTotal } from "@/lib/buildAreas";
import { useMemo } from "react";

interface Props {
  state: ITSMState;
  results: ITSMResults;
}

export default function ResultsPanel({ state, results }: Props) {
  const hasDeficit = results.horasPrevencao <= 0;
  const areas = useMemo(() => buildAreas(state, results), [state, results]);
  const grandTotal = areas.reduce((s, a) => s + getAreaTotal(a), 0);

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
            <FileText className="h-3.5 w-3.5" /> Custos por Área
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {areas.map((area) => {
            const total = getAreaTotal(area);
            const Icon = area.icon;
            const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
            return (
              <div key={area.nome} className="flex items-center gap-2 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-muted-foreground truncate">{area.nome}</span>
                <span className="font-semibold text-foreground w-20 text-right">{formatBRL(total)}</span>
                <span className="text-muted-foreground w-10 text-right">{formatNumber(pct, 1)}%</span>
              </div>
            );
          })}
          <div className="border-t pt-1.5 mt-1.5 flex items-center gap-2 text-xs font-bold">
            <span className="flex-1">Total</span>
            <span className="w-20 text-right">{formatBRL(grandTotal)}</span>
            <span className="w-10 text-right">100%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Valor de Venda por Área
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {areas.map((area) => {
            const cost = getAreaTotal(area);
            const sellPrice = fatorDivisor > 0 ? cost / fatorDivisor : 0;
            const Icon = area.icon;
            const pct = grandSellTotal > 0 ? (sellPrice / grandSellTotal) * 100 : 0;
            return (
              <div key={area.nome} className="flex items-center gap-2 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-muted-foreground truncate">{area.nome}</span>
                <span className="font-semibold text-foreground w-20 text-right">{formatBRL(sellPrice)}</span>
                <span className="text-muted-foreground w-10 text-right">{formatNumber(pct, 1)}%</span>
              </div>
            );
          })}
          <div className="border-t pt-1.5 mt-1.5 flex items-center gap-2 text-xs font-bold">
            <span className="flex-1">Total</span>
            <span className="w-20 text-right">{formatBRL(grandSellTotal)}</span>
            <span className="w-10 text-right">100%</span>
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
