import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ITSMState, ITSMResults, formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import { Gauge, Users, Server, Clock, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  state: ITSMState;
  results: ITSMResults;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
}

function NumInput({ label, value, onChange, step = 1, prefix, tooltip }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; prefix?: string; tooltip?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`h-8 text-sm ${prefix ? "pl-8" : ""}`}
        />
      </div>
    </div>
  );
}

function MetricResult({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 px-2 rounded bg-muted/50">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function MetricsPanel({ state, results, update }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Gauge className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Métricas e Parâmetros</h2>
      </div>

      {/* N1 - Posição de Atendimento */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            N1 — Posição de Atendimento
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">4 pessoas · Regime 12×36</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <NumInput
              label="Custo/Pessoa"
              value={state.custoPessoaN1}
              onChange={(v) => update("custoPessoaN1", v)}
              prefix="R$"
              step={100}
              tooltip="Custo mensal de cada pessoa na posição (salário + encargos)"
            />
            <NumInput
              label="Capacidade"
              value={state.capacidadeChamadosN1}
              onChange={(v) => update("capacidadeChamadosN1", v)}
              step={50}
              tooltip="Chamados/mês que uma posição consegue atender"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Gestão</Label>
              <span className="text-xs font-semibold text-foreground">{state.percGestaoN1}%</span>
            </div>
            <Slider value={[state.percGestaoN1]} onValueChange={([v]) => update("percGestaoN1", v)} min={0} max={50} step={1} />
          </div>
          <div className="space-y-1">
            <MetricResult label="Custo Posição" value={formatBRL(results.custoPosicaoN1)} />
            <MetricResult label="Custo/Chamado" value={formatBRL(results.custoPorChamadoN1)} />
          </div>
        </CardContent>
      </Card>

      {/* N2 - Analista */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-amber-500" />
            N2 — Analista de Campo
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">1 analista · Regime 8×5</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <NumInput
              label="Custo/Analista"
              value={state.custoAnalistaN2}
              onChange={(v) => update("custoAnalistaN2", v)}
              prefix="R$"
              step={100}
              tooltip="Custo mensal do analista (salário + encargos)"
            />
            <NumInput
              label="Cap. Servidores"
              value={state.capacidadeServidoresN2}
              onChange={(v) => update("capacidadeServidoresN2", v)}
              step={1}
              tooltip="Servidores que um analista consegue atender"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Gestão</Label>
              <span className="text-xs font-semibold text-foreground">{state.percGestaoN2}%</span>
            </div>
            <Slider value={[state.percGestaoN2]} onValueChange={([v]) => update("percGestaoN2", v)} min={0} max={50} step={1} />
          </div>
          <div className="space-y-1">
            <MetricResult label="Custo/Analista Total" value={formatBRL(results.custoTotalAnalistaN2)} />
            <MetricResult label="Custo/Servidor" value={formatBRL(results.custoPorServidorN2)} />
          </div>
        </CardContent>
      </Card>

      {/* N3 - Horas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-red-500" />
            N3 — Especialistas
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Custo por hora de atendimento</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <NumInput
            label="Valor/Hora N3"
            value={state.valorHoraN3}
            onChange={(v) => update("valorHoraN3", v)}
            prefix="R$"
            step={5}
            tooltip="Custo hora do especialista N3"
          />
          <MetricResult label="Horas/Mês (inventário)" value={`${formatNumber(state.horasN3Mensais)}h`} />
          <MetricResult label="Custo N3 Total" value={formatBRL(results.custoN3)} />
        </CardContent>
      </Card>
    </div>
  );
}
