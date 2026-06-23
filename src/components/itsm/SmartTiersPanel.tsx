import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Activity, Zap, Gauge, Building2, MapPin, ListChecks, Medal, Award, Trophy, Gem, Workflow } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import type { ITSMState } from "@/hooks/useITSMCalculator";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  ROTINAS_DEFAULT,
  rotinaMultiplicador,
  COMPLEX_FLAG_KEYS,
  normalizeLegacyRotina,
  type ComplexFlags,
  type Rotina,
} from "@/data/rotinas";
import {
  GMUDS_DEFAULT,
  bucketGmuds,
  computeGmud,
  type Gmud,
  type GmudComputed,
} from "@/data/gmuds";
import { GitBranch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sliders } from "lucide-react";
import { APPLIED_PROFILE_CHANGED_EVENT, getAppliedProfile, type AppliedProfileInfo } from "@/lib/appliedProfile";

function useAppliedProfileBadge(): AppliedProfileInfo | null {
  const [info, setInfo] = useState<AppliedProfileInfo | null>(() => getAppliedProfile("smart-ito"));
  useEffect(() => {
    const handler = () => setInfo(getAppliedProfile("smart-ito"));
    window.addEventListener(APPLIED_PROFILE_CHANGED_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(APPLIED_PROFILE_CHANGED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return info;
}

// Normaliza rotinas de Sistema Operacional (Linux/Windows) para tratá-las como
// unitárias por ambiente, independente da oferta (Operation/Performance) ou
// complexidade (Padrão/Complexo). Gateia pelo inventário de Servidores.
function normalizeOsRotina(r: Rotina): Rotina {
  const normalized = normalizeLegacyRotina(r);
  const grupo = normalized.grupo.toLowerCase();
  const isOs = grupo.includes("sistema operacional");
  if (!isOs) return normalized;
  return { ...normalized, ativo: "Servidor", unidade: "Servidor (Ambiente)", abrangencia: "Ambiente" };
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
  { id: "tierMonitor",     label: "Smart Monitor",     icon: Activity,   desc: "Monitoramento de ativos (Servidores, Rede, Firewall), direcionamento de chamados e atendimento N3 Opcional.",                   available: true,  alias: "Bronze",  aliasIcon: Medal,  aliasClass: "bg-gradient-to-r from-amber-600 to-orange-700 text-white",  selectedClass: "border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800" },
  { id: "tierFlow",        label: "Smart Flow",        icon: Workflow,   desc: "Monitoramento integrado ao ITSM, acesso ao atendente do cliente para operação técnica, horas de automação e N3 opcionais.", available: true, alias: "Steel",   aliasIcon: Workflow, aliasClass: "bg-gradient-to-r from-sky-600 to-cyan-700 text-white",       selectedClass: "border-sky-400 bg-sky-50/70 dark:bg-sky-950/30 dark:border-sky-800" },
    { id: "tierOperation",   label: "Smart Operation",   icon: Zap,        desc: "Gestão de TI com N1/N2 e N3 em horas - rotinas preventivas básicas. Aqui podemos aplicar field remoto ou presencial",             available: true,  alias: "Silver",  aliasIcon: Award,  aliasClass: "bg-gradient-to-r from-slate-400 to-zinc-500 text-white",     selectedClass: "border-slate-400 bg-slate-100/80 dark:bg-slate-800/40 dark:border-slate-600" },
   { id: "tierPerformance", label: "Smart Performance", icon: Gauge,      desc: "Rotinas preventivas e de complexidade · exige Smart Monitor + Operation", available: true, alias: "Gold",    aliasIcon: Trophy, aliasClass: "bg-gradient-to-r from-yellow-500 to-amber-600 text-yellow-950",  selectedClass: "border-yellow-400 bg-yellow-50/70 dark:bg-yellow-950/30 dark:border-yellow-800" },
  { id: "tierEnterprise",  label: "Smart Enterprise",  icon: Building2,  desc: "Em breve",                                                                available: false, alias: "Diamond", aliasIcon: Gem,    aliasClass: "bg-gradient-to-r from-cyan-400 to-sky-600 text-white" },
];

export default function SmartTiersPanel() {
  const { results, state, update } = useITSMContext();
  const sm = results.smartMonitor;
  const sfl = results.smartFlow;
  const totalEncargosPerc =
    (state.pisPerc || 0) + (state.cofinsPerc || 0) + (state.issPerc || 0) +
    (state.comissaoPerc || 0) + (state.irpjCsllPerc || 0) + (state.encFinancPerc || 0) +
    (state.lucroPerc || 0);
  const fatorVenda = totalEncargosPerc < 100 ? (100 - totalEncargosPerc) / 100 : 0;
  const toSell = (c: number) => (fatorVenda > 0 ? c / fatorVenda : 0);

  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const normalizedRotinas = useMemo(() => rotinas.map(normalizeLegacyRotina), [rotinas]);
  const [gmuds] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);
  // Distribuição percentual das horas N3 / Automação entre as 3 funções (TAM / Owner / Livre).
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

  // Horas de Melhoria (subdivide o resíduo "Horas Técnicas" sem alterar custos)
  const [horasMelhoriaOp, setHorasMelhoriaOp] = usePersistentState<number>(
    "gestao-ti:smartOp:horasMelhoria",
    0,
  );
  const [horasMelhoriaPerf, setHorasMelhoriaPerf] = usePersistentState<number>(
    "gestao-ti:smartPerf:horasMelhoria",
    0,
  );

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

  // Última camada ativa (ordem Monitor → Flow → Operation → Performance → Enterprise).
  // O quadro de "Rotinas Gerenciais Selbetti" (oferta "Todos") é exibido
  // apenas na camada dominante — mas seu custo é cobrado em separado e NÃO
  // consome as horas selecionadas pelos sliders.
  const dominantTierKey: "Monitor" | "Flow" | "Operation" | "Performance" | "Enterprise" | null =
    state.tierEnterprise ? "Enterprise"
    : state.tierPerformance ? "Performance"
    : state.tierOperation ? "Operation"
    : state.tierFlow ? "Flow"
    : state.tierMonitor ? "Monitor"
    : null;

  const rotinasOperation = useMemo(() => {
    const items = normalizedRotinas
      .filter((r) => r.oferta === "Operation" && !r.gerencial)
      // Sem infra (apenas service desk): apenas microinformática.
      // Com infra + service desk: todas as rotinas (incluindo microinformática).
      // Com infra sem service desk: exclui microinformática (vai para Field Service de Microinformática).
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
        const usaHoras = !!(r.horasExecucao && r.horasExecucao > 0);
        const horasMes = usaHoras ? demanda * (r.horasExecucao || 0) * fatorAuto : 0;
        const custo = usaHoras
          ? horasMes * state.valorHoraN3
          : demanda * custoPorChamadoMix * fatorAuto;
        const venda = toSell(custo);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, automacao: r.automacao, demanda, horasMes, cac, custo, venda };
      })
      .filter((i) => i.demanda > 0)
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.rotina.localeCompare(b.rotina, "pt-BR"));

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
    return { items, totals };
  }, [normalizedRotinas, state, results, fatorVenda]);

  const buildPerformance = (complexidade: "Padrão" | "Complexo") => {
    const isComplex = complexidade === "Complexo";
    const items = normalizedRotinas
      .filter((r) => r.oferta === "Performance" && !r.gerencial && (r.complexidade ?? "Padrão") === complexidade)
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
        const usaHoras = !!(r.horasExecucao && r.horasExecucao > 0);
        const horas = r.horasExecucao ?? 0;
        const horasMes = usaHoras ? demanda * horas : 0;
        const custo = usaHoras
          ? horasMes * state.valorHoraN3 * fatorAuto
          : demanda * custoPorChamadoMix * fatorAuto;
        const venda = toSell(custo);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, automacao: r.automacao, demanda, horas, horasMes, cac, custo, venda };
      })
      .filter((i) => i.demanda > 0)
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.rotina.localeCompare(b.rotina, "pt-BR"));
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
    [normalizedRotinas, state, results, fatorVenda],
  );
  const rotinasPerfComplexo = useMemo(
    () => buildPerformance("Complexo"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedRotinas, state, results, fatorVenda],
  );

  // Builder genérico para rotinas vinculadas a uma camada específica
  // (Monitor / Flow / Enterprise) — apenas rotinas técnicas preventivas.
  const buildLayerRotinas = (camada: "Monitor" | "Flow" | "Enterprise") => {
    const items = normalizedRotinas
      .filter((r) => r.oferta === camada && !r.gerencial)
      .map((r) => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const fatorAuto = r.automacao
          ? Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100
          : 1;
        const custo = r.horasExecucao && r.horasExecucao > 0
          ? demanda * r.horasExecucao * state.valorHoraN3 * fatorAuto
          : demanda * custoPorChamadoMix * fatorAuto;
        const venda = toSell(custo);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, automacao: r.automacao, demanda, custo, venda };
      })
      .filter((i) => i.demanda > 0)
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.rotina.localeCompare(b.rotina, "pt-BR"));
    const totals = items.reduce(
      (acc, i) => {
        acc.demanda += i.demanda;
        acc.custo += i.custo;
        acc.venda += i.venda;
        return acc;
      },
      { demanda: 0, custo: 0, venda: 0 },
    );
    return { items, totals };
  };
  const rotinasMonitor = useMemo(
    () => buildLayerRotinas("Monitor"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedRotinas, state, results, fatorVenda],
  );
  const rotinasFlow = useMemo(
    () => buildLayerRotinas("Flow"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedRotinas, state, results, fatorVenda],
  );

  // Rotinas Gerenciais Selbetti — precificadas em separado
  // e exibidas apenas na camada dominante. Não consomem as horas dos sliders.
  const rotinasGerenciais = useMemo(() => {
    const items = normalizedRotinas
      .filter((r) => r.gerencial)
      .map((r) => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const fatorAuto = r.automacao
          ? Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100
          : 1;
        const horas = r.horasExecucao ?? 1;
        const custo = demanda * horas * state.valorHoraN3 * fatorAuto;
        const venda = toSell(custo);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, oferta: r.oferta, automacao: r.automacao, demanda, custo, venda };
      })
      .filter((i) => i.demanda > 0)
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.rotina.localeCompare(b.rotina, "pt-BR"));
    const totals = items.reduce(
      (acc, i) => {
        acc.demanda += i.demanda;
        acc.custo += i.custo;
        acc.venda += i.venda;
        return acc;
      },
      { demanda: 0, custo: 0, venda: 0 },
    );
    return { items, totals };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedRotinas, state, results, fatorVenda]);
  // Gerenciais agora são atribuídas à oferta vinculada de cada rotina,
  // não mais somadas todas na camada dominante.
  const gerenciaisEmCamada = (camada: "Monitor" | "Flow" | "Operation" | "Performance" | "Enterprise") => {
    const items = rotinasGerenciais.items.filter((i) => i.oferta === camada);
    const totals = items.reduce(
      (acc, i) => {
        acc.demanda += i.demanda;
        acc.custo += i.custo;
        acc.venda += i.venda;
        return acc;
      },
      { demanda: 0, custo: 0, venda: 0 },
    );
    return { items, totals };
  };
  const gerenciaisVendaIn = (camada: "Monitor" | "Flow" | "Operation" | "Performance" | "Enterprise") =>
    gerenciaisEmCamada(camada).totals.venda;

  // Horas equivalentes consumidas pelas rotinas em cada camada
  const horasRotinasMonitor = state.valorHoraN3 > 0 ? rotinasMonitor.totals.custo / state.valorHoraN3 : 0;
  const horasRotinasFlow = state.valorHoraN3 > 0 ? rotinasFlow.totals.custo / state.valorHoraN3 : 0;

  // Rotinas Performance consomem horas do pool N3 contratado (slider).
  // Convertemos o custo em horas equivalentes e abatemos do "Horas Técnicas".
  // Inclui também as rotinas de Operation (mesmo princípio: absorvidas pelo pool N3).
  const horasRotinasOperationN3 = state.valorHoraN3 > 0
    ? rotinasOperation.totals.custo / state.valorHoraN3
    : 0;
  const horasRotinasPerformanceN3 = state.valorHoraN3 > 0
    ? (rotinasPerfPadrao.totals.custo + rotinasPerfComplexo.totals.custo) / state.valorHoraN3
    : 0;
  const horasRotinasN3 = horasRotinasOperationN3 + horasRotinasPerformanceN3;
  // Regra: as horas N3 contratadas são consumidas, na ordem:
  // 1) Chamados  2) TAM  3) Owner  4) Rotinas Técnicas (Operation + Performance)
  // O que sobrar fica em "Horas Técnicas" (livre).
  const pctRotinasN3 = horasTotaisN3 > 0 ? (horasRotinasN3 / horasTotaisN3) * 100 : 0;
  const horasLivre = Math.max(0, horasTotaisN3 - horasChamadosN3 - horasTam - horasOwner - horasRotinasN3);
  const pctLivreReal = horasTotaisN3 > 0 ? (horasLivre / horasTotaisN3) * 100 : 0;
  const livreEstourado = horasChamadosN3 + horasTam + horasOwner + horasRotinasN3 > horasTotaisN3;

  // Mesma distribuição, mas para o pool N3 do Smart Operation (quando Performance está desativado).
  const horasLivreOperation = Math.max(0, horasTotaisN3 - horasChamadosN3 - horasRotinasOperationN3);
  const pctChamadosN3Op = horasTotaisN3 > 0 ? (horasChamadosN3 / horasTotaisN3) * 100 : 0;
  const pctRotinasN3Op = horasTotaisN3 > 0 ? (horasRotinasOperationN3 / horasTotaisN3) * 100 : 0;
  const pctLivreOperation = horasTotaisN3 > 0 ? (horasLivreOperation / horasTotaisN3) * 100 : 0;
  const livreOperationEstourado = horasChamadosN3 + horasRotinasOperationN3 > horasTotaisN3;

  // Subdivisão do resíduo entre "Horas de Melhoria" (configurável) e "Horas Técnicas" (sobra final).
  // Operation: prioridade Chamados → Rotinas → Melhoria → Técnicas
  const melhoriaOpHardMax = Math.max(0, Math.min(horasLivreOperation, state.horasMelhoriaOpMax ?? horasLivreOperation));
  const melhoriaOpHardMin = Math.max(0, Math.min(melhoriaOpHardMax, state.horasMelhoriaOpMin ?? 0));
  const horasMelhoriaOpClamped = Math.max(melhoriaOpHardMin, Math.min(melhoriaOpHardMax, Math.round(horasMelhoriaOp || 0)));
  const horasTecnicasOperation = Math.max(0, horasLivreOperation - horasMelhoriaOpClamped);
  const pctMelhoriaOp = horasTotaisN3 > 0 ? (horasMelhoriaOpClamped / horasTotaisN3) * 100 : 0;
  const pctTecnicasOp = horasTotaisN3 > 0 ? (horasTecnicasOperation / horasTotaisN3) * 100 : 0;

  // Performance: prioridade Chamados → Rotinas → TAM → Owner → Melhoria → Técnicas
  const melhoriaPerfHardMax = Math.max(0, Math.min(horasLivre, state.horasMelhoriaPerfMax ?? horasLivre));
  const melhoriaPerfHardMin = Math.max(0, Math.min(melhoriaPerfHardMax, state.horasMelhoriaPerfMin ?? 0));
  const horasMelhoriaPerfClamped = Math.max(melhoriaPerfHardMin, Math.min(melhoriaPerfHardMax, Math.round(horasMelhoriaPerf || 0)));
  const horasTecnicasPerf = Math.max(0, horasLivre - horasMelhoriaPerfClamped);
  const pctMelhoriaPerf = horasTotaisN3 > 0 ? (horasMelhoriaPerfClamped / horasTotaisN3) * 100 : 0;
  const pctTecnicasPerf = horasTotaisN3 > 0 ? (horasTecnicasPerf / horasTotaisN3) * 100 : 0;

  // Re-clampa horas de Melhoria quando a sobra muda (evita slider em valor inválido).
  useEffect(() => {
    if ((horasMelhoriaOp || 0) > melhoriaOpHardMax) {
      setHorasMelhoriaOp(melhoriaOpHardMax);
    } else if ((horasMelhoriaOp || 0) < melhoriaOpHardMin) {
      setHorasMelhoriaOp(melhoriaOpHardMin);
    }
  }, [melhoriaOpHardMin, melhoriaOpHardMax]);
  useEffect(() => {
    if ((horasMelhoriaPerf || 0) > melhoriaPerfHardMax) {
      setHorasMelhoriaPerf(melhoriaPerfHardMax);
    } else if ((horasMelhoriaPerf || 0) < melhoriaPerfHardMin) {
      setHorasMelhoriaPerf(melhoriaPerfHardMin);
    }
  }, [melhoriaPerfHardMin, melhoriaPerfHardMax]);

  // Rotinas de Field Service de Microinformática (Microinformática) — agregam Operation + Performance
  // num único bloco exibido dentro da composição de Field Service de Microinformática.
  const rotinasField = useMemo(() => {
    // No cenário sem infra, microinformática já é listada como rotina de Operation/Performance.
    if (!state.tierFieldOperation || n3OptionalScenario) {
      return { items: [], totals: { demanda: 0, cac: 0, custo: 0, venda: 0 } };
    }
    const items = normalizedRotinas
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
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.rotina.localeCompare(b.rotina, "pt-BR"));
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
  }, [normalizedRotinas, state, results, fatorVenda]);

  const smMonitVenda = toSell(sm.custoMonitoramento);
  const smN1Venda = toSell(sm.custoN1Alocado);
  const smN3Venda = toSell(sm.custoN3);
  const smN3ManutVenda = toSell(sm.custoN3Manut);
  const smAtendentesVenda = toSell(sm.custoAtendentes);
  const smProxysVenda = toSell(sm.custoProxys);
  const smTotalVenda = toSell(sm.total) + gerenciaisVendaIn("Monitor");
  // Smart Flow — venda
  const sflMonitVenda = toSell(sfl.custoMonitoramento);
  const sflN1Venda = toSell(sfl.custoN1Alocado);
  const sflN3Venda = toSell(sfl.custoN3);
  const sflN3ManutVenda = toSell(sfl.custoN3Manut);
  const sflAtendentesVenda = toSell(sfl.custoAtendentes);
  const sflProxysVenda = toSell(sfl.custoProxys);
  const sflTotalVenda = toSell(sfl.total) + gerenciaisVendaIn("Flow");
  const operacaoCustoTotal = results.custoN1 + results.custoN2 + results.custoN3;
  const fs = results.fieldService;
  const fsVenda = fs.active ? toSell(fs.total) + rotinasField.totals.venda : 0;

  // === GMUDs por camada ===
  const gmudInput = {
    custoPorChamadoN2: results.custoPorChamadoN2,
    tempoMedioChamadoN3: state.tempoMedioChamadoN3,
    valorHoraN3: state.valorHoraN3,
    percN2: state.percGmudN2 ?? 70,
    percN3: state.percGmudN3 ?? 30,
  };
  const gmudBuckets = useMemo(() => bucketGmuds(gmuds), [gmuds]);
  const gmudOperation = useMemo(() => {
    const items = gmudBuckets.operation.map((g) => computeGmud(g, gmudInput));
    const totals = items.reduce(
      (acc, i) => {
        acc.chamados += i.chamadosMes;
        acc.horasN3 += i.horasN3;
        acc.custo += i.custo;
        return acc;
      },
      { chamados: 0, horasN3: 0, custo: 0 },
    );
    return { items, totals, venda: toSell(totals.custo) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmudBuckets, results.custoPorChamadoN2, state.tempoMedioChamadoN3, state.valorHoraN3, state.percGmudN2, state.percGmudN3, fatorVenda]);
  const gmudPerformance = useMemo(() => {
    const items = gmudBuckets.performance.map((g) => computeGmud(g, gmudInput));
    const totals = items.reduce(
      (acc, i) => {
        acc.chamados += i.chamadosMes;
        acc.horasN3 += i.horasN3;
        acc.custo += i.custo;
        return acc;
      },
      { chamados: 0, horasN3: 0, custo: 0 },
    );
    return { items, totals, venda: toSell(totals.custo) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmudBuckets, results.custoPorChamadoN2, state.tempoMedioChamadoN3, state.valorHoraN3, state.percGmudN2, state.percGmudN3, fatorVenda]);

  // Custo de ferramenta de endpoint (entra em custoTotalOperacao do calculador
  // quando Smart Operation está ativo). Precisa ser refletido aqui para que o
  // "Valor Total de Venda" das Camadas bata exatamente com o preço de venda
  // calculado no Resumo de Cotação e na Listagem de Precificações.
  const custoEndpointTooling =
    (state.custoFerramentaEndpoint || 0) * (state.qtdEquipamentos || 0);
  const smOperationVenda = state.tierOperation
    ? toSell(operacaoCustoTotal - (state.tierPerformance ? results.custoN3 : 0))
      + toSell(custoEndpointTooling)
      + fsVenda + gmudOperation.venda + gerenciaisVendaIn("Operation")
    : 0;
  const smPerformanceVenda = state.tierPerformance
    ? toSell(results.custoN3) + gmudPerformance.venda + gerenciaisVendaIn("Performance")
    : 0;
  const totalSelecionado =
    (state.tierMonitor ? smTotalVenda : 0) + (state.tierFlow ? sflTotalVenda : 0) + smOperationVenda + smPerformanceVenda;

  // Camada mais alta ativa = dominante visual nos quadros de composição
  const dominantTier =
    state.tierEnterprise ? "tierEnterprise"
    : state.tierPerformance ? "tierPerformance"
    : state.tierOperation ? "tierOperation"
    : state.tierFlow ? "tierFlow"
    : state.tierMonitor ? "tierMonitor"
    : null;
  const dominantRing = (id: string) =>
    dominantTier === id ? "ring-2 ring-offset-2 ring-offset-background ring-current/40 shadow-lg" : "";

  // Em camadas superiores (Operation/Performance/Enterprise), os recursos
  // avulsos do Smart Monitor (horas N3 / Automação e atendentes no ITSM) são absorvidos
  // pela camada superior — desabilitamos os sliders e zeramos os valores.
  const monitorAdvanced = state.tierFlow || state.tierOperation || state.tierPerformance || state.tierEnterprise;
  const flowAdvanced = state.tierOperation || state.tierPerformance || state.tierEnterprise;
  useEffect(() => {
    if (!monitorAdvanced) return;
    if ((state.horasN3MonitorManut || 0) !== 0) update("horasN3MonitorManut", 0);
    if ((state.horasN3Monitor || 0) !== 0) update("horasN3Monitor", 0);
  }, [monitorAdvanced, state.horasN3MonitorManut, state.horasN3Monitor]);
  useEffect(() => {
    if (!flowAdvanced) return;
    if ((state.horasN3FlowManut || 0) !== 0) update("horasN3FlowManut", 0);
    if ((state.horasN3Flow || 0) !== 0) update("horasN3Flow", 0);
    if ((state.qtdAtendentesFlow || 0) !== 0) update("qtdAtendentesFlow", 0);
  }, [flowAdvanced, state.horasN3FlowManut, state.horasN3Flow, state.qtdAtendentesFlow]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">Camadas de Oferta</CardTitle>
            <p className="text-xs text-muted-foreground">Selecione as camadas que comporão a precificação.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <AppliedProfilePill />
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5">
            <Label htmlFor="tiers-rent" className="text-xs font-semibold text-foreground whitespace-nowrap">
              Rentabilidade
            </Label>
            <Input
              id="tiers-rent"
              type="number"
              step={0.01}
              min={0}
              max={100}
              value={state.lucroPerc ?? 0}
              onChange={(e) => update("lucroPerc", parseFloat(e.target.value) || 0)}
              className="h-7 w-20 text-right tabular-nums"
            />
            <span className="text-xs font-semibold text-foreground">%</span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap pl-2 border-l border-border/60">
              Comissão: <span className="font-semibold text-primary tabular-nums">{(state.comissaoPerc ?? 0).toFixed(2)}%</span>
            </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isSel = !!state[t.id];
            // Bloqueios de dependência:
            // Cadeia de dependência: Monitor ← Flow ← Operation ← Performance
            // Uma camada fica bloqueada quando qualquer camada superior estiver ativa.
            const locked =
              (t.id === "tierMonitor" && (state.tierFlow || state.tierOperation || state.tierPerformance)) ||
              (t.id === "tierFlow" && (state.tierOperation || state.tierPerformance)) ||
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
                    // Smart Flow exige Smart Monitor ativo
                    if (t.id === "tierFlow" && next && !state.tierMonitor) {
                      update("tierMonitor", true as any);
                    }
                    // Smart Operation exige Smart Monitor + Smart Flow ativos
                    if (t.id === "tierOperation" && next) {
                      if (!state.tierMonitor) update("tierMonitor", true as any);
                      if (!state.tierFlow) update("tierFlow", true as any);
                    }
                    // Ao desativar Smart Operation, desativa Field Service de Microinformática automaticamente
                    if (t.id === "tierOperation" && !next && state.tierFieldOperation) {
                      update("tierFieldOperation", false as any);
                    }
                    // Smart Performance exige Smart Monitor + Flow + Operation ativos
                    if (t.id === "tierPerformance" && next) {
                      if (!state.tierMonitor) update("tierMonitor", true as any);
                      if (!state.tierFlow) update("tierFlow", true as any);
                      if (!state.tierOperation) update("tierOperation", true as any);
                      // Faixa de horas N3 / Automação conforme limites de Performance
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
                    {locked && t.id === "tierMonitor" && " · obrigatório com Smart Flow"}
                    {locked && t.id === "tierFlow" && " · obrigatório com Smart Operation"}
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
              <div className={`flex justify-between rounded border px-2 py-1.5 ${monitorAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                <span className="text-muted-foreground">Monitoramento por ativo</span>
                <span className="font-semibold">{formatBRL(smMonitVenda)}</span>
              </div>
              <div className={`flex justify-between rounded border px-2 py-1.5 ${monitorAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                <span className="text-muted-foreground">
                  {monitorAdvanced
                    ? "Alocação N1 (absorvida pela camada superior)"
                    : `Alocação N1 (${state.percAlocacaoN1Monitor}%)`}
                </span>
                <span className="font-semibold">{formatBRL(smN1Venda)}</span>
              </div>
            </div>
            {!monitorAdvanced && (
              <div className="rounded border bg-background px-2 py-1.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                    ITSM a ser integrado
                  </Label>
                  <Select
                    value={state.itsmFlowSelected || ""}
                    onValueChange={(v) => update("itsmFlowSelected", v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-[220px]">
                      <SelectValue placeholder="Selecione um ITSM" />
                    </SelectTrigger>
                    <SelectContent>
                      {(state.itsmFlowList ?? [])
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)
                        .map((itsm) => (
                        <SelectItem key={itsm} value={itsm} className="text-xs">
                          {itsm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Lista configurada em Métricas e Parâmetros → Smart Monitor.
                </p>
              </div>
            )}
            {!monitorAdvanced && (
              <div className="rounded border bg-background px-2 py-2 space-y-1.5">
                <Label className="text-[11px] text-muted-foreground font-semibold">
                  Fonte da demanda de chamados
                </Label>
                <RadioGroup
                  value={state.demandSource ?? "inventario"}
                  onValueChange={(v) => update("demandSource", v as ITSMState["demandSource"])}
                  className="gap-1.5"
                >
                  <label className="flex items-start gap-2 cursor-pointer">
                    <RadioGroupItem value="inventario" id="ds-monitor-inv" className="mt-0.5" />
                    <span className="text-[11px] leading-tight">
                      <span className="font-semibold">Calculada pelo inventário</span>
                      <span className="text-muted-foreground"> — usa taxas × quantidades cadastradas.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <RadioGroupItem value="manual" id="ds-monitor-manual" className="mt-0.5" />
                    <span className="text-[11px] leading-tight">
                      <span className="font-semibold">Volume informado</span>
                      <span className="text-muted-foreground">
                        {" "}— soma dos chamados atuais (ativos + usuários) informados no inventário, multiplicada pelo custo unitário.
                      </span>
                    </span>
                  </label>
                </RadioGroup>
                {(state.demandSource === "manual") && (
                  <p className="text-[10px] text-muted-foreground">
                    Atual: {formatNumber((state.volumeChamadosAtivosManual || 0) + (state.volumeChamadosUsuariosManual || 0))} ch/mês.
                  </p>
                )}
              </div>
            )}
            {/* Grupo: Horas N3 / Automação */}
            <div className="rounded-lg border border-amber-200/70 dark:border-amber-900/50 bg-amber-100/30 dark:bg-amber-950/10 p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Horas N3 / Automação
                </p>
                {monitorAdvanced && (
                  <span className="text-[10px] text-muted-foreground italic">
                    desativado pela camada superior
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className={`rounded border px-2 py-1.5 space-y-1.5 ${monitorAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Automação / Manutenção ({formatBRL(toSell(state.valorHoraN3))}/h)
                    </Label>
                    <span className="text-xs font-semibold">
                      {formatNumber(state.horasN3MonitorManut)}h · {formatBRL(smN3ManutVenda)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(state.horasN3MonitorManutMax, Math.max(state.horasN3MonitorManutMin, state.horasN3MonitorManut || 0))]}
                    onValueChange={([v]) => update("horasN3MonitorManut", v)}
                    min={state.horasN3MonitorManutMin}
                    max={state.horasN3MonitorManutMax}
                    step={1}
                    disabled={monitorAdvanced}
                  />
                  {!monitorAdvanced && rotinasMonitor.items.length > 0 && (() => {
                    const purchased = state.horasN3MonitorManut || 0;
                    const used = horasRotinasMonitor;
                    const overflow = used > purchased;
                    const pct = purchased > 0 ? Math.min(100, (used / purchased) * 100) : 0;
                    return (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">
                            Consumido por Rotinas Técnicas Preventivas — Smart Monitor ({rotinasMonitor.items.length})
                          </span>
                          <span className={overflow ? "font-semibold text-destructive" : "font-semibold"}>
                            {formatNumber(used, 1)}h / {formatNumber(purchased)}h
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full border bg-muted overflow-hidden">
                          <div
                            className={overflow ? "bg-destructive h-full" : "bg-sky-500 h-full"}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {overflow && (
                          <p className="text-[10px] text-destructive">Horas insuficientes — aumente o slider.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className={`rounded border px-2 py-1.5 space-y-1.5 ${monitorAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Acionamento N3 ({formatBRL(toSell(state.valorHoraN3))}/h)
                    </Label>
                    <span className="text-xs font-semibold">
                      {formatNumber(state.horasN3Monitor)}h · {formatBRL(smN3Venda)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(state.horasN3MonitorMax, Math.max(state.horasN3MonitorMin, state.horasN3Monitor || 0))]}
                    onValueChange={([v]) => update("horasN3Monitor", v)}
                    min={state.horasN3MonitorMin}
                    max={state.horasN3MonitorMax}
                    step={1}
                    disabled={monitorAdvanced}
                  />
                </div>
              </div>
            </div>

            {/* Grupo: Recursos */}
            <div className="rounded-lg border border-amber-200/70 dark:border-amber-900/50 bg-amber-100/30 dark:bg-amber-950/10 p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Recursos
                </p>
                {monitorAdvanced && (
                  <span className="text-[10px] text-muted-foreground italic">
                    desativado pela camada superior
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className={`rounded border px-2 py-1.5 space-y-1.5 ${monitorAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Proxys ({formatBRL(toSell(state.valorProxyInicial))} inicial · {formatBRL(toSell(state.valorProxyAdicional))} adic.)
                    </Label>
                    <span className="text-xs font-semibold">
                      {sm.qtdProxys} · {formatBRL(smProxysVenda)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(state.qtdProxysMonitorMax, Math.max(1, state.qtdProxysMonitor || 1))]}
                    onValueChange={([v]) => update("qtdProxysMonitor", v)}
                    min={1}
                    max={Math.max(1, state.qtdProxysMonitorMax)}
                    step={1}
                    disabled={monitorAdvanced}
                  />
                </div>
              </div>
            </div>
            {rotinasMonitor.items.length > 0 && (
              <LayerRoutineTable
                titulo="Rotinas Técnicas Preventivas — Smart Monitor"
                items={rotinasMonitor.items}
                totals={rotinasMonitor.totals}
              />
            )}
            {!state.tierOperation && (state.horasN3MonitorManut + state.horasN3Monitor > 0) && (() => {
              const hManut = Math.max(0, state.horasN3MonitorManut || 0);
              const hAcion = Math.max(0, state.horasN3Monitor || 0);
              const hTotal = hManut + hAcion;
              const pctManut = hTotal > 0 ? (hManut / hTotal) * 100 : 0;
              const pctAcion = hTotal > 0 ? (hAcion / hTotal) * 100 : 0;
              return (
                <div className="rounded border bg-background px-2 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-[11px] text-muted-foreground font-semibold">
                      Consumo das horas N3 / Automação — Smart Monitor
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Total: {formatNumber(hTotal)}h · {formatBRL(toSell(hTotal * state.valorHoraN3))}
                    </span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full border bg-muted">
                    {pctManut > 0 && (
                      <div className="bg-gradient-to-r from-sky-400 to-sky-500" style={{ width: `${pctManut}%` }} />
                    )}
                    {pctAcion > 0 && (
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pctAcion}%` }} />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div className="rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-1">
                      <div className="text-muted-foreground">Automação / Manutenção · {pctManut.toFixed(0)}%</div>
                      <div className="font-semibold">{formatNumber(hManut)}h · {formatBRL(smN3ManutVenda)}</div>
                    </div>
                    <div className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-1">
                      <div className="text-muted-foreground">Acionamento N3 · {pctAcion.toFixed(0)}%</div>
                      <div className="font-semibold">{formatNumber(hAcion)}h · {formatBRL(smN3Venda)}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Manut. = ajustes/tunings do monitoramento · Acionamento N3 = horas para tratar incidentes detectados.
                  </p>
                </div>
              );
            })()}
            {(() => {
              const g = gerenciaisEmCamada("Monitor");
              return g.items.length > 0 ? (
                <LayerRoutineTable
                  titulo="Rotinas Gerenciais Selbetti"
                  items={g.items}
                  totals={g.totals}
                  descricao="Precificadas em separado — não consomem as horas contratadas para atuação técnica."
                />
              ) : null;
            })()}
            <div className="flex justify-between border-t pt-2">
              <span className="text-xs font-semibold">Total Smart Monitor (venda)</span>
              <span className="text-sm font-bold text-primary">{formatBRL(smTotalVenda)}</span>
            </div>
          </div>
        )}

        {state.tierFlow && (
          <div className={`rounded-lg border border-sky-400 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-800 p-4 space-y-3 ${dominantRing("tierFlow")}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
                Composição — Smart Flow
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-600 to-cyan-700 text-white px-2 py-0.5 shadow-sm">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]">Steel</span>
                </span>
              </p>
              <span className="text-[11px] text-muted-foreground">
                {formatNumber(sfl.ativos)} ativos · {formatNumber(sfl.chamadosAtivos, 1)} ch/mês
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">
                  Monitoramento integrado ao ITSM
                  {state.tierOperation && (
                    <span className="ml-1 italic text-[10px]">
                      (custo/ativo do Smart Operation)
                    </span>
                  )}
                </span>
                <span className="font-semibold">{formatBRL(sflMonitVenda)}</span>
              </div>
              <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                <span className="text-muted-foreground">
                  {state.tierOperation
                    ? "Alocação N1 (incluída no Smart Operation)"
                    : `Alocação N1 (${state.percAlocacaoN1Flow}%)`}
                </span>
                <span className="font-semibold">{formatBRL(sflN1Venda)}</span>
              </div>
            </div>
            {!flowAdvanced && (
              <div className="rounded border bg-background px-2 py-2 space-y-1.5">
                <Label className="text-[11px] text-muted-foreground font-semibold">
                  Fonte da demanda de chamados
                </Label>
                <RadioGroup
                  value={state.demandSource ?? "inventario"}
                  onValueChange={(v) => update("demandSource", v as ITSMState["demandSource"])}
                  className="gap-1.5"
                >
                  <label className="flex items-start gap-2 cursor-pointer">
                    <RadioGroupItem value="inventario" id="ds-flow-inv" className="mt-0.5" />
                    <span className="text-[11px] leading-tight">
                      <span className="font-semibold">Calculada pelo inventário</span>
                      <span className="text-muted-foreground"> — usa taxas × quantidades cadastradas.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <RadioGroupItem value="manual" id="ds-flow-manual" className="mt-0.5" />
                    <span className="text-[11px] leading-tight">
                      <span className="font-semibold">Volume informado</span>
                      <span className="text-muted-foreground">
                        {" "}— soma dos chamados atuais (ativos + usuários) informados, multiplicada pelo custo unitário.
                      </span>
                    </span>
                  </label>
                </RadioGroup>
                {(state.demandSource === "manual") && (
                  <p className="text-[10px] text-muted-foreground">
                    Atual: {formatNumber((state.volumeChamadosAtivosManual || 0) + (state.volumeChamadosUsuariosManual || 0))} ch/mês.
                  </p>
                )}
              </div>
            )}
            {/* Grupo: Horas N3 / Automação do Flow (automação + N3 opcional) */}
            <div className="rounded-lg border border-sky-200/70 dark:border-sky-900/50 bg-sky-100/30 dark:bg-sky-950/10 p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                  Horas N3 / Automação
                </p>
                {flowAdvanced && (
                  <span className="text-[10px] text-muted-foreground italic">
                    desativado pela oferta Operation
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className={`rounded border px-2 py-1.5 space-y-1.5 ${flowAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Automação / Manutenção ({formatBRL(toSell(state.valorHoraN3))}/h)
                    </Label>
                    <span className="text-xs font-semibold">
                      {formatNumber(state.horasN3FlowManut)}h · {formatBRL(sflN3ManutVenda)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(state.horasN3FlowManutMax, Math.max(state.horasN3FlowManutMin, state.horasN3FlowManut || 0))]}
                    onValueChange={([v]) => update("horasN3FlowManut", v)}
                    min={state.horasN3FlowManutMin}
                    max={state.horasN3FlowManutMax}
                    step={1}
                    disabled={flowAdvanced}
                  />
                  {!flowAdvanced && rotinasFlow.items.length > 0 && (() => {
                    const purchased = state.horasN3FlowManut || 0;
                    const used = horasRotinasFlow;
                    const overflow = used > purchased;
                    const pct = purchased > 0 ? Math.min(100, (used / purchased) * 100) : 0;
                    return (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">
                            Consumido por Rotinas Técnicas Preventivas — Smart Flow ({rotinasFlow.items.length})
                          </span>
                          <span className={overflow ? "font-semibold text-destructive" : "font-semibold"}>
                            {formatNumber(used, 1)}h / {formatNumber(purchased)}h
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full border bg-muted overflow-hidden">
                          <div
                            className={overflow ? "bg-destructive h-full" : "bg-cyan-500 h-full"}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {overflow && (
                          <p className="text-[10px] text-destructive">Horas insuficientes — aumente o slider.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className={`rounded border px-2 py-1.5 space-y-1.5 ${flowAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Acionamento N3 ({formatBRL(toSell(state.valorHoraN3))}/h)
                    </Label>
                    <span className="text-xs font-semibold">
                      {formatNumber(state.horasN3Flow)}h · {formatBRL(sflN3Venda)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(state.horasN3FlowMax, Math.max(state.horasN3FlowMin, state.horasN3Flow || 0))]}
                    onValueChange={([v]) => update("horasN3Flow", v)}
                    min={state.horasN3FlowMin}
                    max={state.horasN3FlowMax}
                    step={1}
                    disabled={flowAdvanced}
                  />
                </div>
              </div>
            </div>
            {/* Grupo: Recursos do Flow (Atendentes ITSM + Proxys) */}
            <div className="rounded-lg border border-sky-200/70 dark:border-sky-900/50 bg-sky-100/30 dark:bg-sky-950/10 p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                  Recursos
                </p>
                {flowAdvanced && (
                  <span className="text-[10px] text-muted-foreground italic">
                    atendentes desativados pela oferta Operation
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className={`rounded border px-2 py-1.5 space-y-1.5 ${flowAdvanced ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Atendentes no ITSM ({formatBRL(toSell(state.custoAtendenteFlow))}/acesso)
                    </Label>
                    <span className="text-xs font-semibold">
                      {state.qtdAtendentesFlow} · {formatBRL(sflAtendentesVenda)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(state.qtdAtendentesFlowMax, Math.max(state.qtdAtendentesFlowMin, state.qtdAtendentesFlow || 0))]}
                    onValueChange={([v]) => update("qtdAtendentesFlow", v)}
                    min={state.qtdAtendentesFlowMin}
                    max={state.qtdAtendentesFlowMax}
                    step={1}
                    disabled={flowAdvanced}
                  />
                </div>
                <div className="rounded border bg-background px-2 py-1.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Proxys ({formatBRL(toSell(state.valorProxyInicial))} inicial · {formatBRL(toSell(state.valorProxyAdicional))} adic. · valores do Smart Monitor)
                    </Label>
                    <span className="text-xs font-semibold">
                      {sfl.qtdProxys} · {formatBRL(sflProxysVenda)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(state.qtdProxysFlowMax, Math.max(1, state.qtdProxysFlow || 1))]}
                    onValueChange={([v]) => update("qtdProxysFlow", v)}
                    min={1}
                    max={Math.max(1, state.qtdProxysFlowMax)}
                    step={1}
                  />
                </div>
              </div>
            </div>
            {rotinasFlow.items.length > 0 && (
              <LayerRoutineTable
                titulo="Rotinas Técnicas Preventivas — Smart Flow"
                items={rotinasFlow.items}
                totals={rotinasFlow.totals}
              />
            )}
            {(() => {
              const g = gerenciaisEmCamada("Flow");
              return g.items.length > 0 ? (
                <LayerRoutineTable
                  titulo="Rotinas Gerenciais Selbetti"
                  items={g.items}
                  totals={g.totals}
                  descricao="Precificadas em separado — não consomem as horas contratadas para atuação técnica."
                />
              ) : null;
            })()}
            <div className="flex justify-between border-t pt-2">
              <span className="text-xs font-semibold">Total Smart Flow (venda)</span>
              <span className="text-sm font-bold text-primary">{formatBRL(sflTotalVenda)}</span>
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
                    <p className="text-xs font-semibold">Rotinas Técnicas Preventivas — Smart Operation</p>
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
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
                  ⓘ Este valor é informativo — as rotinas consomem horas do pool N3 contratado (slider abaixo) e <strong>já estão inclusas</strong> no Total Smart Operation. Não soma de novo.
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
                value={[Math.min(state.horasN3OperationMax, Math.max(state.horasN3OperationMin, state.horasN3Mensais || state.horasN3OperationMin))]}
                onValueChange={([v]) => update("horasN3Mensais", v)}
                min={state.horasN3OperationMin}
                max={state.horasN3OperationMax}
                step={1}
              />

              {/* Distribuição do pool N3 contratado no Operation */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-muted-foreground font-semibold">
                    Distribuição das horas N3 / Automação contratadas
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Horas Técnicas recalculadas automaticamente</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full border bg-muted">
                  {pctChamadosN3Op > 0 && (
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, pctChamadosN3Op)}%` }} />
                  )}
                  {pctRotinasN3Op > 0 && (
                    <div className="bg-gradient-to-r from-rose-400 to-rose-500" style={{ width: `${Math.min(100, pctRotinasN3Op)}%` }} />
                  )}
                  {pctMelhoriaOp > 0 && (
                    <div className="bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${Math.min(100, pctMelhoriaOp)}%` }} />
                  )}
                  {pctTecnicasOp > 0 && (
                    <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${Math.min(100, pctTecnicasOp)}%` }} />
                  )}
                </div>
                {horasLivreOperation > 0 && (
                  <div className="space-y-1.5 rounded border bg-muted/20 p-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">Horas de Melhoria</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(horasMelhoriaOpClamped, 1)}h / {formatNumber(horasLivreOperation, 1)}h disponíveis
                      </span>
                    </div>
                    <Slider
                      value={[horasMelhoriaOpClamped]}
                      onValueChange={([v]) => setHorasMelhoriaOp(v)}
                      min={melhoriaOpHardMin}
                      max={Math.max(melhoriaOpHardMin + 1, Math.ceil(melhoriaOpHardMax))}
                      step={1}
                      rangeClassName="bg-indigo-500"
                      thumbClassName="h-6 w-6 border-indigo-600 bg-background shadow-md cursor-grab active:cursor-grabbing"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasChamadosN3 > 0 ? "bg-amber-500/20 border-amber-500/60 ring-2 ring-amber-400/50 shadow-sm" : "bg-amber-500/10 border-amber-500/30"}`}>
                    <div className="text-muted-foreground">Chamados N3 · {pctChamadosN3Op.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${horasChamadosN3 > 0 ? "text-amber-700 dark:text-amber-300 text-sm" : ""}`}>{formatNumber(horasChamadosN3, 1)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasRotinasOperationN3 > 0 ? "bg-rose-500/20 border-rose-500/60 ring-2 ring-rose-400/50 shadow-sm" : "bg-rose-500/10 border-rose-500/30"}`}>
                    <div className="text-muted-foreground">Rotinas · {pctRotinasN3Op.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${horasRotinasOperationN3 > 0 ? "text-rose-700 dark:text-rose-300 text-sm" : ""}`}>{formatNumber(horasRotinasOperationN3, 1)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasMelhoriaOpClamped > 0 ? "bg-indigo-500/20 border-indigo-500/60 ring-2 ring-indigo-400/50 shadow-sm" : "bg-indigo-500/10 border-indigo-500/30"}`}>
                    <div className="text-muted-foreground">Horas de Melhoria · {pctMelhoriaOp.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${horasMelhoriaOpClamped > 0 ? "text-indigo-700 dark:text-indigo-300 text-sm" : ""}`}>{formatNumber(horasMelhoriaOpClamped, 1)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${livreOperationEstourado ? "bg-destructive/10 border-destructive/40" : horasTecnicasOperation > 0 ? "bg-violet-500/20 border-violet-500/60 ring-2 ring-violet-400/50 shadow-sm" : "bg-violet-500/10 border-violet-500/30"}`}>
                    <div className="text-muted-foreground">Horas Técnicas · {pctTecnicasOp.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${livreOperationEstourado ? "text-destructive" : horasTecnicasOperation > 0 ? "text-violet-700 dark:text-violet-300 text-sm" : ""}`}>{formatNumber(horasTecnicasOperation, 1)}h</div>
                  </div>
                </div>
                {livreOperationEstourado && (
                  <p className="text-[10px] text-destructive">
                    ⚠ Horas contratadas insuficientes para absorver chamados N3 + rotinas. Aumente o slider.
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Prioridade: Chamados N3 → Rotinas → Horas de Melhoria → Horas Técnicas (sobra)
                </p>
                {/* Valor isolado do pool N3 — quanto cada bucket representa em R$ de venda */}
                {horasTotaisN3 > 0 && (() => {
                  const vHora = toSell(state.valorHoraN3);
                  const vTotal = horasTotaisN3 * vHora;
                  const vChamados = horasChamadosN3 * vHora;
                  const vRotinas = horasRotinasOperationN3 * vHora;
                  const vMelhoria = horasMelhoriaOpClamped * vHora;
                  const vTecnicas = horasTecnicasOperation * vHora;
                  return (
                    <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Valor isolado do pool N3 (venda)
                        </span>
                        <span className="text-xs font-extrabold text-primary tabular-nums">{formatBRL(vTotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className="flex justify-between rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5">
                          <span className="text-muted-foreground">Chamados</span>
                          <span className="font-semibold tabular-nums">{formatBRL(vChamados)}</span>
                        </div>
                        <div className="flex justify-between rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5">
                          <span className="text-muted-foreground">Rotinas</span>
                          <span className="font-semibold tabular-nums">{formatBRL(vRotinas)}</span>
                        </div>
                        <div className={`flex justify-between rounded px-1.5 py-0.5 border ${horasMelhoriaOpClamped > 0 ? "bg-indigo-500/20 border-indigo-500/60 ring-1 ring-indigo-400/50" : "bg-indigo-500/10 border-indigo-500/30"}`}>
                          <span className="text-muted-foreground">Melhoria</span>
                          <span className={`font-semibold tabular-nums ${horasMelhoriaOpClamped > 0 ? "text-indigo-700 dark:text-indigo-300" : ""}`}>{formatBRL(vMelhoria)}</span>
                        </div>
                        <div className={`flex justify-between rounded px-1.5 py-0.5 border ${horasTecnicasOperation > 0 ? "bg-violet-500/20 border-violet-500/60 ring-1 ring-violet-400/50" : "bg-violet-500/10 border-violet-500/30"}`}>
                          <span className="text-muted-foreground">Técnicas</span>
                          <span className={`font-semibold tabular-nums ${horasTecnicasOperation > 0 ? "text-violet-700 dark:text-violet-300" : ""}`}>{formatBRL(vTecnicas)}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic">
                        Já incluso em "Serviço base" do total Operation — exibido isolado apenas para análise.
                      </p>
                    </div>
                  );
                })()}
              </div>
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
                  <p className="text-xs font-semibold">Adicionar Field Service de Microinformática</p>
                  <p className="text-[11px] text-muted-foreground">
                    Atendimento presencial N1/N2/N3 — chamados de usuários passam pelo N1 convencional e são escalados para a equipe Field.
                  </p>
                </div>
              </label>
              {state.tierFieldOperation && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Composição — Field Service de Microinformática</p>
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
                          ["fieldDirectQtdN1", "Field Junior"],
                          ["fieldDirectQtdN2", "Field Pleno"],
                          ["fieldDirectQtdN3", "Field Senior"],
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
                        {state.fieldDirectQtdN1} prof.
                      </span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN1F))}</span>
                    </div>
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">
                        {state.fieldDirectQtdN2} prof.
                      </span>
                      <span className="font-semibold">{formatBRL(toSell(fs.custoN2F))}</span>
                    </div>
                    <div className="flex justify-between rounded border bg-background px-2 py-1.5">
                      <span className="text-muted-foreground">
                        {state.fieldDirectQtdN3} prof.
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
                    <span className="text-xs font-semibold">Total Field Service de Microinformática (venda)</span>
                    <span className="text-sm font-bold text-primary">{formatBRL(fsVenda)}</span>
                  </div>
                </div>
              )}
            </div>
            <GmudTable
              titulo="GMUDs vinculadas (Operation)"
              vazio="Nenhuma GMUD cadastrada para Operation."
              items={gmudOperation.items}
              totals={gmudOperation.totals}
              venda={gmudOperation.venda}
              toSell={toSell}
            />
            {(() => {
              const g = gerenciaisEmCamada("Operation");
              return g.items.length > 0 ? (
                <LayerRoutineTable
                  titulo="Rotinas Gerenciais Selbetti"
                  items={g.items}
                  totals={g.totals}
                  descricao="Precificadas em separado — não consomem as horas contratadas para atuação técnica."
                />
              ) : null;
            })()}
            <CompositionFooter
              title="Total Smart Operation (venda)"
              total={smOperationVenda}
              parts={[
                {
                  label: state.tierPerformance
                    ? "Serviço base (N1 + N2)"
                    : "Serviço base (N1 + N2 + N3)",
                  value: toSell(operacaoCustoTotal - (state.tierPerformance ? results.custoN3 : 0)),
                },
                ...(fsVenda > 0 ? [{ label: "Field Service de Microinformática", value: fsVenda }] : []),
                ...(gmudOperation.venda > 0 ? [{ label: "GMUDs (Operation)", value: gmudOperation.venda }] : []),
                ...(gerenciaisVendaIn("Operation") > 0
                  ? [{ label: "Rotinas Gerenciais Selbetti", value: gerenciaisVendaIn("Operation") }]
                  : []),
              ]}
            />
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
              titulo="Rotinas Técnicas Preventivas — Smart Performance · Ambiente Padrão"
              vazio="Nenhuma rotina padrão com demanda ativa no inventário."
              data={rotinasPerfPadrao}
            />

            {algumComplexAtivo ? (
              <PerformanceBlock
                titulo="Rotinas Técnicas Preventivas — Smart Performance · Ambiente Complexo"
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
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
              ⓘ Os valores das rotinas acima são informativos — as horas consumidas saem do pool N3 contratado (slider abaixo) e <strong>já estão inclusas</strong> em "Atendimento N3" do Total Smart Performance. Não somam novamente.
            </p>

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
                value={[Math.min(state.horasN3PerformanceMax, Math.max(state.horasN3PerformanceMin, state.horasN3Mensais || state.horasN3PerformanceMin))]}
                onValueChange={([v]) => update("horasN3Mensais", v)}
                min={state.horasN3PerformanceMin}
                max={state.horasN3PerformanceMax}
                step={1}
              />

              {/* Distribuição das horas N3 / Automação entre TAM / Owner / Livre */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-muted-foreground font-semibold">
                    Distribuição das horas N3 / Automação
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Horas Técnicas recalculadas automaticamente</span>
                </div>
                <div className="space-y-3 rounded border bg-muted/20 p-2">
                  <div className="flex h-3 overflow-hidden rounded-full border bg-muted">
                    {pctChamadosN3 > 0 && (
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, pctChamadosN3)}%` }} />
                    )}
                    {pctRotinasN3 > 0 && (
                      <div className="bg-gradient-to-r from-rose-400 to-rose-500" style={{ width: `${Math.min(100, pctRotinasN3)}%` }} />
                    )}
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${pctTam}%` }} />
                    <div className="bg-gradient-to-r from-sky-400 to-sky-500" style={{ width: `${pctOwner}%` }} />
                    {pctMelhoriaPerf > 0 && (
                      <div className="bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${Math.min(100, pctMelhoriaPerf)}%` }} />
                    )}
                    {pctTecnicasPerf > 0 && (
                      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${Math.min(100, pctTecnicasPerf)}%` }} />
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
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
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">Melhoria</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(horasMelhoriaPerfClamped, 1)}h / {formatNumber(horasLivre, 1)}h
                        </span>
                      </div>
                      <Slider
                        value={[horasMelhoriaPerfClamped]}
                        onValueChange={([v]) => setHorasMelhoriaPerf(v)}
                        min={melhoriaPerfHardMin}
                        max={Math.max(melhoriaPerfHardMin + 1, Math.ceil(melhoriaPerfHardMax))}
                        step={1}
                        rangeClassName="bg-indigo-500"
                        thumbClassName="h-6 w-6 border-indigo-600 bg-background shadow-md cursor-grab active:cursor-grabbing"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px]">
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasChamadosN3 > 0 ? "bg-amber-500/20 border-amber-500/60 ring-2 ring-amber-400/50 shadow-sm" : "bg-amber-500/10 border-amber-500/30"}`}>
                    <div className="text-muted-foreground">Chamados · {pctChamadosN3.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${horasChamadosN3 > 0 ? "text-amber-700 dark:text-amber-300 text-sm" : ""}`}>{formatNumber(horasChamadosN3, 1)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasRotinasN3 > 0 ? "bg-rose-500/20 border-rose-500/60 ring-2 ring-rose-400/50 shadow-sm" : "bg-rose-500/10 border-rose-500/30"}`}>
                    <div className="text-muted-foreground">Rotinas · {pctRotinasN3.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${horasRotinasN3 > 0 ? "text-rose-700 dark:text-rose-300 text-sm" : ""}`}>{formatNumber(horasRotinasN3, 1)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasTam > 0 ? "bg-emerald-500/20 border-emerald-500/60 ring-2 ring-emerald-400/50 shadow-sm" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                    <div className="text-muted-foreground">TAM · {pctTam}%</div>
                    <div className={`font-semibold tabular-nums ${horasTam > 0 ? "text-emerald-700 dark:text-emerald-300 text-sm" : ""}`}>{formatNumber(horasTam)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasOwner > 0 ? "bg-sky-500/20 border-sky-500/60 ring-2 ring-sky-400/50 shadow-sm" : "bg-sky-500/10 border-sky-500/30"}`}>
                    <div className="text-muted-foreground">Owner · {pctOwner}%</div>
                    <div className={`font-semibold tabular-nums ${horasOwner > 0 ? "text-sky-700 dark:text-sky-300 text-sm" : ""}`}>{formatNumber(horasOwner)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${horasMelhoriaPerfClamped > 0 ? "bg-indigo-500/20 border-indigo-500/60 ring-2 ring-indigo-400/50 shadow-sm" : "bg-indigo-500/10 border-indigo-500/30"}`}>
                    <div className="text-muted-foreground">Melhoria · {pctMelhoriaPerf.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${horasMelhoriaPerfClamped > 0 ? "text-indigo-700 dark:text-indigo-300 text-sm" : ""}`}>{formatNumber(horasMelhoriaPerfClamped, 1)}h</div>
                  </div>
                  <div className={`rounded px-1.5 py-1 border transition-all ${livreEstourado ? "bg-destructive/10 border-destructive/40" : horasTecnicasPerf > 0 ? "bg-violet-500/20 border-violet-500/60 ring-2 ring-violet-400/50 shadow-sm" : "bg-violet-500/10 border-violet-500/30"}`}>
                    <div className="text-muted-foreground">Horas Técnicas · {pctTecnicasPerf.toFixed(0)}%</div>
                    <div className={`font-semibold tabular-nums ${livreEstourado ? "text-destructive" : horasTecnicasPerf > 0 ? "text-violet-700 dark:text-violet-300 text-sm" : ""}`}>{formatNumber(horasTecnicasPerf, 1)}h</div>
                  </div>
                </div>
                {/* Valor isolado do pool N3 (Performance) */}
                {horasTotaisN3 > 0 && (() => {
                  const vHora = toSell(state.valorHoraN3);
                  const vTotal = horasTotaisN3 * vHora;
                  const vChamados = horasChamadosN3 * vHora;
                  const vRotinas = horasRotinasN3 * vHora;
                  const vTam = horasTam * vHora;
                  const vOwner = horasOwner * vHora;
                  const vMelhoria = horasMelhoriaPerfClamped * vHora;
                  const vTecnicas = horasTecnicasPerf * vHora;
                  return (
                    <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Valor isolado do pool N3 (venda)
                        </span>
                        <span className="text-xs font-extrabold text-primary tabular-nums">{formatBRL(vTotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px]">
                        <div className="flex justify-between rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5">
                          <span className="text-muted-foreground">Chamados</span>
                          <span className="font-semibold tabular-nums">{formatBRL(vChamados)}</span>
                        </div>
                        <div className="flex justify-between rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5">
                          <span className="text-muted-foreground">Rotinas</span>
                          <span className="font-semibold tabular-nums">{formatBRL(vRotinas)}</span>
                        </div>
                        <div className="flex justify-between rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5">
                          <span className="text-muted-foreground">TAM</span>
                          <span className="font-semibold tabular-nums">{formatBRL(vTam)}</span>
                        </div>
                        <div className="flex justify-between rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5">
                          <span className="text-muted-foreground">Owner</span>
                          <span className="font-semibold tabular-nums">{formatBRL(vOwner)}</span>
                        </div>
                        <div className={`flex justify-between rounded px-1.5 py-0.5 border ${horasMelhoriaPerfClamped > 0 ? "bg-indigo-500/20 border-indigo-500/60 ring-1 ring-indigo-400/50" : "bg-indigo-500/10 border-indigo-500/30"}`}>
                          <span className="text-muted-foreground">Melhoria</span>
                          <span className={`font-semibold tabular-nums ${horasMelhoriaPerfClamped > 0 ? "text-indigo-700 dark:text-indigo-300" : ""}`}>{formatBRL(vMelhoria)}</span>
                        </div>
                        <div className={`flex justify-between rounded px-1.5 py-0.5 border ${horasTecnicasPerf > 0 ? "bg-violet-500/20 border-violet-500/60 ring-1 ring-violet-400/50" : "bg-violet-500/10 border-violet-500/30"}`}>
                          <span className="text-muted-foreground">Técnicas</span>
                          <span className={`font-semibold tabular-nums ${horasTecnicasPerf > 0 ? "text-violet-700 dark:text-violet-300" : ""}`}>{formatBRL(vTecnicas)}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic">
                        Corresponde à linha "Atendimento N3" do total Performance — exibido isolado para análise.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
            )}

            <GmudTable
              titulo="GMUDs vinculadas (Performance)"
              vazio="Nenhuma GMUD cadastrada para Performance."
              items={gmudPerformance.items}
              totals={gmudPerformance.totals}
              venda={gmudPerformance.venda}
              toSell={toSell}
            />
            {(() => {
              const g = gerenciaisEmCamada("Performance");
              return g.items.length > 0 ? (
                <LayerRoutineTable
                  titulo="Rotinas Gerenciais Selbetti"
                  items={g.items}
                  totals={g.totals}
                  descricao="Precificadas em separado — não consomem as horas contratadas para atuação técnica."
                />
              ) : null;
            })()}
            <CompositionFooter
              title="Total Smart Performance (venda)"
              total={smPerformanceVenda}
              parts={[
                { label: `Atendimento N3 (${formatNumber(state.horasN3Mensais)}h)`, value: toSell(results.custoN3) },
                ...(gmudPerformance.venda > 0 ? [{ label: "GMUDs (Performance)", value: gmudPerformance.venda }] : []),
                ...(gerenciaisVendaIn("Performance") > 0
                  ? [{ label: "Rotinas Gerenciais Selbetti", value: gerenciaisVendaIn("Performance") }]
                  : []),
              ]}
            />
          </div>
        )}

        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Composição do valor total
          </p>
          {state.tierMonitor && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Smart Monitor</span>
              <span className="font-semibold tabular-nums">{formatBRL(smTotalVenda)}</span>
            </div>
          )}
          {state.tierFlow && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Smart Flow</span>
              <span className="font-semibold tabular-nums">{formatBRL(sflTotalVenda)}</span>
            </div>
          )}
          {state.tierOperation && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Smart Operation</span>
              <span className="font-semibold tabular-nums">{formatBRL(smOperationVenda)}</span>
            </div>
          )}
          {state.tierPerformance && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Smart Performance</span>
              <span className="font-semibold tabular-nums">{formatBRL(smPerformanceVenda)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-primary/30 pt-1.5">
            <span className="text-sm font-bold">Valor Total de Venda</span>
            <span className="text-base font-extrabold text-primary tabular-nums">{formatBRL(totalSelecionado)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompositionFooter({
  title,
  total,
  parts,
}: {
  title: string;
  total: number;
  parts: { label: string; value: number }[];
}) {
  return (
    <div className="border-t pt-2 space-y-1">
      {parts.length > 1 && parts.map((p, i) => (
        <div key={i} className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{i === 0 ? "" : "+ "}{p.label}</span>
          <span className="font-semibold tabular-nums">{formatBRL(p.value)}</span>
        </div>
      ))}
      <div className="flex justify-between pt-1 border-t border-dashed">
        <span className="text-xs font-semibold">{title}</span>
        <span className="text-sm font-bold text-primary tabular-nums">{formatBRL(total)}</span>
      </div>
    </div>
  );
}

function LayerRoutineTable({
  titulo,
  items,
  totals,
  descricao,
}: {
  titulo: string;
  items: { id: string; grupo: string; rotina: string; automacao: boolean; demanda: number; custo: number; venda: number }[];
  totals: { demanda: number; custo: number; venda: number };
  descricao?: string;
}) {
  return (
    <div className="rounded border bg-background p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-xs font-semibold">{titulo}</p>
        <span className="text-[10px] text-muted-foreground ml-auto">{items.length} item(ns)</span>
      </div>
      {descricao && (
        <p className="text-[10px] text-muted-foreground italic px-1">{descricao}</p>
      )}
      <div className="max-h-56 overflow-auto rounded border">
        <table className="w-full text-[11px]">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="text-left px-2 py-1 font-medium">Rotina</th>
              <th className="text-right px-2 py-1 font-medium w-16">Ch/mês</th>
              <th className="text-right px-2 py-1 font-medium w-20">Custo</th>
              <th className="text-right px-2 py-1 font-medium w-20">Venda</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-2 py-1">
                  <span className="text-muted-foreground">{i.grupo} · </span>
                  {i.rotina}
                  {i.automacao && (
                    <span className="ml-1 text-[9px] text-primary">[auto]</span>
                  )}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{i.demanda.toFixed(1)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{formatBRL(i.custo)}</td>
                <td className="px-2 py-1 text-right tabular-nums font-semibold">{formatBRL(i.venda)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted sticky bottom-0">
            <tr>
              <td className="px-2 py-1 font-semibold">Total</td>
              <td className="px-2 py-1 text-right font-semibold tabular-nums">{totals.demanda.toFixed(1)}</td>
              <td className="px-2 py-1 text-right font-semibold tabular-nums">{formatBRL(totals.custo)}</td>
              <td className="px-2 py-1 text-right font-bold text-primary tabular-nums">{formatBRL(totals.venda)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function GmudTable({
  titulo,
  vazio,
  items,
  totals,
  venda,
  toSell,
}: {
  titulo: string;
  vazio: string;
  items: GmudComputed[];
  totals: { chamados: number; horasN3: number; custo: number };
  venda: number;
  toSell: (c: number) => number;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded border bg-background p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-indigo-600" />
          <p className="text-xs font-semibold">{titulo}</p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {items.length} GMUD{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-56 overflow-auto rounded border">
        <table className="w-full text-[11px]">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="text-left px-2 py-1 font-medium">Descrição</th>
              <th className="text-left px-2 py-1 font-medium w-20">Tipo</th>
              <th className="text-left px-2 py-1 font-medium w-24">Frequência</th>
              <th className="text-right px-2 py-1 font-medium w-16">Ch/mês</th>
              <th className="text-right px-2 py-1 font-medium w-16">Horas N3 / Automação</th>
              <th className="text-right px-2 py-1 font-medium w-20">Venda</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-2 py-1">{g.descricao}</td>
                <td className="px-2 py-1 text-[10px] text-muted-foreground">{g.tipo}</td>
                <td className="px-2 py-1 text-[10px] text-muted-foreground">{g.frequencia}</td>
                <td className="px-2 py-1 text-right tabular-nums">{g.chamadosMes.toFixed(2)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{g.horasN3.toFixed(2)}</td>
                <td className="px-2 py-1 text-right tabular-nums font-semibold">{formatBRL(toSell(g.custo))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted sticky bottom-0">
            <tr>
              <td className="px-2 py-1 font-semibold" colSpan={3}>Total</td>
              <td className="px-2 py-1 text-right font-semibold tabular-nums">{totals.chamados.toFixed(2)}</td>
              <td className="px-2 py-1 text-right font-semibold tabular-nums">{totals.horasN3.toFixed(2)}</td>
              <td className="px-2 py-1 text-right font-bold text-primary tabular-nums">{formatBRL(venda)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
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
            valor/hora N3 / Automação: {formatBRL(hourRateSell)}
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