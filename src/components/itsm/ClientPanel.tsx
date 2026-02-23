import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITSMState, ITSMResults, formatNumber, PlanoRotinas, PLANO_ROTINAS_MULTIPLICADOR } from "@/hooks/useITSMCalculator";
import { Users, Server, Network, Database, Bot, Monitor, RotateCcw } from "lucide-react";

interface Props {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
  updateN1N2N3: (key: "percN1" | "percN2" | "percN3", value: number) => void;
  results: ITSMResults;
}

const inventoryItems = [
  { key: "qtdUsuarios" as const, label: "Usuários", icon: Users, color: "text-blue-500" },
  { key: "qtdServidores" as const, label: "Servidores", icon: Server, color: "text-emerald-500" },
  { key: "qtdAtivosRede" as const, label: "Ativos de Rede", icon: Network, color: "text-amber-500" },
  { key: "qtdBancosDados" as const, label: "Bancos de Dados", icon: Database, color: "text-purple-500" },
  { key: "qtdSistemas" as const, label: "Sistemas", icon: Monitor, color: "text-cyan-500" },
] as const;

const planoLabels: Record<PlanoRotinas, string> = {
  ouro: "Ouro",
  prata: "Prata",
  bronze: "Bronze",
};

const funnelColors = {
  percN1: "bg-blue-500",
  percN2: "bg-amber-500",
  percN3: "bg-red-500",
};

export default function ClientPanel({ state, update, updateN1N2N3, results }: Props) {
  return (
    <div className="space-y-4">
      {/* Inventário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Inventário do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {inventoryItems.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-2 rounded-lg border p-2.5">
                <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                <div className="flex-1 space-y-0.5">
                  <Label className="text-[11px] text-muted-foreground leading-none">{label}</Label>
                  <Input
                    type="number"
                    value={state[key]}
                    onChange={(e) => update(key, parseInt(e.target.value) || 0)}
                    className="h-7 text-sm border-0 p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            ))}
            {/* Rotinas com dropdown de plano */}
            <div key="rotinas" className="flex items-center gap-2 rounded-lg border p-2.5">
              <RotateCcw className="h-5 w-5 shrink-0 text-rose-500" />
              <div className="flex-1 space-y-0.5">
                <Label className="text-[11px] text-muted-foreground leading-none">Rotinas</Label>
                <Select value={state.planoRotinas} onValueChange={(v) => update("planoRotinas", v as PlanoRotinas)}>
                  <SelectTrigger className="h-7 text-sm border-0 p-0 shadow-none focus-visible:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["ouro", "prata", "bronze"] as PlanoRotinas[]).map((p) => (
                      <SelectItem key={p} value={p}>{planoLabels[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funil de Atendimento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Funil de Atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* N0 Automação */}
          <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-primary" />
                <Label className="text-xs font-semibold">Automação N0</Label>
              </div>
              <span className="text-xs font-bold text-primary">{state.reducaoN0}%</span>
            </div>
            <Slider value={[state.reducaoN0]} onValueChange={([v]) => update("reducaoN0", v)} min={0} max={60} step={1} />
            <p className="text-[11px] text-muted-foreground">
              {formatNumber(results.chamadosResolvidosN0)} chamados evitados por automação
            </p>
          </div>

          {/* Automação de Rotinas */}
          <div className="space-y-2 rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4 text-rose-500" />
                <Label className="text-xs font-semibold">Automação de Rotinas</Label>
              </div>
              <span className="text-xs font-bold text-rose-500">{state.reducaoRotinas}%</span>
            </div>
            <Slider value={[state.reducaoRotinas]} onValueChange={([v]) => update("reducaoRotinas", v)} min={0} max={80} step={1} />
            <p className="text-[11px] text-muted-foreground">
              {formatNumber(results.rotinasAutomatizadas, 1)} rotinas automatizadas · {formatNumber(results.rotinasHumanas, 1)} direcionadas ao N3
            </p>
          </div>

          {/* N1, N2, N3 */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Distribuição Humana (N1 + N2 + N3 = 100%)</Label>
            {(["percN1", "percN2", "percN3"] as const).map((key) => {
              const level = key.replace("perc", "");
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{level}</span>
                    <span className="text-xs font-semibold">{state[key]}%</span>
                  </div>
                  <Slider value={[state[key]]} onValueChange={([v]) => updateN1N2N3(key, v)} min={0} max={100} step={1} />
                </div>
              );
            })}
            {/* Visual bar */}
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className={`${funnelColors.percN1} transition-all`} style={{ width: `${state.percN1}%` }} />
              <div className={`${funnelColors.percN2} transition-all`} style={{ width: `${state.percN2}%` }} />
              <div className={`${funnelColors.percN3} transition-all`} style={{ width: `${state.percN3}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" />N1</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" />N2</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />N3</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
