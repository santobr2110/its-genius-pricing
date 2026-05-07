import { useITSMContext } from "@/contexts/ITSMContext";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Bot, Filter, Activity } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import SavePresetButton from "@/components/SavePresetButton";
import BackHomeButton from "@/components/BackHomeButton";
import { formatNumber } from "@/hooks/useITSMCalculator";

const FUNNEL_COLORS = {
  N1: "bg-blue-500",
  N2: "bg-amber-500",
  N3: "bg-red-500",
};

export default function Operacao() {
  const { state, update, updateFunnel, results } = useITSMContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton />
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Operação</h1>
          </div>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SavePresetButton />
            <SaveDefaultsButton />
            <SortableNav current="operacao" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] p-4">
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
                {formatNumber(results.chamadosResolvidosN0)} chamados evitados · {formatNumber(results.volumeAtendimentoHumano)} para atendimento humano
              </p>
            </div>

            {/* Distribuição N1 / N2 / N3 */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs font-semibold">Distribuição do Atendimento</Label>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full">
                <div className={`${FUNNEL_COLORS.N1} transition-all`} style={{ width: `${state.percN1}%` }} />
                <div className={`${FUNNEL_COLORS.N2} transition-all`} style={{ width: `${state.percN2}%` }} />
                <div className={`${FUNNEL_COLORS.N3} transition-all`} style={{ width: `${state.percN3}%` }} />
              </div>

              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> N1: {state.percN1}% ({formatNumber(results.volumeN1)})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> N2: {state.percN2}% ({formatNumber(results.volumeN2)})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> N3: {state.percN3}% ({formatNumber(results.volumeN3)})</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">N1 — Service Desk</Label>
                    <span className="text-xs font-semibold">{state.percN1}%</span>
                  </div>
                  <Slider value={[state.percN1]} onValueChange={([v]) => updateFunnel("percN1", v)} min={0} max={100} step={1} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">N2 — Infraestrutura</Label>
                    <span className="text-xs font-semibold">{state.percN2}%</span>
                  </div>
                  <Slider value={[state.percN2]} onValueChange={([v]) => updateFunnel("percN2", v)} min={0} max={100} step={1} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">N3 — Especialistas</Label>
                    <span className="text-xs font-semibold">{state.percN3}%</span>
                  </div>
                  <Slider value={[state.percN3]} onValueChange={([v]) => updateFunnel("percN3", v)} min={0} max={100} step={1} />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Total: {state.percN1 + state.percN2 + state.percN3}% · {formatNumber(results.volumeAtendimentoHumano)} chamados
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
