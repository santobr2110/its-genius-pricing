import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, DollarSign } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";

export default function EquipeN3() {
  const { state, update, results } = useITSMContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton /><Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <Clock className="h-5 w-5 text-red-500 shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Equipe N3 — Estrutura de Custos</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="equipe-n3" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SummaryCard label="Valor / Hora N3" value={formatBRL(state.valorHoraN3)} />
          <SummaryCard label="Tempo médio / chamado" value={`${formatNumber(state.tempoMedioChamadoN3, 1)}h`} highlight />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Parâmetros do Especialista N3</CardTitle>
            <p className="text-xs text-muted-foreground">Custo por hora e tempo médio de atendimento</p>
          </CardHeader>
          <CardContent className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Valor / Hora N3</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step={5}
                    value={state.valorHoraN3}
                    onChange={(e) => update("valorHoraN3", parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tempo médio / chamado N3 (h)</Label>
                <Input
                  type="number"
                  step={0.5}
                  value={state.tempoMedioChamadoN3}
                  onChange={(e) => update("tempoMedioChamadoN3", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Próximos passos</p>
            Esta página será expandida para incluir perfis de especialistas (segurança, cloud, redes, etc.), com salários, encargos e alocação de horas por especialidade.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, highlight, alert }: { label: string; value: string; highlight?: boolean; alert?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md ${alert ? "bg-destructive/10 text-destructive" : highlight ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {highlight ? <DollarSign className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={`text-base font-bold truncate ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
