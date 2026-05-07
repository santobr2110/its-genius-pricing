import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { Users, Server, Network, Database, ShieldCheck } from "lucide-react";

interface Props {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
  updateFunnel: (level: "percN1" | "percN2" | "percN3", value: number) => void;
  results: ITSMResults;
}

const groups = [
  {
    title: "Service Desk e Microinformática",
    items: [
      { key: "qtdUsuarios" as const, label: "Usuários", icon: Users, color: "text-blue-500" },
      { key: "qtdEquipamentos" as const, label: "Equipamento Desk/Note/Cel/Tablet", icon: Server, color: "text-indigo-500" },
    ],
  },
  {
    title: "Cloud / Datacenter",
    items: [
      { key: "qtdServidores" as const, label: "Servidores", icon: Server, color: "text-emerald-500" },
      { key: "qtdAtivosRede" as const, label: "Ativos de Rede", icon: Network, color: "text-amber-500" },
      { key: "qtdBancosDados" as const, label: "Bancos de Dados", icon: Database, color: "text-purple-500" },
      { key: "qtdSistemas" as const, label: "Firewall", icon: ShieldCheck, color: "text-cyan-500" },
    ],
  },
] as const;

export default function ClientPanel({ state, update }: Props) {
  return (
    <div className="space-y-4">
      {/* Inventário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Inventário do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map(({ key, label, icon: Icon, color }) => (
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
              </div>
            </div>
          ))}

        </CardContent>
      </Card>

    </div>
  );
}

