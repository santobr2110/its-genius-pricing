import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ITSMState, ITSMResults, formatNumber } from "@/hooks/useITSMCalculator";
import { Users, Server, Network, Database, Monitor, Bot, Clock } from "lucide-react";

interface Props {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
  results: ITSMResults;
}

const inventoryItems = [
  { key: "qtdUsuarios" as const, label: "Usuários", icon: Users, color: "text-blue-500" },
  { key: "qtdServidores" as const, label: "Servidores", icon: Server, color: "text-emerald-500" },
  { key: "qtdAtivosRede" as const, label: "Ativos de Rede", icon: Network, color: "text-amber-500" },
  { key: "qtdBancosDados" as const, label: "Bancos de Dados", icon: Database, color: "text-purple-500" },
  { key: "qtdSistemas" as const, label: "Sistemas", icon: Monitor, color: "text-cyan-500" },
] as const;

export default function ClientPanel({ state, update, results }: Props) {
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
            {/* Horas N3 */}
            <div className="flex items-center gap-2 rounded-lg border p-2.5">
              <Clock className="h-5 w-5 shrink-0 text-red-500" />
              <div className="flex-1 space-y-0.5">
                <Label className="text-[11px] text-muted-foreground leading-none">Horas N3/Mês</Label>
                <Input
                  type="number"
                  value={state.horasN3Mensais}
                  onChange={(e) => update("horasN3Mensais", parseInt(e.target.value) || 0)}
                  className="h-7 text-sm border-0 p-0 shadow-none focus-visible:ring-0"
                />
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
              {formatNumber(results.chamadosResolvidosN0)} chamados evitados · {formatNumber(results.volumeAtendimentoHumano)} para atendimento humano
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
