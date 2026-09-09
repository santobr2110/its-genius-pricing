import { useITSMContext } from "@/contexts/ITSMContext";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Users, Server, Network, Database, ShieldCheck, Bot, Filter, Activity } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import { ITSMState, formatNumber } from "@/hooks/useITSMCalculator";
import { LucideIcon } from "lucide-react";
import WriteFence from "@/components/auth/WriteFence";
import { MonitorUMCard } from "@/components/itsm/MetricsPanel";

const FUNNEL_COLORS = {
  N1: "bg-blue-500",
  N2: "bg-amber-500",
  N3: "bg-red-500",
};

function CriticidadeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const display = Math.round(value * 100 * 100) / 100;
  const [text, setText] = useState<string>(String(display));
  const [focused, setFocused] = useState(false);
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={focused ? text : String(display)}
      onFocus={() => {
        setText(String(display));
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === "" || v === "-") return;
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) onChange(parsed / 100);
      }}
      className="h-9 pr-7"
    />
  );
}

interface RateRowProps {
  icon: LucideIcon;
  label: string;
  description: string;
  value: number;
  qty: number;
  qtyLabel: string;
  onChange: (v: number) => void;
  ajuste?: number;
}

function RateRow({ icon: Icon, label, description, value, qty, qtyLabel, onChange, ajuste = 0 }: RateRowProps) {
  const valorAjustado = Math.max(0, value * (1 + ajuste));
  const total = qty * valorAjustado;
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3 items-center p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Chamados / mês por unidade</Label>
        <Input
          type="number"
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-9"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{qtyLabel}</Label>
        <div className="flex items-center justify-between gap-2 h-9 px-3 rounded-md border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {qty.toLocaleString("pt-BR")} × {valorAjustado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
            {ajuste !== 0 && (
              <span className="ml-1 text-[10px]">({ajuste > 0 ? "+" : ""}{(ajuste * 100).toFixed(0)}%)</span>
            )}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {total.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ch/mês
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TaxasDemanda() {
  const { state, update, updateFunnel, results } = useITSMContext();
  const criticidadeEscala = state.criticidadeEscala ?? [-0.3, -0.15, 0, 0.15, 0.3];
  const criticidadeNivel = state.criticidadeNivel ?? 2;
  const ajusteCriticidade = criticidadeEscala[criticidadeNivel] ?? 0;

  const set = <K extends keyof ITSMState>(k: K) => (v: number) => update(k, v as ITSMState[K]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton /><Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Métricas e Parâmetros</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="taxas" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
<WriteFence permission="page.taxas_demanda.write" anyOf={["pricing.edit","params.save_defaults"]}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Operação — Funil de Atendimento
            </CardTitle>
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

        <MonitorUMCard state={state} update={update} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monitoramento</CardTitle>
            <p className="text-xs text-muted-foreground">
              Parâmetros que compõem o custo das camadas de monitoramento (Smart Monitor, Smart Flow e Smart Operation) e definem os limites dos sliders na tela "Camadas de Oferta".
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* === Smart Monitor === */}
            <div className="rounded-lg border border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
                <h4 className="text-sm font-bold text-foreground">Smart Monitor</h4>
                <span className="text-[10px] text-muted-foreground">monitoramento de infraestrutura</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Valor Proxy Inicial — Smart Monitor (R$/mês)</Label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    value={state.valorProxyInicial}
                    onChange={(e) => update("valorProxyInicial", parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Variável <code>valorProxyInicial</code> · custo fixo do 1º proxy do slider "Quantidade de Proxys" na camada Smart Monitor.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Valor Proxy Adicional — Smart Monitor (R$/mês)</Label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    value={state.valorProxyAdicional}
                    onChange={(e) => update("valorProxyAdicional", parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Variável <code>valorProxyAdicional</code> · cobrado por cada proxy além do 1º no slider "Quantidade de Proxys" do Smart Monitor.
                  </p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Quantidade Máxima de Proxys — Smart Monitor</Label>
                  <Input
                    type="number"
                    step={1}
                    min={1}
                    value={state.qtdProxysMonitorMax}
                    onChange={(e) => update("qtdProxysMonitorMax", Math.max(1, Math.floor(parseFloat(e.target.value) || 1)))}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Variável <code>qtdProxysMonitorMax</code> · limite máximo do slider "Quantidade de Proxys" da camada Smart Monitor (mínimo fixo em 1).
                  </p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Lista de ITSMs disponíveis para integração — Smart Monitor</Label>
                  <textarea
                    rows={4}
                    value={(state.itsmFlowList ?? []).join("\n")}
                    onChange={(e) =>
                      update(
                        "itsmFlowList",
                        e.target.value.split("\n"),
                      )
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Um ITSM por linha (ex.: ServiceNow)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Variável <code>itsmFlowList</code> · alimenta o dropdown "ITSM a ser integrado" exibido na composição do Smart Monitor. Um ITSM por linha.
                  </p>
                </div>
              </div>
            </div>

            {/* === Smart Flow === */}
            <div className="rounded-lg border border-sky-500/40 bg-sky-50/30 dark:bg-sky-950/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-600" />
                <h4 className="text-sm font-bold text-foreground">Smart Flow</h4>
                <span className="text-[10px] text-muted-foreground">monitoramento integrado ao ITSM</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">% Alocação N1 — Smart Flow</Label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    max={100}
                    value={state.percAlocacaoN1Flow}
                    onChange={(e) => update("percAlocacaoN1Flow", parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Variável <code>percAlocacaoN1Flow</code> · % × custo por chamado N1 × chamados de Servidores+Rede+Firewall (parcela de N1 alocada quando Operation está inativo).
                  </p>
                </div>
              </div>
            </div>

            {/* === Smart Operation === */}
            <div className="rounded-lg border border-slate-400/40 bg-slate-50/40 dark:bg-slate-900/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-slate-400 to-zinc-500" />
                <h4 className="text-sm font-bold text-foreground">Smart Operation</h4>
                <span className="text-[10px] text-muted-foreground">Service Desk humano com monitoramento incluso</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">% Alocação N1 — Smart Operation</Label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    max={100}
                    value={state.percAlocacaoN1Operation}
                    onChange={(e) => update("percAlocacaoN1Operation", parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Variável <code>percAlocacaoN1Operation</code> · % × custo por chamado N1 × chamados de Servidores+Rede+Firewall absorvidos pelo Smart Operation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tolerância</CardTitle>
            <p className="text-xs text-muted-foreground">
              Margem aceitável acima da capacidade nominal das equipes.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">% Limite de excedente por equipe</Label>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={200}
                  value={state.percLimiteExcedente}
                  onChange={(e) => update("percLimiteExcedente", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Margem aceitável acima da capacidade da equipe antes de sinalizar excedente no Relatório de Demanda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Limites N3</CardTitle>
            <p className="text-xs text-muted-foreground">
              Faixa mínima e máxima de horas mensais de N3 disponíveis em cada camada de oferta. Vincula-se aos sliders da tela Camadas de Oferta.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              { label: "Smart Monitor — Automação / Manutenção", minKey: "horasN3MonitorManutMin", maxKey: "horasN3MonitorManutMax" },
              { label: "Smart Monitor — Acionamento N3", minKey: "horasN3MonitorMin", maxKey: "horasN3MonitorMax" },
              { label: "Smart Flow — Horas de Automação", minKey: "horasN3FlowManutMin", maxKey: "horasN3FlowManutMax" },
              { label: "Smart Flow — Acionamento N3", minKey: "horasN3FlowMin", maxKey: "horasN3FlowMax" },
              { label: "Smart Operation", minKey: "horasN3OperationMin", maxKey: "horasN3OperationMax" },
              { label: "Smart Performance", minKey: "horasN3PerformanceMin", maxKey: "horasN3PerformanceMax" },
              { label: "Smart Operation — Horas de Melhoria", minKey: "horasMelhoriaOpMin", maxKey: "horasMelhoriaOpMax" },
              { label: "Smart Performance — Horas de Melhoria", minKey: "horasMelhoriaPerfMin", maxKey: "horasMelhoriaPerfMax" },
            ] as const).map((row) => (
              <div key={row.label} className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 items-center p-3 rounded-lg border bg-card">
                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mínimo (h/mês)</Label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    value={state[row.minKey] as number}
                    onChange={(e) => update(row.minKey, (parseFloat(e.target.value) || 0) as any)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Máximo (h/mês)</Label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    value={state[row.maxKey] as number}
                    onChange={(e) => update(row.maxKey, (parseFloat(e.target.value) || 0) as any)}
                    className="h-9"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Escala de Criticidade do Ambiente</CardTitle>
            <p className="text-xs text-muted-foreground">
              Multiplicador percentual aplicado às taxas de chamados/mês conforme o nível de criticidade selecionado no inventário do cliente.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {["Muito Baixo", "Baixo", "Padrão", "Alto", "Muito Alto"].map((nome, idx) => (
                <div key={nome} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{nome}</Label>
                  <div className="relative">
                    <CriticidadeInput
                      value={criticidadeEscala[idx] ?? 0}
                      onChange={(v) => {
                        const next = [...criticidadeEscala];
                        next[idx] = v;
                        update("criticidadeEscala", next);
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              O valor é aplicado como multiplicador percentual sobre a taxa de chamados/mês de cada categoria (ex.: -30% reduz a taxa em 30%).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Volume mensal de chamados por categoria</CardTitle>
            <p className="text-xs text-muted-foreground">
              Defina quantos chamados por mês cada item do inventário gera, em média.
              O total é calculado automaticamente a partir do inventário do cliente.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <RateRow
              icon={Server}
              label="Servidores"
              description="Chamados gerados por servidores físicos/virtuais"
              value={state.taxaServidor}
              qty={state.qtdServidores}
              qtyLabel="Inventário de servidores"
              onChange={set("taxaServidor")}
              ajuste={ajusteCriticidade}
            />
            <RateRow
              icon={Network}
              label="Rede"
              description="Chamados de ativos de rede (switches, roteadores, firewall, AP)"
              value={state.taxaRede}
              qty={state.qtdAtivosRede}
              qtyLabel="Ativos de rede"
              onChange={set("taxaRede")}
              ajuste={ajusteCriticidade}
            />
            <RateRow
              icon={Database}
              label="Banco de Dados"
              description="Chamados relacionados a instâncias de banco de dados"
              value={state.taxaBancoDados}
              qty={state.qtdBancosDados}
              qtyLabel="Bancos de dados"
              onChange={set("taxaBancoDados")}
              ajuste={ajusteCriticidade}
            />
            <RateRow
              icon={ShieldCheck}
              label="Firewall"
              description="Chamados relacionados a firewalls (regras, bloqueios, VPN, incidentes)"
              value={state.taxaSistemas}
              qty={state.qtdSistemas}
              qtyLabel="Inventário de firewalls"
              onChange={set("taxaSistemas")}
              ajuste={ajusteCriticidade}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Total Infraestrutura</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {results.totalChamadosInfra.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">chamados/mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Volume Total Bruto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {results.volumeTotalBruto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">chamados/mês</p>
            </CardContent>
          </Card>
        </div>
      </WriteFence>
      </main>
    </div>
  );
}
