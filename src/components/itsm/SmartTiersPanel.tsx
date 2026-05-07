import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Zap, Gauge, Building2, MapPin } from "lucide-react";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import type { ITSMState } from "@/hooks/useITSMCalculator";

const TIERS: {
  id: keyof ITSMState;
  label: string;
  icon: any;
  desc: string;
  available: boolean;
  selectedClass?: string;
}[] = [
  { id: "tierMonitor", label: "Smart Monitor", icon: Activity, desc: "Monitoramento de ativos (Servidores, Rede, Firewall)", available: true, selectedClass: "border-sky-200 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-900" },
  { id: "tierOperation", label: "Smart Operation", icon: Zap, desc: "Atendimento humano N1/N2 reativo com N3 opcional em horas", available: true, selectedClass: "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900" },
  { id: "tierPerformance", label: "Smart Performance", icon: Gauge, desc: "Em breve", available: false },
  { id: "tierEnterprise", label: "Smart Enterprise", icon: Building2, desc: "Em breve", available: false },
];

export default function SmartTiersPanel() {
  const { results, state, update } = useITSMContext();
  const sm = results.smartMonitor;
  const fatorMargem = (100 - state.margemLucro) / 100;
  const fatorImposto = (100 - state.impostosTaxas) / 100;
  const fatorVenda = fatorMargem > 0 && fatorImposto > 0 ? fatorMargem * fatorImposto : 0;
  const toSell = (c: number) => (fatorVenda > 0 ? c / fatorVenda : 0);

  const smMonitVenda = toSell(sm.custoMonitoramento);
  const smN1Venda = toSell(sm.custoN1Alocado);
  const smTotalVenda = toSell(sm.total);
  const operacaoCustoTotal = results.custoN1 + results.custoN2 + results.custoN3;
  const smOperationVenda = state.tierOperation ? toSell(operacaoCustoTotal) : 0;
  const fs = results.fieldService;
  const fsVenda = fs.active ? toSell(fs.total) : 0;
  const totalSelecionado = (state.tierMonitor ? smTotalVenda : 0) + smOperationVenda + fsVenda;

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
            const isSel = !!state[t.id];
            // Smart Monitor não pode ser removido quando Smart Operation estiver ativo
            const locked = t.id === "tierMonitor" && state.tierOperation;
            return (
              <label
                key={t.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  t.available && !locked ? "cursor-pointer hover:bg-muted/40" : "opacity-70 cursor-not-allowed"
                } ${isSel ? (t.selectedClass ?? "border-primary bg-primary/5") : ""}`}
              >
                <Checkbox
                  checked={isSel}
                  disabled={!t.available || locked}
                  onCheckedChange={() => {
                    if (!t.available || locked) return;
                    const next = !isSel;
                    update(t.id, next as any);
                    // Smart Operation exige Smart Monitor ativo
                    if (t.id === "tierOperation" && next && !state.tierMonitor) {
                      update("tierMonitor", true as any);
                    }
                  }}
                  className="mt-0.5"
                />
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.desc}
                    {locked && " · obrigatório com Smart Operation"}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {state.tierMonitor && (
          <div className="rounded-lg border border-sky-200 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-900 p-3 space-y-2">
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
                  {state.tierOperation
                    ? "Alocação N1 (incluída no Smart Operation)"
                    : `Alocação N1 (${state.percAlocacaoN1Monitor}%)`}
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

        {state.tierOperation && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Composição — Smart Operation</p>
              <span className="text-[11px] text-muted-foreground">
                Distribuição N1 {state.percN1}% · N2 {state.percN2}%
                {state.tierOperationN3 ? ` · N3 ${state.percN3}%` : ""}
              </span>
            </div>
            <div className={`grid ${state.tierOperationN3 ? "grid-cols-3" : "grid-cols-2"} gap-2 text-xs`}>
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">N1</span>
                <span className="font-semibold">{formatBRL(toSell(results.custoN1))}</span>
              </div>
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">N2</span>
                <span className="font-semibold">{formatBRL(toSell(results.custoN2))}</span>
              </div>
              {state.tierOperationN3 && (
                <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                  <span className="text-muted-foreground">
                    N3 ({formatNumber(state.horasN3Mensais)}h)
                  </span>
                  <span className="font-semibold">{formatBRL(toSell(results.custoN3))}</span>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 rounded border bg-background px-2 py-1.5 cursor-pointer">
              <Checkbox
                checked={state.tierOperationN3}
                onCheckedChange={() => update("tierOperationN3", !state.tierOperationN3 as any)}
              />
              <span className="text-xs">
                Adicionar atendimento N3 opcional ({formatBRL(state.valorHoraN3)}/h)
              </span>
            </label>
            {state.tierOperationN3 && (
              <div className="flex items-center gap-2 rounded border bg-background px-2 py-1.5">
                <Label className="text-[11px] text-muted-foreground">Horas N3/Mês</Label>
                <Input
                  type="number"
                  value={state.horasN3Mensais === 0 ? "" : state.horasN3Mensais}
                  onChange={(e) => update("horasN3Mensais", parseInt(e.target.value) || 0)}
                  className="h-7 text-sm w-24 ml-auto"
                />
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-xs font-semibold">Total Smart Operation (venda)</span>
              <span className="text-sm font-bold text-primary">{formatBRL(smOperationVenda)}</span>
            </div>

            <div className="border-t pt-2 space-y-2">
              <label className="flex items-start gap-2 rounded border bg-background px-2 py-1.5 cursor-pointer">
                <Checkbox
                  checked={state.tierFieldOperation}
                  onCheckedChange={() => update("tierFieldOperation", !state.tierFieldOperation as any)}
                  className="mt-0.5"
                />
                <MapPin className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Adicionar Field Service</p>
                  <p className="text-[11px] text-muted-foreground">
                    Atendimento presencial N1/N2/N3 — chamados de usuários passam pelo N1 convencional e são escalados para a equipe Field.
                  </p>
                </div>
              </label>
              {state.tierFieldOperation && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Composição — Field Service</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatNumber(fs.volumeUsuariosEscalado, 1)} ch/mês escalados
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">N1F ({state.percFieldN1F}%)</span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN1F))}</span>
                    </div>
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">N2F ({state.percFieldN2F}%)</span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN2F))}</span>
                    </div>
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">N3F ({state.percFieldN3F}%)</span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN3F))}</span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-xs font-semibold">Total Field Service (venda)</span>
                    <span className="text-sm font-bold text-primary">{formatBRL(fsVenda)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between border-t pt-3">
          <span className="text-sm font-semibold">Valor Total de Venda</span>
          <span className="text-base font-bold text-primary">{formatBRL(totalSelecionado)}</span>
        </div>
      </CardContent>
    </Card>
  );
}