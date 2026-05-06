import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { Users, Server, Network, Database, ShieldCheck, Clock } from "lucide-react";

interface Props {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
  updateFunnel: (level: "percN1" | "percN2" | "percN3", value: number) => void;
  results: ITSMResults;
}

const inventoryItems = [
  { key: "qtdUsuarios" as const, label: "Usuários", icon: Users, color: "text-blue-500" },
  { key: "qtdServidores" as const, label: "Servidores", icon: Server, color: "text-emerald-500" },
  { key: "qtdAtivosRede" as const, label: "Ativos de Rede", icon: Network, color: "text-amber-500" },
  { key: "qtdBancosDados" as const, label: "Bancos de Dados", icon: Database, color: "text-purple-500" },
  { key: "qtdSistemas" as const, label: "Firewall", icon: ShieldCheck, color: "text-cyan-500" },
] as const;

export default function ClientPanel({ state, update }: Props) {
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

    </div>
  );
}

