import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { Users, Server, Network, Database, ShieldCheck, Laptop, Gauge } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
      { key: "qtdEquipamentos" as const, label: "Equipamento Desk/Note/Cel/Tablet", icon: Laptop, color: "text-indigo-500" },
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
  const niveis = ["Muito Baixo", "Baixo", "Ideal", "Alto", "Muito Alto"];
  const descritivos = [
    "Ambiente Cloud Native, PaaS, sem equipamentos físicos. Alto Investimento.",
    "Ambiente Cloud IaaS, Baremetal em Cloud suportado pelo Provedor. Investimento previsto.",
    "Ambiente padronizado com Suporte Ativo e menos de 3 anos de vida útil. Investimento aprovado pontualmente.",
    "Ambiente sem padrão com Suporte Ativo Renovado e mais de 3 anos de vida útil. Investimento difícil.",
    "Ambiente sem padrão, sem Suporte Ativo, com mais de 5 anos de vida útil. Baixo investimento.",
  ];
  const escala = state.criticidadeEscala ?? [-0.3, -0.15, 0, 0.15, 0.3];
  const nivel = state.criticidadeNivel ?? 2;
  const ajusteAtual = escala[nivel] ?? 0;
  // Cores por nível: verde → amarelo → vermelho
  const coresNivel = ["#16a34a", "#84cc16", "#eab308", "#f97316", "#dc2626"];
  const corAtual = coresNivel[nivel] ?? coresNivel[2];
  const gradiente = `linear-gradient(to right, ${coresNivel.join(", ")})`;
  const complexidadeItens: { key: keyof ITSMState; label: string }[] = [
    { key: "complexVirtualizacaoCluster", label: "Virtualização Clusterizada" },
    { key: "complexBancoDadosHA", label: "Banco de Dados em HA" },
    { key: "complexFirewallHA", label: "Firewall em HA ou WAF" },
    { key: "complexMultiSites", label: "Multi-sites" },
    { key: "complexSiteBackup", label: "Site Backup" },
    { key: "complexHibridoCloudOnPrem", label: "Ambiente Híbrido Cloud/On-Premises" },
    { key: "complexOperacao24x7", label: "Operação 24x7" },
    { key: "complexErpMercado", label: "ERP de Mercado" },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Perfil do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Inventário</p>
            {groups.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                {group.title}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="flex items-center gap-2 rounded-lg border p-2">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground leading-none truncate block">{label}</Label>
                      <Input
                        type="number"
                        value={state[key] === 0 ? "" : (state[key] as number)}
                        onChange={(e) => update(key, parseInt(e.target.value) || 0)}
                        className="h-7 text-sm border-0 p-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ))}
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Risco</p>
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">Nível</Label>
                    <span className="text-xs font-semibold text-foreground">
                      {niveis[nivel]}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({ajusteAtual > 0 ? "+" : ""}{(ajusteAtual * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <Slider
                value={[nivel]}
                min={0}
                max={4}
                step={1}
                onValueChange={(v) => update("criticidadeNivel", v[0])}
                className="w-[90%] mx-auto"
                trackClassName="bg-transparent"
                rangeClassName="bg-transparent"
                trackStyle={{ backgroundImage: gradiente }}
                thumbStyle={{ backgroundColor: corAtual, borderColor: corAtual }}
              />
              <div className="relative h-7 w-[90%] mx-auto text-[10px] text-muted-foreground">
                {niveis.map((n, i) => {
                  const pct = (i / (niveis.length - 1)) * 100;
                  const partes = n.split(" ");
                  return (
                    <span
                      key={n}
                      className="absolute top-0 -translate-x-1/2 text-center leading-tight"
                      style={{ left: `${pct}%` }}
                    >
                      {partes.map((p, idx) => (
                        <span key={idx} className="block">{p}</span>
                      ))}
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                {descritivos[nivel]}
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Complexidade</p>
              {!state.tierPerformance && (
                <span className="text-[10px] text-muted-foreground italic">Ative Smart Performance para editar</span>
              )}
            </div>
            <div className={`rounded-lg border grid grid-cols-2 gap-x-3 gap-y-1.5 p-2 ${!state.tierPerformance ? "opacity-50" : ""}`}>
              {complexidadeItens.map(({ key, label }) => (
                <label
                  key={key}
                  htmlFor={`cx-${key}`}
                  className={`flex items-center gap-2 ${state.tierPerformance ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  <Checkbox
                    id={`cx-${key}`}
                    checked={Boolean(state[key])}
                    disabled={!state.tierPerformance}
                    onCheckedChange={(v) => update(key, Boolean(v) as ITSMState[typeof key])}
                  />
                  <span className="text-[11px] leading-tight">{label}</span>
                </label>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

