import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, DollarSign, AlertTriangle } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import { Link } from "react-router-dom";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";

export default function EquipeN3() {
  const { state, update, results } = useITSMContext();
  const semHorasDisponiveis = results.horasPrevencao <= 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <Clock className="h-5 w-5 text-red-500 shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Equipe N3 — Estrutura de Custos</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2">
            <SortableNav current="equipe-n3" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SummaryCard label="Horas/Mês contratadas" value={`${formatNumber(state.horasN3Mensais)}h`} />
          <SummaryCard label="Horas em atendimento" value={`${formatNumber(results.horasAtendimentoN3, 1)}h`} />
          <SummaryCard label="Horas para prevenção" value={`${formatNumber(results.horasPrevencao, 1)}h`} alert={semHorasDisponiveis} />
          <SummaryCard label="Custo Total N3" value={formatBRL(results.custoN3)} highlight />
        </div>

        {semHorasDisponiveis && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-3 flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Sem horas disponíveis para prevenção</p>
                <p className="text-muted-foreground">As horas contratadas estão sendo totalmente consumidas em atendimento. Considere aumentar o pacote de horas mensal.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Parâmetros do Especialista N3</CardTitle>
            <p className="text-xs text-muted-foreground">Pacote de horas mensal de especialistas — usado para atendimento e prevenção</p>
          </CardHeader>
          <CardContent className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Horas / Mês (pacote)</Label>
                <Input
                  type="number"
                  step={1}
                  value={state.horasN3Mensais}
                  onChange={(e) => update("horasN3Mensais", parseFloat(e.target.value) || 0)}
                />
              </div>
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
