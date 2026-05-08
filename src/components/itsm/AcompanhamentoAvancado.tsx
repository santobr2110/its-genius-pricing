import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  TrendingUp,
  Users,
} from "lucide-react";
import { useITSMContext } from "@/contexts/ITSMContext";
import { useITSMCalculator } from "@/hooks/useITSMCalculator";
import { usePersistentState } from "@/hooks/usePersistentState";

interface KpiConfig {
  slaMeta: number;
  slaAtual: number;
  mttrMeta: number;
  mttrAtual: number;
  fcrMeta: number;
  fcrAtual: number;
  csatMeta: number;
  csatAtual: number;
  backlogMeta: number;
  backlogAtual: number;
  reaberturaMeta: number;
  reaberturaAtual: number;
}

const KPI_DEFAULTS: KpiConfig = {
  slaMeta: 95,
  slaAtual: 92,
  mttrMeta: 4,
  mttrAtual: 5.2,
  fcrMeta: 70,
  fcrAtual: 65,
  csatMeta: 90,
  csatAtual: 88,
  backlogMeta: 50,
  backlogAtual: 72,
  reaberturaMeta: 5,
  reaberturaAtual: 7,
};

type Direction = "higher" | "lower";

interface KpiDef {
  key: keyof KpiConfig;
  metaKey: keyof KpiConfig;
  label: string;
  description: string;
  unit: string;
  direction: Direction;
  icon: React.ComponentType<{ className?: string }>;
}

const KPIS: KpiDef[] = [
  { key: "slaAtual", metaKey: "slaMeta", label: "SLA de Atendimento", description: "% de chamados resolvidos dentro do prazo", unit: "%", direction: "higher", icon: CheckCircle2 },
  { key: "mttrAtual", metaKey: "mttrMeta", label: "MTTR", description: "Tempo médio de resolução (horas)", unit: "h", direction: "lower", icon: Clock },
  { key: "fcrAtual", metaKey: "fcrMeta", label: "FCR (1º contato)", description: "% resolvido no primeiro contato", unit: "%", direction: "higher", icon: Gauge },
  { key: "csatAtual", metaKey: "csatMeta", label: "CSAT", description: "Satisfação do usuário", unit: "%", direction: "higher", icon: TrendingUp },
  { key: "backlogAtual", metaKey: "backlogMeta", label: "Backlog", description: "Chamados em aberto fim do mês", unit: "ch", direction: "lower", icon: Activity },
  { key: "reaberturaAtual", metaKey: "reaberturaMeta", label: "Reaberturas", description: "% de chamados reabertos", unit: "%", direction: "lower", icon: AlertTriangle },
];

function statusOf(atual: number, meta: number, direction: Direction): "ok" | "warn" | "bad" {
  const diff = direction === "higher" ? atual - meta : meta - atual;
  const tol = Math.abs(meta) * 0.05;
  if (diff >= 0) return "ok";
  if (diff >= -tol) return "warn";
  return "bad";
}

const STATUS_BADGE: Record<"ok" | "warn" | "bad", { label: string; cls: string }> = {
  ok: { label: "Na meta", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  warn: { label: "Atenção", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  bad: { label: "Fora da meta", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function AcompanhamentoAvancado() {
  const { state } = useITSMContext();
  const { results } = useITSMCalculator();
  const [kpi, setKpi] = usePersistentState<KpiConfig>("gestao-ti:kpi-acompanhamento", KPI_DEFAULTS);

  const setVal = (k: keyof KpiConfig, v: number) =>
    setKpi((prev) => ({ ...prev, [k]: Number.isFinite(v) ? v : 0 }));

  // Capacidade por time
  const capacidade = useMemo(() => {
    const capN1 = state.capacidadeChamadosN1;
    const capN2 = state.capacidadeChamadosN2;
    const horasMesN3 = state.horasN3Mensais || 1;
    const usoN1 = capN1 > 0 ? (results.volumeN1 / capN1) * 100 : 0;
    const usoN2 = capN2 > 0 ? (results.volumeN2 / capN2) * 100 : 0;
    const usoN3 = horasMesN3 > 0 ? (results.horasAtendimentoN3 / horasMesN3) * 100 : 0;
    return [
      { time: "N1 — Service Desk", uso: usoN1, demanda: results.volumeN1, capacidade: capN1, unidade: "ch/mês" },
      { time: "N2 — Especialistas", uso: usoN2, demanda: results.volumeN2, capacidade: capN2, unidade: "ch/mês" },
      { time: "N3 — Engenharia", uso: usoN3, demanda: results.horasAtendimentoN3, capacidade: state.horasN3Mensais, unidade: "h/mês" },
    ];
  }, [state, results]);

  const alertas = useMemo(() => {
    const lista: { titulo: string; detalhe: string; severidade: "warn" | "bad" }[] = [];
    KPIS.forEach((d) => {
      const s = statusOf(kpi[d.key] as number, kpi[d.metaKey] as number, d.direction);
      if (s !== "ok") {
        lista.push({
          titulo: d.label,
          detalhe: `Atual ${kpi[d.key]}${d.unit} vs Meta ${kpi[d.metaKey]}${d.unit}`,
          severidade: s,
        });
      }
    });
    capacidade.forEach((c) => {
      if (c.uso >= 100) {
        lista.push({ titulo: `Capacidade ${c.time}`, detalhe: `Utilização em ${c.uso.toFixed(0)}% — risco de SLA`, severidade: "bad" });
      } else if (c.uso >= 85) {
        lista.push({ titulo: `Capacidade ${c.time}`, detalhe: `Utilização em ${c.uso.toFixed(0)}% — monitorar`, severidade: "warn" });
      }
    });
    return lista;
  }, [kpi, capacidade]);

  const okCount = KPIS.filter((d) => statusOf(kpi[d.key] as number, kpi[d.metaKey] as number, d.direction) === "ok").length;

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">KPIs na meta</p>
            <p className="text-2xl font-bold">
              {okCount}<span className="text-sm font-normal text-muted-foreground">/{KPIS.length}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Demanda total / mês</p>
            <p className="text-2xl font-bold">{results.volumeAtendimentoHumano.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">chamados</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Alertas ativos</p>
            <p className="text-2xl font-bold text-destructive">{alertas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> Indicadores de Performance
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure metas e valores atuais. O status é calculado automaticamente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {KPIS.map((d) => {
              const atual = kpi[d.key] as number;
              const meta = kpi[d.metaKey] as number;
              const s = statusOf(atual, meta, d.direction);
              const Icon = d.icon;
              const pct = d.direction === "higher"
                ? (meta > 0 ? Math.min(100, (atual / meta) * 100) : 0)
                : (atual > 0 ? Math.min(100, (meta / atual) * 100) : 100);
              return (
                <div key={d.key} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{d.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{d.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={STATUS_BADGE[s].cls}>{STATUS_BADGE[s].label}</Badge>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Atual</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={atual}
                          onChange={(e) => setVal(d.key, parseFloat(e.target.value))}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">{d.unit}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Meta</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={meta}
                          onChange={(e) => setVal(d.metaKey, parseFloat(e.target.value))}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">{d.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Capacidade por time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Capacidade dos Times
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Utilização calculada com base na demanda mensal vs capacidade configurada.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {capacidade.map((c) => {
            const sev = c.uso >= 100 ? "bad" : c.uso >= 85 ? "warn" : "ok";
            return (
              <div key={c.time} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{c.time}</p>
                  <Badge variant="outline" className={STATUS_BADGE[sev].cls}>
                    {c.uso.toFixed(0)}% utilizado
                  </Badge>
                </div>
                <Progress value={Math.min(100, c.uso)} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>Demanda: {c.demanda.toFixed(1)} {c.unidade}</span>
                  <span>Capacidade: {c.capacidade.toFixed(0)} {c.unidade}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" /> Alertas e Desvios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertas.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Nenhum desvio identificado — operação dentro das metas.
            </div>
          ) : (
            <ul className="space-y-2">
              {alertas.map((a, i) => (
                <li key={i} className="flex items-start gap-2 rounded border bg-muted/30 p-2">
                  <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${a.severidade === "bad" ? "text-destructive" : "text-amber-500"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground">{a.detalhe}</p>
                  </div>
                  <Badge variant="outline" className={`ml-auto ${STATUS_BADGE[a.severidade].cls}`}>
                    {STATUS_BADGE[a.severidade].label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
