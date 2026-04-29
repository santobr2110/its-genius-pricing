import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Server, DollarSign, BarChart3 } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import { Link } from "react-router-dom";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";

export default function EquipeN2() {
  const { state, update, results } = useITSMContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <Server className="h-5 w-5 text-amber-500 shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Equipe N2 — Estrutura de Custos</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2">
            <SortableNav current="equipe-n2" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryCard icon={DollarSign} label="Custo Total Analista" value={formatBRL(results.custoTotalAnalistaN2)} />
          <SummaryCard icon={Server} label="Capacidade" value={`${formatNumber(state.capacidadeServidoresN2)} servidores`} />
          <SummaryCard icon={BarChart3} label="Custo / Servidor" value={formatBRL(results.custoPorServidorN2)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Parâmetros do Analista N2</CardTitle>
            <p className="text-xs text-muted-foreground">1 analista · Regime 8×5 · Detalhamento simplificado (será expandido como N1)</p>
          </CardHeader>
          <CardContent className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Custo / Analista (mensal)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step={100}
                    value={state.custoAnalistaN2}
                    onChange={(e) => update("custoAnalistaN2", parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Salário + encargos do analista</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Capacidade de servidores por analista</Label>
                <Input
                  type="number"
                  step={1}
                  value={state.capacidadeServidoresN2}
                  onChange={(e) => update("capacidadeServidoresN2", parseFloat(e.target.value) || 0)}
                />
                <p className="text-[11px] text-muted-foreground">Quantos servidores um analista consegue atender</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Custos de Gestão</Label>
                <span className="text-sm font-semibold">{state.percGestaoN2}%</span>
              </div>
              <Slider
                value={[state.percGestaoN2]}
                onValueChange={([v]) => update("percGestaoN2", v)}
                min={0}
                max={50}
                step={1}
              />
              <p className="text-[11px] text-muted-foreground">Percentual aplicado sobre o custo do analista para cobrir gestão e overhead</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Próximos passos</p>
            Esta página será expandida para incluir tabela de perfis profissionais, encargos, benefícios e custos indiretos detalhados (mesmo padrão da Equipe N1).
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-amber-50 text-amber-600">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-base font-bold text-foreground truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
