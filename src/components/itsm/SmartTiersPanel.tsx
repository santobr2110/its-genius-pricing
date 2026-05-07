import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Activity, Zap, Gauge, Building2 } from "lucide-react";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";

const TIERS = [
  { id: "monitor", label: "Smart Monitor", icon: Activity, desc: "Monitoramento de ativos (Servidores, Rede, Firewall)", available: true },
  { id: "operation", label: "Smart Operation", icon: Zap, desc: "Em breve", available: false },
  { id: "performance", label: "Smart Performance", icon: Gauge, desc: "Em breve", available: false },
  { id: "enterprise", label: "Smart Enterprise", icon: Building2, desc: "Em breve", available: false },
] as const;

export default function SmartTiersPanel() {
  const { results, state } = useITSMContext();
  const [selected, setSelected] = useState<Record<string, boolean>>({ monitor: true });

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const sm = results.smartMonitor;
  const fatorMargem = (100 - state.margemLucro) / 100;
  const fatorImposto = (100 - state.impostosTaxas) / 100;
  const fatorVenda = fatorMargem > 0 && fatorImposto > 0 ? fatorMargem * fatorImposto : 0;
  const toSell = (c: number) => (fatorVenda > 0 ? c / fatorVenda : 0);

  const smMonitVenda = toSell(sm.custoMonitoramento);
  const smN1Venda = toSell(sm.custoN1Alocado);
  const smTotalVenda = toSell(sm.total);
  const totalSelecionado = selected.monitor ? smTotalVenda : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Camadas de Oferta</CardTitle>
        <p className="text-xs text-muted-foreground">Selecione as camadas que comporão a precificação.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isSel = !!selected[t.id];
            return (
              <label
                key={t.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  t.available ? "cursor-pointer hover:bg-muted/40" : "opacity-50 cursor-not-allowed"
                } ${isSel ? "border-primary bg-primary/5" : ""}`}
              >
                <Checkbox
                  checked={isSel}
                  disabled={!t.available}
                  onCheckedChange={() => t.available && toggle(t.id)}
                  className="mt-0.5"
                />
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {selected.monitor && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Composição — Smart Monitor</p>
              <span className="text-[11px] text-muted-foreground">
                {formatNumber(sm.ativos)} ativos · {formatNumber(sm.chamadosAtivos, 1)} ch/mês
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">Monitoramento por ativo</span>
                <span className="font-semibold">{formatBRL(smMonitVenda)}</span>
              </div>
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">
                  Alocação N1 ({state.percAlocacaoN1Monitor}%)
                </span>
                <span className="font-semibold">{formatBRL(smN1Venda)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-xs font-semibold">Total Smart Monitor (venda)</span>
              <span className="text-sm font-bold text-primary">{formatBRL(smTotalVenda)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between border-t pt-3">
          <span className="text-sm font-semibold">Total das camadas selecionadas (venda)</span>
          <span className="text-base font-bold text-primary">{formatBRL(totalSelecionado)}</span>
        </div>
      </CardContent>
    </Card>
  );
}