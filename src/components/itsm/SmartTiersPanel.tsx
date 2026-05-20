import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Activity, Zap, Gauge, Building2, MapPin, ListChecks, Medal, Award, Trophy, Gem } from "lucide-react";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import type { ITSMState } from "@/hooks/useITSMCalculator";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  ROTINAS_DEFAULT,
  rotinaMultiplicador,
  COMPLEX_FLAG_KEYS,
  type ComplexFlags,
  type Rotina,
} from "@/data/rotinas";
import { useMemo, useState } from "react";

// Normaliza rotinas de Sistema Operacional (Linux/Windows) para tratá-las como
// unitárias por ambiente, independente da oferta (Operation/Performance) ou
// complexidade (Padrão/Complexo). Gateia pelo inventário de Servidores.
function normalizeOsRotina(r: Rotina): Rotina {
  const grupo = r.grupo.toLowerCase();
  const isOs = grupo.includes("sistema operacional");
  if (!isOs) return r;
  return { ...r, ativo: "Servidor", unidade: "Servidor (Ambiente)", abrangencia: "Ambiente" };
}

// Input numérico que aceita frações (ex.: 0,8 / 0.5) preservando o que o
// usuário digita até que o valor seja válido.
function FractionInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [raw, setRaw] = useState<string>(value === 0 ? "" : String(value).replace(".", ","));
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={(e) => {
        const s = e.target.value;
        // Permite vazio, dígitos e vírgula/ponto durante digitação
        if (!/^[0-9]*[.,]?[0-9]*$/.test(s)) return;
        setRaw(s);
        const parsed = parseFloat(s.replace(",", "."));
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
      onBlur={() => {
        if (raw === "" || raw === "," || raw === ".") setRaw("");
        else setRaw(String(parseFloat(raw.replace(",", "."))).replace(".", ","));
      }}
      className={className}
    />
  );
}

const TIERS: {
  id: keyof ITSMState;
  label: string;
  icon: any;
  desc: string;
  available: boolean;
  alias: string;
  aliasIcon: any;
  aliasClass: string;
  selectedClass?: string;
}[] = [
  { id: "tierMonitor",     label: "Smart Monitor",     icon: Activity,   desc: "Monitoramento de ativos (Servidores, Rede, Firewall)",                  available: true,  alias: "Bronze",  aliasIcon: Medal,  aliasClass: "bg-gradient-to-r from-amber-600 to-orange-700 text-white",  selectedClass: "border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800" },
    { id: "tierOperation",   label: "Smart Operation",   icon: Zap,        desc: "Gestão de TI com N1/N2 e N3 em horas - rotinas preventivas básicas. Aqui podemos aplicar field remoto ou presencial",             available: true,  alias: "Silver",  aliasIcon: Award,  aliasClass: "bg-gradient-to-r from-slate-400 to-zinc-500 text-white",     selectedClass: "border-slate-400 bg-slate-100/80 dark:bg-slate-800/40 dark:border-slate-600" },
   { id: "tierPerformance", label: "Smart Performance", icon: Gauge,      desc: "Rotinas preventivas e de complexidade · exige Smart Monitor + Operation", available: true, alias: "Gold",    aliasIcon: Trophy, aliasClass: "bg-gradient-to-r from-yellow-500 to-amber-600 text-yellow-950",  selectedClass: "border-yellow-400 bg-yellow-50/70 dark:bg-yellow-950/30 dark:border-yellow-800" },
  { id: "tierEnterprise",  label: "Smart Enterprise",  icon: Building2,  desc: "Em breve",                                                                available: false, alias: "Diamond", aliasIcon: Gem,    aliasClass: "bg-gradient-to-r from-cyan-400 to-sky-600 text-white" },
];

export default function SmartTiersPanel() {
  const { results, state, update } = useITSMContext();
  const sm = results.smartMonitor;
  const fatorMargem = (100 - state.margemLucro) / 100;
  const fatorImposto = (100 - state.impostosTaxas) / 100;
  const fatorVenda = fatorMargem > 0 && fatorImposto > 0 ? fatorMargem * fatorImposto : 0;
  const toSell = (c: number) => (fatorVenda > 0 ? c / fatorVenda : 0);

  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  // Distribuição percentual das horas N3 entre as 3 funções (TAM / Owner / Livre).
  // Os dois "cortes" definem os limites: [0..corteTam] = TAM, [corteTam..corteOwner] = Owner, [corteOwner..100] = Livre.
  const [n3Cortes, setN3Cortes] = usePersistentState<[number, number]>(
    "gestao-ti:smartPerf:n3Cortes",
    [33, 66],
  );
  const [corteTam, corteOwner] = n3Cortes;
  const pctTam = corteTam;
  const pctOwner = Math.max(0, corteOwner - corteTam);
  const pctLivre = Math.max(0, 100 - corteOwner);
  const setPctTam = (value: number) => {
    const nextTam = Math.max(0, Math.min(100 - pctOwner, value));
    setN3Cortes([nextTam, nextTam + pctOwner]);
  };
  const setPctOwner = (value: number) => {
    const nextOwner = Math.max(0, Math.min(100 - pctTam, value));
    setN3Cortes([pctTam, pctTam + nextOwner]);
  };
  const horasTotaisN3 = state.horasN3Mensais || 0;
  const horasTam = (horasTotaisN3 * pctTam) / 100;
  const horasOwner = (horasTotaisN3 * pctOwner) / 100;
  // Horas consumidas pelo atendimento de chamados N3 (do funil)
  const horasChamadosN3 = results.horasAtendimentoN3 || 0;
  const pctChamadosN3 = horasTotaisN3 > 0 ? (horasChamadosN3 / horasTotaisN3) * 100 : 0;
  // Livre = sobra após chamados + TAM + Owner
  const horasLivre = Math.max(0, horasTotaisN3 - horasChamadosN3 - horasTam - horasOwner);
  const pctLivreReal = horasTotaisN3 > 0 ? (horasLivre / horasTotaisN3) * 100 : 0;
  const livreEstourado = horasChamadosN3 + horasTam + horasOwner > horasTotaisN3;

  const inv = {
    qtdUsuarios: state.qtdUsuarios,
    qtdEquipamentos: state.qtdEquipamentos,
    qtdServidores: state.qtdServidores,
    qtdAtivosRede: state.qtdAtivosRede,
    qtdBancosDados: state.qtdBancosDados,
    qtdSistemas: state.qtdSistemas,
  };
  const complexFlags: ComplexFlags = {
    complexVirtualizacaoCluster: state.complexVirtualizacaoCluster,
    complexBancoDadosHA: state.complexBancoDadosHA,
    complexFirewallHA: state.complexFirewallHA,
    complexMultiSites: state.complexMultiSites,
    complexSiteBackup: state.complexSiteBackup,
    complexHibridoCloudOnPrem: state.complexHibridoCloudOnPrem,
    complexOperacao24x7: state.complexOperacao24x7,
    complexErpMercado: state.complexErpMercado,
  };
  const algumComplexAtivo = COMPLEX_FLAG_KEYS.some((k) => complexFlags[k]);

  const hasInfraInventory =
    (inv.qtdServidores || 0) + (inv.qtdAtivosRede || 0) +
    (inv.qtdBancosDados || 0) + (inv.qtdSistemas || 0) > 0;
  const hasServiceDesk =
    (inv.qtdUsuarios || 0) + (inv.qtdEquipamentos || 0) > 0;
  const n3OptionalScenario = !hasInfraInventory && hasServiceDesk;

  // Custo médio por chamado de rotina ponderado pela escala de rotinas
  // (independente do funil de chamados de usuários/infra).
  const custoChN3Mix = state.tempoMedioChamadoN3 * state.valorHoraN3;
  const somaRotina = (state.percRotinaN1 + state.percRotinaN2 + state.percRotinaN3) || 100;
  const wRotN1 = state.percRotinaN1 / somaRotina;
  const wRotN2 = state.percRotinaN2 / somaRotina;
  const wRotN3 = state.percRotinaN3 / somaRotina;
  const custoPorChamadoMix =
    wRotN1 * results.custoPorChamadoN1 +
    wRotN2 * results.custoPorChamadoN2 +
    wRotN3 * custoChN3Mix;

  const rotinasOperation = useMemo(() => {
    const items = rotinas
      .filter((r) => r.oferta === "Operation")
      // Sem infra (apenas service desk): apenas microinformática.
      // Com infra + service desk: todas as rotinas (incluindo microinformática).
      // Com infra sem service desk: exclui microinformática (vai para Field Service).
      .filter((r) =>
        n3OptionalScenario
          ? r.grupo.toLowerCase().includes("microinform")
          : hasServiceDesk && !state.tierFieldOperation
            ? true
            : !r.grupo.toLowerCase().includes("microinform"),
      )
      .map((r) => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const cac = r.cac * mult;
        const fatorAuto = r.automacao
          ? Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100
          : 1;
        const custo = demanda * custoPorChamadoMix * fatorAuto;
        const venda = toSell(custo);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, automacao: r.automacao, demanda, cac, custo, venda };
      })
      .filter((i) => i.demanda > 0)
      .sort((a, b) => b.venda - a.venda);

    const totals = items.reduce(
      (acc, i) => {
        acc.demanda += i.demanda;
        acc.cac += i.cac;
        acc.custo += i.custo;
        acc.venda += i.venda;
        return acc;
      },
      { demanda: 0, cac: 0, custo: 0, venda: 0 },
    );
    return { items, totals };
  }, [rotinas, state, results, fatorVenda]);

  const buildPerformance = (complexidade: "Padrão" | "Complexo") => {
    const isComplex = complexidade === "Complexo";
    const items = rotinas
      .filter((r) => r.oferta === "Performance" && (r.complexidade ?? "Padrão") === complexidade)
      .filter((r) =>
        n3OptionalScenario
          ? r.grupo.toLowerCase().includes("microinform")
          : hasServiceDesk && !state.tierFieldOperation
            ? true
            : !r.grupo.toLowerCase().includes("microinform"),
      )
      .map((r) => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const cac = r.cac * mult;
        const fatorAuto = r.automacao
          ? Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100
          : 1;
        const horas = r.horasExecucao ?? 4;
        const horasMes = isComplex ? demanda * horas : 0;
        const custo = isComplex
          ? horasMes * state.valorHoraN3 * fatorAuto
          : demanda * custoPorChamadoMix * fatorAuto;
        const venda = toSell(custo);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, automacao: r.automacao, demanda, horas, horasMes, cac, custo, venda };
      })
      .filter((i) => i.demanda > 0)
      .sort((a, b) => b.venda - a.venda);
    const totals = items.reduce(
      (acc, i) => {
        acc.demanda += i.demanda;
        acc.horasMes += i.horasMes;
        acc.cac += i.cac;
        acc.custo += i.custo;
        acc.venda += i.venda;
        return acc;
      },
      { demanda: 0, horasMes: 0, cac: 0, custo: 0, venda: 0 },
    );
    return { items, totals, isComplex };
  };

  const rotinasPerfPadrao = useMemo(
    () => buildPerformance("Padrão"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rotinas, state, results, fatorVenda],
  );
  const rotinasPerfComplexo = useMemo(
    () => buildPerformance("Complexo"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rotinas, state, results, fatorVenda],
  );

  // Rotinas de Field Service (Microinformática) — agregam Operation + Performance
  // num único bloco exibido dentro da composição de Field Service.
  const rotinasField = useMemo(() => {
    // No cenário sem infra, microinformática já é listada como rotina de Operation/Performance.
    if (!state.tierFieldOperation || n3OptionalScenario) {
      return { items: [], totals: { demanda: 0, cac: 0, custo: 0, venda: 0 } };
    }
    const items = rotinas
      .filter((r) => r.grupo.toLowerCase().includes("microinform"))
      .filter((r) => (r.oferta === "Performance" ? state.tierPerformance : true))
      .map((r) => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const cac = r.cac * mult;
        const fatorAuto = r.automacao
          ? Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100
          : 1;
        const custo = demanda * custoPorChamadoMix * fatorAuto;
        const venda = toSell(custo);
        return {
          id: r.id,
          grupo: r.grupo,
          rotina: r.rotina,
          oferta: r.oferta,
          automacao: r.automacao,
          demanda,
          cac,
          custo,
          venda,
        };
      })
      .filter((i) => i.demanda > 0)
      .sort((a, b) => b.venda - a.venda);
    const totals = items.reduce(
      (acc, i) => {
        acc.demanda += i.demanda;
        acc.cac += i.cac;
        acc.custo += i.custo;
        acc.venda += i.venda;
        return acc;
      },
      { demanda: 0, cac: 0, custo: 0, venda: 0 },
    );
    return { items, totals };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotinas, state, results, fatorVenda]);

  const smMonitVenda = toSell(sm.custoMonitoramento);
  const smN1Venda = toSell(sm.custoN1Alocado);
  const smN3Venda = toSell(sm.custoN3);
  const smTotalVenda = toSell(sm.total);
  const operacaoCustoTotal = results.custoN1 + results.custoN2 + results.custoN3;
  const fs = results.fieldService;
  const fsVenda = fs.active ? toSell(fs.total) + rotinasField.totals.venda : 0;
  const smOperationVenda = state.tierOperation
    ? toSell(operacaoCustoTotal - (state.tierPerformance ? results.custoN3 : 0)) + rotinasOperation.totals.venda + fsVenda
    : 0;
  const smPerformanceVenda = state.tierPerformance
    ? toSell(results.custoN3) + rotinasPerfPadrao.totals.venda + rotinasPerfComplexo.totals.venda
    : 0;
  const totalSelecionado =
    (state.tierMonitor ? smTotalVenda : 0) + smOperationVenda + smPerformanceVenda;

  // Camada mais alta ativa = dominante visual nos quadros de composição
  const dominantTier =
    state.tierEnterprise ? "tierEnterprise"
    : state.tierPerformance ? "tierPerformance"
    : state.tierOperation ? "tierOperation"
    : state.tierMonitor ? "tierMonitor"
    : null;
  const dominantRing = (id: string) =>
    dominantTier === id ? "ring-2 ring-offset-2 ring-offset-background ring-current/40 shadow-lg" : "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Camadas de Oferta</CardTitle>
        <p className="text-xs text-muted-foreground">Selecione as camadas que comporão a precificação.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isSel = !!state[t.id];
            // Bloqueios de dependência:
            // - Smart Monitor é obrigatório quando Operation OU Performance estiver ativo
            // - Smart Operation é obrigatório quando Performance estiver ativo
            const locked =
              (t.id === "tierMonitor" && (state.tierOperation || state.tierPerformance)) ||
              (t.id === "tierOperation" && state.tierPerformance);
            return (
              <label
                key={t.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  t.available && !locked ? "cursor-pointer hover:bg-muted/40" : "opacity-70 cursor-not-allowed"
                } ${isSel ? (t.selectedClass ?? "border-primary bg-primary/5") : ""}`}
              >
                <Checkbox
                  checked={isSel}
                  disabled={!t.available || locked}
                  onCheckedChange={() => {
                    if (!t.available || locked) return;
                    const next = !isSel;
                    update(t.id, next as any);
                    // Smart Operation exige Smart Monitor ativo
                    if (t.id === "tierOperation" && next && !state.tierMonitor) {
                      update("tierMonitor", true as any);
                    }
                    // Ao desativar Smart Operation, desativa Field Service automaticamente
                    if (t.id === "tierOperation" && !next && state.tierFieldOperation) {
                      update("tierFieldOperation", false as any);
                    }
                    // Smart Performance exige Smart Monitor + Operation ativos
                    if (t.id === "tierPerformance" && next) {
                      if (!state.tierMonitor) update("tierMonitor", true as any);
                      if (!state.tierOperation) update("tierOperation", true as any);
                      // Faixa de horas N3 conforme limites de Performance
                      if ((state.horasN3Mensais || 0) < state.horasN3PerformanceMin) update("horasN3Mensais", state.horasN3PerformanceMin as any);
                      if ((state.horasN3Mensais || 0) > state.horasN3PerformanceMax) update("horasN3Mensais", state.horasN3PerformanceMax as any);
                    }
                    // Ao desativar Performance, devolver faixa Operation
                    if (t.id === "tierPerformance" && !next) {
                      if ((state.horasN3Mensais || 0) > state.horasN3OperationMax) update("horasN3Mensais", state.horasN3OperationMax as any);
                      if ((state.horasN3Mensais || 0) < state.horasN3OperationMin) update("horasN3Mensais", state.horasN3OperationMin as any);
                    }
                  }}
                  className="mt-0.5"
                />
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.desc}
                     {locked && t.id === "tierMonitor" && (state.tierPerformance ? "" : " · obrigatório com Smart Operation")}
                    {locked && t.id === "tierOperation" && " · obrigatório com Smart Performance"}
                  </p>
                </div>
                {t.alias && (() => {
                  const AliasIcon = t.aliasIcon;
                  return (
                    <div className={`ml-auto shrink-0 self-start inline-flex items-center gap-1 rounded-full px-2 py-0.5 shadow-sm ${isSel ? t.aliasClass : "bg-muted text-muted-foreground"}`}>
                      <AliasIcon className="h-3 w-3" strokeWidth={2.5} />
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]">{t.alias}</span>
                    </div>
                  );
                })()}
              </label>
            );
          })}
        </div>

        {state.tierMonitor && (
          <div className={`rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3 ${dominantRing("tierMonitor")}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
                Composição — Smart Monitor
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 text-white px-2 py-0.5 shadow-sm">
                  <Medal className="h-3 w-3" strokeWidth={2.5} />
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]">Bronze</span>
                </span>
              </p>
              <span className="text-[11px] text-muted-foreground">
                {formatNumber(sm.ativos)} ativos · {formatNumber(sm.chamadosAtivos, 1)} ch/mês
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">Monitoramento por ativo</span>
                <span className="font-semibold">{formatBRL(smMonitVenda)}</span>
              </div>
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">
                  {state.tierOperation
                    ? "Alocação N1 (incluída no Smart Operation)"
                    : `Alocação N1 (${state.percAlocacaoN1Monitor}%)`}
                </span>
                <span className="font-semibold">{formatBRL(smN1Venda)}</span>
              </div>
            </div>
            <div className={`rounded border px-2 py-1.5 space-y-1.5 ${state.tierOperation ? "opacity-50 bg-muted/30" : "bg-background"}`}>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">
                  Horas N3 opcional ({formatBRL(toSell(state.valorHoraN3))}/h)
                  {state.tierOperation && " · desabilitado com Smart Operation"}
                </Label>
                <span className="text-xs font-semibold">
                  {formatNumber(state.horasN3Monitor)}h · {formatBRL(smN3Venda)}
                </span>
              </div>
              <Slider
                value={[Math.min(40, Math.max(0, state.horasN3Monitor || 0))]}
                onValueChange={([v]) => update("horasN3Monitor", v)}
                min={0}
                max={40}
                step={1}
                disabled={state.tierOperation}
              />
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-xs font-semibold">Total Smart Monitor (venda)</span>
              <span className="text-sm font-bold text-primary">{formatBRL(smTotalVenda)}</span>
            </div>
          </div>
        )}

        {state.tierOperation && (
          <div className={`rounded-lg border border-slate-400 bg-slate-100/70 dark:bg-slate-800/40 dark:border-slate-600 p-4 space-y-3 ${dominantRing("tierOperation")}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
                Composição — Smart Operation
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-400 to-zinc-500 text-white px-2 py-0.5 shadow-sm">
                  <Award className="h-3 w-3" strokeWidth={2.5} />
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]">Silver</span>
                </span>
              </p>
              <span className="text-[11px] text-muted-foreground">
                Distribuição N1 {state.percN1}% · N2 {state.percN2}%
                {` · N3 ${state.percN3}%`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">N1</span>
                <span className="font-semibold">{formatBRL(toSell(results.custoN1))}</span>
              </div>
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">N2</span>
                <span className="font-semibold">{formatBRL(toSell(results.custoN2))}</span>
              </div>
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">
                  N3 ({formatNumber(state.horasN3Mensais)}h)
                </span>
                <span className="font-semibold">
                  {state.tierPerformance
                    ? <span className="text-[10px] text-muted-foreground">→ Performance</span>
                    : formatBRL(toSell(results.custoN3))}
                </span>
              </div>
            </div>
            {rotinasOperation.items.length > 0 && (
              <div className="rounded border bg-background p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold">Rotinas vinculadas (Operation)</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    custo/ch ponderado: {formatBRL(custoPorChamadoMix)}
                  </span>
                </div>
                <div className="max-h-56 overflow-auto rounded border">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1 font-medium">Rotina</th>
                        <th className="text-right px-2 py-1 font-medium w-16">Ch/mês</th>
                        <th className="text-right px-2 py-1 font-medium w-14">CAC</th>
                        <th className="text-right px-2 py-1 font-medium w-20">Custo</th>
                        <th className="text-right px-2 py-1 font-medium w-20">Venda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rotinasOperation.items.map((i) => (
                        <tr key={i.id} className="border-t">
                          <td className="px-2 py-1">
                            <span className="text-muted-foreground">{i.grupo} · </span>
                            {i.rotina}
                            {i.automacao && (
                              <span className="ml-1 text-[9px] text-primary">[auto]</span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">{i.demanda.toFixed(1)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{i.cac.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatBRL(i.custo)}</td>
                          <td className="px-2 py-1 text-right tabular-nums font-semibold">{formatBRL(i.venda)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted sticky bottom-0">
                      <tr>
                        <td className="px-2 py-1 font-semibold">Total</td>
                        <td className="px-2 py-1 text-right font-semibold tabular-nums">
                          {rotinasOperation.totals.demanda.toFixed(1)}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold tabular-nums">
                          {rotinasOperation.totals.cac.toFixed(2)}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold tabular-nums">
                          {formatBRL(rotinasOperation.totals.custo)}
                        </td>
                        <td className="px-2 py-1 text-right font-bold text-primary tabular-nums">
                          {formatBRL(rotinasOperation.totals.venda)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Venda calculada com custo médio por chamado ponderado pela escala de rotinas
                  (N1 {state.percRotinaN1}% · N2 {state.percRotinaN2}% · N3 {state.percRotinaN3}%) e divisor de markup/impostos.
                </p>
              </div>
            )}

            {n3OptionalScenario && (
              <label className="flex items-start gap-2 rounded border bg-background px-2 py-1.5 cursor-pointer">
                <Checkbox
                  checked={state.tierOperationN3}
                  onCheckedChange={() => update("tierOperationN3", !state.tierOperationN3 as any)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Incluir N3 (horas avulsas)</p>
                  <p className="text-[11px] text-muted-foreground">
                    Como não há infraestrutura no inventário, o N3 é opcional.
                  </p>
                </div>
              </label>
            )}

            {(!n3OptionalScenario || state.tierOperationN3) && !state.tierPerformance && (
            <div className="rounded border bg-background px-2 py-1.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">
                  Atendimento N3 ({formatBRL(toSell(state.valorHoraN3))}/h)
                </Label>
                <span className="text-xs font-semibold">{formatNumber(state.horasN3Mensais)}h/mês</span>
              </div>
              <Slider
                value={[Math.min(30, Math.max(10, state.horasN3Mensais || 10))]}
                onValueChange={([v]) => update("horasN3Mensais", v)}
                min={10}
                max={30}
                step={1}
              />
            </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <label className="flex items-start gap-2 rounded border bg-background px-2 py-1.5 cursor-pointer">
                <Checkbox
                  checked={state.tierFieldOperation}
                  onCheckedChange={() => update("tierFieldOperation", !state.tierFieldOperation as any)}
                  className="mt-0.5"
                />
                <MapPin className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Adicionar Field Service</p>
                  <p className="text-[11px] text-muted-foreground">
                    Atendimento presencial N1/N2/N3 — chamados de usuários passam pelo N1 convencional e são escalados para a equipe Field.
                  </p>
                </div>
              </label>
              {state.tierFieldOperation && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Composição — Field Service</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatNumber(fs.volumeUsuariosEscalado, 1)} ch/mês escalados
                    </span>
                  </div>
                  <>
                    <div className="flex items-center gap-2 rounded border bg-background px-2 py-1.5">
                        <Label className="text-[11px] text-muted-foreground">Limite de equipamentos (transbordo p/ remoto)</Label>
                        <Input
                          type="number"
                          value={state.fieldDirectEquipLimit}
                          onChange={(e) => update("fieldDirectEquipLimit", parseInt(e.target.value) || 0)}
                          className="h-7 text-sm w-24 ml-auto"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ["fieldDirectQtdN1", "Qtd N1F"],
                          ["fieldDirectQtdN2", "Qtd N2F"],
                          ["fieldDirectQtdN3", "Qtd N3F"],
                        ] as const).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-2 rounded border bg-background px-2 py-1.5">
                            <Label className="text-[11px] text-muted-foreground">{label}</Label>
                            <FractionInput
                              value={state[key] as number}
                              onChange={(v) => update(key, v)}
                              className="h-7 text-sm ml-auto"
                            />
                          </div>
                        ))}
                      </div>
                  </>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">
                        N1F ({state.fieldDirectQtdN1} prof.)
                      </span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN1F))}</span>
                    </div>
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">
                        N2F ({state.fieldDirectQtdN2} prof.)
                      </span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN2F))}</span>
                    </div>
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">
                        N3F ({state.fieldDirectQtdN3} prof.)
                      </span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN3F))}</span>
                    </div>
                  </div>
                  <div className="flex justify-between rounded border bg-background px-2 py-1.5 text-xs">
                    <span className="text-muted-foreground">
                      Triagem N1 ({state.percAlocacaoN1Monitor}% do custo/chamado)
                    </span>
                    <span className="font-semibold">{formatBRL(toSell(fs.custoTriagemN1))}</span>
                  </div>
                  {fs.overflowAtivo && (
                    <div className="rounded border border-orange-300 bg-orange-100/60 dark:bg-orange-900/30 px-2 py-1.5 space-y-1">
                      <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                        Transbordo remoto · {formatNumber(fs.volumeTransbordoN1Remoto, 1)} ch/mês excedem capacidade presencial
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between rounded border bg-background px-2 py-1">
                          <span className="text-muted-foreground">N1 remoto</span>
                          <span className="font-semibold">{formatBRL(toSell(fs.custoTransbordoN1Remoto))}</span>
                        </div>
                        <div className="flex justify-between rounded border bg-background px-2 py-1">
                          <span className="text-muted-foreground">
                            N2 Field ({formatNumber(fs.volumeTransbordoN2F, 1)} ch)
                          </span>
                          <span className="font-semibold">{formatBRL(toSell(fs.custoTransbordoN2F))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {rotinasField.items.length > 0 && (
                    <div className="rounded border bg-background p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ListChecks className="h-3.5 w-3.5 text-orange-600" />
                          <p className="text-xs font-semibold">Rotinas Field (Microinformática)</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          custo/ch ponderado: {formatBRL(custoPorChamadoMix)}
                        </span>
                      </div>
                      <div className="max-h-56 overflow-auto rounded border">
                        <table className="w-full text-[11px]">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1 font-medium">Rotina</th>
                              <th className="text-left px-2 py-1 font-medium w-20">Oferta</th>
                              <th className="text-right px-2 py-1 font-medium w-16">Ch/mês</th>
                              <th className="text-right px-2 py-1 font-medium w-20">Custo</th>
                              <th className="text-right px-2 py-1 font-medium w-20">Venda</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rotinasField.items.map((i) => (
                              <tr key={i.id} className="border-t">
                                <td className="px-2 py-1">
                                  {i.rotina}
                                  {i.automacao && (
                                    <span className="ml-1 text-[9px] text-primary">[auto]</span>
                                  )}
                                </td>
                                <td className="px-2 py-1 text-[10px] text-muted-foreground">{i.oferta}</td>
                                <td className="px-2 py-1 text-right tabular-nums">{i.demanda.toFixed(1)}</td>
                                <td className="px-2 py-1 text-right tabular-nums">{formatBRL(i.custo)}</td>
                                <td className="px-2 py-1 text-right tabular-nums font-semibold">{formatBRL(i.venda)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted sticky bottom-0">
                            <tr>
                              <td className="px-2 py-1 font-semibold" colSpan={2}>Total</td>
                              <td className="px-2 py-1 text-right font-semibold tabular-nums">
                                {rotinasField.totals.demanda.toFixed(1)}
                              </td>
                              <td className="px-2 py-1 text-right font-semibold tabular-nums">
                                {formatBRL(rotinasField.totals.custo)}
                              </td>
                              <td className="px-2 py-1 text-right font-bold text-primary tabular-nums">
                                {formatBRL(rotinasField.totals.venda)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-xs font-semibold">Total Field Service (venda)</span>
                    <span className="text-sm font-bold text-primary">{formatBRL(fsVenda)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-xs font-semibold">Total Smart Operation (venda)</span>
              <span className="text-sm font-bold text-primary">{formatBRL(smOperationVenda)}</span>
            </div>
          </div>
        )}

        {state.tierPerformance && (
          <div className={`rounded-lg border border-yellow-400 bg-yellow-50/70 dark:bg-yellow-950/30 dark:border-yellow-800 p-4 space-y-3 ${dominantRing("tierPerformance")}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
                Composição — Smart Performance
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-yellow-950 px-2 py-0.5 shadow-sm">
                  <Trophy className="h-3 w-3" strokeWidth={2.5} />
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]">Gold</span>
                </span>
              </p>
              <span className="text-[11px] text-muted-foreground">
                custo/ch ponderado: {formatBRL(custoPorChamadoMix)}
              </span>
            </div>

            <PerformanceBlock
              titulo="Rotinas Performance · Ambiente Padrão"
              vazio="Nenhuma rotina padrão com demanda ativa no inventário."
              data={rotinasPerfPadrao}
            />

            {algumComplexAtivo ? (
              <PerformanceBlock
                titulo="Rotinas Performance · Ambiente Complexo"
                vazio="Nenhuma rotina vinculada aos itens de complexidade ativos."
                data={rotinasPerfComplexo}
                hourRate={state.valorHoraN3}
                hourRateSell={toSell(state.valorHoraN3)}
              />
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Ative itens no painel de Complexidade para incluir rotinas de Ambiente Complexo.
              </p>
            )}

            {(!n3OptionalScenario || state.tierOperationN3) && (
            <div className="rounded border bg-background px-2 py-1.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">
                  Atendimento N3 ({formatBRL(toSell(state.valorHoraN3))}/h)
                </Label>
                <span className="text-xs font-semibold">
                  {formatNumber(state.horasN3Mensais)}h/mês · {formatBRL(toSell(results.custoN3))}
                </span>
              </div>
              <Slider
                value={[Math.min(40, Math.max(20, state.horasN3Mensais || 20))]}
                onValueChange={([v]) => update("horasN3Mensais", v)}
                min={20}
                max={40}
                step={1}
              />

              {/* Distribuição das horas N3 entre TAM / Owner / Livre */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-muted-foreground font-semibold">
                    Distribuição das horas N3
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Livre recalculado automaticamente</span>
                </div>
                <div className="space-y-3 rounded border bg-muted/20 p-2">
                  <div className="flex h-3 overflow-hidden rounded-full border bg-muted">
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${pctTam}%` }} />
                    <div className="bg-gradient-to-r from-sky-400 to-sky-500" style={{ width: `${pctOwner}%` }} />
                    <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${pctLivre}%` }} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">TAM</span>
                        <span className="tabular-nums text-muted-foreground">{pctTam}% · {formatNumber(horasTam)}h</span>
                      </div>
                      <Slider
                        value={[pctTam]}
                        onValueChange={([v]) => setPctTam(v)}
                        min={0}
                        max={100 - pctOwner}
                        step={1}
                        rangeClassName="bg-emerald-500"
                        thumbClassName="h-6 w-6 border-emerald-600 bg-background shadow-md cursor-grab active:cursor-grabbing"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-sky-700 dark:text-sky-300">Owner</span>
                        <span className="tabular-nums text-muted-foreground">{pctOwner}% · {formatNumber(horasOwner)}h</span>
                      </div>
                      <Slider
                        value={[pctOwner]}
                        onValueChange={([v]) => setPctOwner(v)}
                        min={0}
                        max={100 - pctTam}
                        step={1}
                        rangeClassName="bg-sky-500"
                        thumbClassName="h-6 w-6 border-sky-600 bg-background shadow-md cursor-grab active:cursor-grabbing"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px]">
                  <div className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-1">
                    <div className="text-muted-foreground">Chamados · {pctChamadosN3.toFixed(0)}%</div>
                    <div className="font-semibold">{formatNumber(horasChamadosN3, 1)}h</div>
                  </div>
                  <div className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-1">
                    <div className="text-muted-foreground">TAM · {pctTam}%</div>
                    <div className="font-semibold">{formatNumber(horasTam)}h</div>
                  </div>
                  <div className="rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-1">
                    <div className="text-muted-foreground">Owner · {pctOwner}%</div>
                    <div className="font-semibold">{formatNumber(horasOwner)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border ${livreEstourado ? "bg-destructive/10 border-destructive/40" : "bg-violet-500/10 border-violet-500/30"}`}>
                    <div className="text-muted-foreground">Livre · {pctLivreReal.toFixed(0)}%</div>
                    <div className={`font-semibold ${livreEstourado ? "text-destructive" : ""}`}>{formatNumber(horasLivre, 1)}h</div>
                  </div>
                </div>
              </div>
            </div>
            )}

            <div className="flex justify-between border-t pt-2">
              <span className="text-xs font-semibold">Total Smart Performance (venda)</span>
              <span className="text-sm font-bold text-primary">{formatBRL(smPerformanceVenda)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between border-t pt-3">
          <span className="text-sm font-semibold">Valor Total de Venda</span>
          <span className="text-base font-bold text-primary">{formatBRL(totalSelecionado)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceBlock({
  titulo,
  vazio,
  data,
  hourRate,
  hourRateSell,
}: {
  titulo: string;
  vazio: string;
  data: {
    items: { id: string; grupo: string; rotina: string; automacao: boolean; demanda: number; horas: number; horasMes: number; cac: number; custo: number; venda: number }[];
    totals: { demanda: number; horasMes: number; cac: number; custo: number; venda: number };
    isComplex: boolean;
  };
  hourRate?: number;
  hourRateSell?: number;
}) {
  const isComplex = data.isComplex;
  return (
    <div className="rounded border bg-background p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-violet-600" />
          <p className="text-xs font-semibold">{titulo}</p>
        </div>
        {isComplex && hourRateSell !== undefined && (
          <span className="text-[10px] text-muted-foreground">
            valor/hora N3: {formatBRL(hourRateSell)}
          </span>
        )}
      </div>
      {data.items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic px-1 py-2">{vazio}</p>
      ) : (
        <div className="max-h-56 overflow-auto rounded border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left px-2 py-1 font-medium">Rotina</th>
                <th className="text-right px-2 py-1 font-medium w-16">
                  {isComplex ? "Exec/mês" : "Ch/mês"}
                </th>
                {isComplex && <th className="text-right px-2 py-1 font-medium w-16">Horas/mês</th>}
                {!isComplex && <th className="text-right px-2 py-1 font-medium w-14">CAC</th>}
                <th className="text-right px-2 py-1 font-medium w-20">Custo</th>
                <th className="text-right px-2 py-1 font-medium w-20">Venda</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="px-2 py-1">
                    <span className="text-muted-foreground">{i.grupo} · </span>
                    {i.rotina}
                    {i.automacao && <span className="ml-1 text-[9px] text-primary">[auto]</span>}
                    {isComplex && (
                      <span className="ml-1 text-[9px] text-muted-foreground">({i.horas}h/exec)</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{i.demanda.toFixed(1)}</td>
                  {isComplex && (
                    <td className="px-2 py-1 text-right tabular-nums">{i.horasMes.toFixed(1)}</td>
                  )}
                  {!isComplex && (
                    <td className="px-2 py-1 text-right tabular-nums">{i.cac.toFixed(2)}</td>
                  )}
                  <td className="px-2 py-1 text-right tabular-nums">{formatBRL(i.custo)}</td>
                  <td className="px-2 py-1 text-right tabular-nums font-semibold">{formatBRL(i.venda)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted sticky bottom-0">
              <tr>
                <td className="px-2 py-1 font-semibold">Total</td>
                <td className="px-2 py-1 text-right font-semibold tabular-nums">{data.totals.demanda.toFixed(1)}</td>
                {isComplex && (
                  <td className="px-2 py-1 text-right font-semibold tabular-nums">{data.totals.horasMes.toFixed(1)}</td>
                )}
                {!isComplex && (
                  <td className="px-2 py-1 text-right font-semibold tabular-nums">{data.totals.cac.toFixed(2)}</td>
                )}
                <td className="px-2 py-1 text-right font-semibold tabular-nums">{formatBRL(data.totals.custo)}</td>
                <td className="px-2 py-1 text-right font-bold text-primary tabular-nums">{formatBRL(data.totals.venda)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}