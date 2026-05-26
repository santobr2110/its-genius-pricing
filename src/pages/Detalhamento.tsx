import { useMemo } from "react";
import { useITSMContext } from "@/contexts/ITSMContext";
import { formatNumber, formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Crown,
  Clock, ListChecks, CheckCircle2, Circle, Sparkles, Server, Network,
  Database, Shield, Rocket, TrendingUp, Wrench, Star, Activity, FileDown,
  Medal, Award, Trophy, Gem,
} from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  ROTINAS_DEFAULT, rotinaMultiplicador, COMPLEX_FLAG_KEYS,
  type ComplexFlags, type Rotina,
} from "@/data/rotinas";
import {
  ESCOPO_DEFAULT, ESCOPO_STORAGE_KEY, CAMADA_LABEL,
  RESTRICOES_GERAIS_DEFAULT, RESTRICOES_GERAIS_STORAGE_KEY,
  type EscopoProposicao, type CamadaKey,
} from "@/data/escopoProposicao";
import {
  GMUDS_DEFAULT, bucketGmuds, computeGmud,
  type Gmud, type GmudComputed,
} from "@/data/gmuds";
import { GitBranch } from "lucide-react";

function normalizeOsRotina(r: Rotina): Rotina {
  const isOs = r.grupo.toLowerCase().includes("sistema operacional");
  if (!isOs) return r;
  return { ...r, ativo: "Servidor", unidade: "Servidor (Ambiente)", abrangencia: "Ambiente" };
}

const TIER_THEMES: Record<string, { ring: string; bg: string; chip: string; icon: string; bar: string; badge: string; check: string; glow: string; valueGrad: string; blob1: string; blob2: string }> = {
  // Bronze — Smart Monitor
  bronze:  { ring: "border-amber-500/70 dark:border-amber-700/70",   bg: "from-amber-100/80 via-card to-orange-100/40 dark:from-amber-950/60 dark:via-card dark:to-orange-950/30", chip: "bg-gradient-to-r from-amber-600/25 to-orange-700/25 text-amber-800 dark:text-amber-200",  icon: "bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 text-white",   bar: "from-amber-400 via-orange-500 to-amber-700",  badge: "bg-gradient-to-r from-amber-600 to-orange-700",  check: "text-amber-700 dark:text-amber-300", glow: "shadow-amber-700/30", valueGrad: "from-amber-700 to-orange-700 dark:from-amber-300 dark:to-orange-300", blob1: "bg-amber-500/30", blob2: "bg-orange-600/20" },
  // Silver — Smart Operation
  silver:  { ring: "border-slate-400/70 dark:border-slate-500/70",   bg: "from-slate-100/90 via-card to-zinc-100/50 dark:from-slate-800/60 dark:via-card dark:to-zinc-900/40",     chip: "bg-gradient-to-r from-slate-400/25 to-zinc-500/25 text-slate-700 dark:text-slate-200",    icon: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 text-slate-900",  bar: "from-slate-300 via-zinc-300 to-slate-500",   badge: "bg-gradient-to-r from-slate-500 to-zinc-600",     check: "text-slate-600 dark:text-slate-300", glow: "shadow-slate-500/30", valueGrad: "from-slate-600 to-zinc-700 dark:from-slate-200 dark:to-zinc-200",     blob1: "bg-slate-400/30", blob2: "bg-zinc-400/20" },
  // Gold — Smart Performance
  gold:    { ring: "border-yellow-500/80 dark:border-yellow-500/70", bg: "from-yellow-100/80 via-card to-amber-100/50 dark:from-yellow-950/60 dark:via-card dark:to-amber-950/40", chip: "bg-gradient-to-r from-yellow-500/25 to-amber-500/25 text-yellow-800 dark:text-yellow-200", icon: "bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-yellow-950", bar: "from-yellow-300 via-amber-400 to-yellow-600", badge: "bg-gradient-to-r from-yellow-500 to-amber-600",   check: "text-yellow-700 dark:text-yellow-300", glow: "shadow-yellow-500/40", valueGrad: "from-yellow-600 to-amber-700 dark:from-yellow-300 dark:to-amber-300", blob1: "bg-yellow-400/35", blob2: "bg-amber-500/25" },
  // Diamond — Smart Enterprise
  diamond: { ring: "border-cyan-400/80 dark:border-cyan-400/70",    bg: "from-cyan-100/80 via-card to-sky-100/40 dark:from-cyan-950/60 dark:via-card dark:to-sky-950/30",          chip: "bg-gradient-to-r from-cyan-400/25 to-sky-500/25 text-cyan-800 dark:text-cyan-200",         icon: "bg-gradient-to-br from-cyan-200 via-sky-300 to-blue-500 text-cyan-950",   bar: "from-cyan-300 via-sky-400 to-blue-500",   badge: "bg-gradient-to-r from-cyan-500 to-sky-600",       check: "text-cyan-700 dark:text-cyan-300", glow: "shadow-cyan-500/40", valueGrad: "from-cyan-600 to-blue-600 dark:from-cyan-300 dark:to-sky-300",       blob1: "bg-cyan-400/35", blob2: "bg-sky-400/25" },
  // Field Service — sub-oferta (mantém âmbar/laranja distinto)
  amber:   { ring: "border-amber-300/70 dark:border-amber-600/60",  bg: "from-amber-100/80 via-card to-orange-50/40 dark:from-amber-950/50 dark:via-card dark:to-orange-950/20",  chip: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300",   icon: "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white",  bar: "from-amber-400 via-orange-400 to-rose-500",   badge: "bg-gradient-to-r from-amber-500 to-orange-500",   check: "text-amber-600 dark:text-amber-400", glow: "shadow-amber-500/30", valueGrad: "from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300", blob1: "bg-amber-400/30", blob2: "bg-orange-400/20" },
};

const TIER_ALIAS: Record<string, { name: string; icon: React.ElementType }> = {
  bronze:  { name: "Bronze",  icon: Medal  },
  silver:  { name: "Silver",  icon: Award  },
  gold:    { name: "Gold",    icon: Trophy },
  diamond: { name: "Diamond", icon: Gem    },
};

export default function Detalhamento() {
  const { state, results } = useITSMContext();
  const sm = results.smartMonitor;
  const fs = results.fieldService;

  // Quando não há ativos de Cloud/Datacenter no inventário, o Smart Monitor
  // não faz parte da proposta (ainda que esteja marcado nas configurações).
  const hasInfraInventory =
    (state.qtdServidores || 0) + (state.qtdAtivosRede || 0) +
    (state.qtdBancosDados || 0) + (state.qtdSistemas || 0) > 0;
  const monitorVisible = state.tierMonitor && hasInfraInventory;

  // Camada mais alta ativa = dominante visual
  const dominantColor =
    state.tierEnterprise ? "diamond"
    : state.tierPerformance ? "gold"
    : state.tierOperation ? "silver"
    : monitorVisible ? "bronze"
    : null;

  // Nome final da oferta = camada mais alta ativa.
  // As demais camadas são apresentadas como componentes desta oferta.
  const DOMINANT_OFFER: Record<string, { name: string; tagline: string }> = {
    bronze:  { name: "ITO Smart Monitor",     tagline: "Monitoramento da infraestrutura" },
    silver:  { name: "ITO Smart Operation",   tagline: "Service Desk gerenciado com monitoramento incluso" },
    gold:    { name: "ITO Smart Performance", tagline: "Operação completa com rotinas avançadas e horas N3" },
    diamond: { name: "ITO Smart Enterprise",  tagline: "Governança executiva sobre toda a operação de TI" },
  };
  const dominantOffer = dominantColor ? DOMINANT_OFFER[dominantColor] : null;
  const componentNames: string[] = [];
  if (monitorVisible) componentNames.push("Monitor");
  if (state.tierOperation) componentNames.push("Operation" + (state.tierFieldOperation ? " + Field Service" : ""));
  if (state.tierPerformance) componentNames.push("Performance");
  if (state.tierEnterprise) componentNames.push("Enterprise");

  const handleExportPDF = async () => {
    const el = document.getElementById("proposicao-printable");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#0e1b14",
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      onclone: (doc: Document) => {
        const printable = doc.getElementById("proposicao-printable");
        if (printable) printable.classList.add("pdf-export-background");
        doc.querySelectorAll<HTMLElement>(".bg-clip-text.text-transparent").forEach((node) => {
          node.style.background = "none";
          node.style.backgroundImage = "none";
          node.style.webkitBackgroundClip = "border-box";
          node.style.backgroundClip = "border-box";
          node.style.webkitTextFillColor = "";
          node.style.color = "hsl(var(--primary))";
        });
      },
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const pdfWidth = 210; // A4 mm
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }
    pdf.save(`proposicao-smart-ito-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [gmuds] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);
  const [n3Cortes] = usePersistentState<[number, number]>("gestao-ti:smartPerf:n3Cortes", [33, 66]);
  const [escopo] = usePersistentState<EscopoProposicao>(ESCOPO_STORAGE_KEY, ESCOPO_DEFAULT);
  const [restricoesGerais] = usePersistentState<string[]>(
    RESTRICOES_GERAIS_STORAGE_KEY,
    RESTRICOES_GERAIS_DEFAULT,
  );
  const [corteTam, corteOwner] = n3Cortes;
  const pctTam = corteTam;
  const pctOwner = Math.max(0, corteOwner - corteTam);
  const pctLivre = Math.max(0, 100 - corteOwner);
  const horasTotaisN3 = state.horasN3Mensais || 0;

  // Fator de venda (markup divisor + impostos) — converte custo em preço de venda
  const fatorMargem = (100 - state.margemLucro) / 100;
  const fatorImposto = (100 - state.impostosTaxas) / 100;
  const fatorVenda = (fatorMargem > 0 && fatorImposto > 0) ? 1 / (fatorMargem * fatorImposto) : 1;
  const valorHoraN3Venda = state.valorHoraN3 * fatorVenda;

  const inv = {
    qtdUsuarios: state.qtdUsuarios, qtdEquipamentos: state.qtdEquipamentos,
    qtdServidores: state.qtdServidores, qtdAtivosRede: state.qtdAtivosRede,
    qtdBancosDados: state.qtdBancosDados, qtdSistemas: state.qtdSistemas,
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

  const hasServiceDesk =
    (state.qtdUsuarios || 0) + (state.qtdEquipamentos || 0) > 0;
  const n3OptionalScenario = !hasInfraInventory && hasServiceDesk;

  // Custo médio por chamado de rotina ponderado (mesma fórmula do painel principal)
  const custoChN3Mix = state.tempoMedioChamadoN3 * state.valorHoraN3;
  const somaRotina = (state.percRotinaN1 + state.percRotinaN2 + state.percRotinaN3) || 100;
  const wRotN1 = state.percRotinaN1 / somaRotina;
  const wRotN2 = state.percRotinaN2 / somaRotina;
  const wRotN3 = state.percRotinaN3 / somaRotina;
  const custoPorChamadoMix =
    wRotN1 * results.custoPorChamadoN1 +
    wRotN2 * results.custoPorChamadoN2 +
    wRotN3 * custoChN3Mix;
  const fatorAutoPerc = Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100;

  const rotinaCusto = (r: Rotina, demanda: number) => {
    const fa = r.automacao ? fatorAutoPerc : 1;
    if (r.oferta === "Performance" && (r.complexidade ?? "Padrão") === "Complexo") {
      const horas = r.horasExecucao ?? 4;
      return demanda * horas * state.valorHoraN3 * fa;
    }
    return demanda * custoPorChamadoMix * fa;
  };

  const filterRoutines = (oferta: "Operation" | "Performance", complexidade?: "Padrão" | "Complexo") =>
    rotinas
      .filter(r => r.oferta === oferta)
      .filter(r => oferta === "Performance" ? (r.complexidade ?? "Padrão") === complexidade : true)
      // Sem infra (apenas service desk): apenas microinformática.
      // Com infra + service desk: todas as rotinas (incluindo microinformática).
      // Com infra sem service desk: exclui microinformática (vai para Field Service).
      .filter(r =>
        n3OptionalScenario
          ? r.grupo.toLowerCase().includes("microinform")
          : hasServiceDesk && !state.tierFieldOperation
            ? true
            : !r.grupo.toLowerCase().includes("microinform"),
      )
      .map(r => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const custo = rotinaCusto(r, demanda);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, freq: r.frequencia, demanda, mult, custo };
      })
      .filter(i => i.demanda > 0);

  const rotinasOp = useMemo(() => filterRoutines("Operation"), [rotinas, state]);
  const rotinasPerfPadrao = useMemo(() => filterRoutines("Performance", "Padrão"), [rotinas, state]);
  const rotinasPerfComplexo = useMemo(() => filterRoutines("Performance", "Complexo"), [rotinas, state]);

  const rotinasField = useMemo(() => {
    if (!state.tierFieldOperation || n3OptionalScenario) return [];
    return rotinas
      .filter(r => r.grupo.toLowerCase().includes("microinform"))
      .filter(r => (r.oferta === "Performance" ? state.tierPerformance : true))
      .map(r => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        const demanda = r.chamadosMes * mult;
        const custo = rotinaCusto(r, demanda);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, freq: r.frequencia, oferta: r.oferta, demanda, mult, custo };
      })
      .filter(i => i.demanda > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotinas, state]);

  const sumCusto = (arr: { custo: number }[]) => arr.reduce((a, b) => a + b.custo, 0);
  const custoRotinasOp = sumCusto(rotinasOp);
  const custoRotinasPerfPadrao = sumCusto(rotinasPerfPadrao);
  const custoRotinasPerfComplexo = sumCusto(rotinasPerfComplexo);
  const custoRotinasField = sumCusto(rotinasField);

  // Rotinas Performance consomem horas do pool N3 contratado (slider).
  // O custo das rotinas é abatido das horas N3 (sem cobrar em separado).
  // Rotinas Operation seguem o mesmo princípio (absorvidas pelo pool N3 contratado).
  const horasRotinasOpN3 = state.valorHoraN3 > 0
    ? custoRotinasOp / state.valorHoraN3
    : 0;
  const horasRotinasPerfN3 = state.valorHoraN3 > 0
    ? (custoRotinasPerfPadrao + custoRotinasPerfComplexo) / state.valorHoraN3
    : 0;
  // Quando Performance está ativo, o pool N3 fica em Performance e absorve
  // tanto as rotinas de Performance quanto as de Operation.
  const horasRotinasN3 = horasRotinasOpN3 + horasRotinasPerfN3;

  // Valores de venda por camada (alinhados ao painel principal)
  const toSell = (c: number) => c * fatorVenda;
  const valorMonitor = monitorVisible ? toSell(sm.total) : 0;
  const custoOperacaoBase =
    results.custoN1 + results.custoN2 + (state.tierPerformance ? 0 : results.custoN3);
  const valorFieldService = state.tierFieldOperation
    ? toSell(fs.total) + toSell(custoRotinasField)
    : 0;
  const valorOperation = state.tierOperation
    ? toSell(custoOperacaoBase) + valorFieldService
    : 0;
  const valorPerformance = state.tierPerformance
    ? toSell(results.custoN3)
    : 0;
  const investimentoTotal = valorMonitor + valorOperation + valorPerformance;

  // Subtotais decompostos para exibir a composição do valor de cada camada
  const valorMonitorParts = monitorVisible
    ? [
        { label: "Monitoramento de ativos", value: toSell(sm.custoMonitoramento) },
        { label: "N1 alocado (triagem)", value: toSell(sm.custoN1Alocado) },
        ...(sm.custoN3Manut > 0 ? [{ label: "Manutenção do monitoramento (N3)", value: toSell(sm.custoN3Manut) }] : []),
        ...(sm.custoN3 > 0 ? [{ label: "Acionamento N3 (horas opcionais)", value: toSell(sm.custoN3) }] : []),
        ...(sm.custoAtendentes > 0
          ? [{ label: `Atendentes no ITSM (${sm.qtdAtendentes}x)`, value: toSell(sm.custoAtendentes) }]
          : []),
        ...(sm.custoProxys > 0
          ? [{ label: `Proxys de monitoramento (${sm.qtdProxys}x)`, value: toSell(sm.custoProxys) }]
          : []),
      ]
    : [];
  const valorOperationParts = state.tierOperation
    ? [
        {
          label: state.tierPerformance ? "Serviço base (N1 + N2)" : "Serviço base (N1 + N2 + N3)",
          value: toSell(custoOperacaoBase),
        },
        ...(valorFieldService > 0
          ? [{ label: "Field Service", value: valorFieldService }]
          : []),
      ]
    : [];
  const valorPerformanceParts = state.tierPerformance
    ? [
        {
          label: `Atendimento N3 (${formatNumber(state.horasN3Mensais)}h)`,
          value: toSell(results.custoN3),
        },
      ]
    : [];
  const valorFieldParts = state.tierFieldOperation
    ? [
        { label: "Equipe presencial (N1F + N2F + N3F)", value: toSell(fs.custoN1F + fs.custoN2F + fs.custoN3F) },
        { label: "Triagem N1", value: toSell(fs.custoTriagemN1) },
        ...(fs.overflowAtivo
          ? [{ label: "Transbordo remoto (N1 + N2F)", value: toSell(fs.custoTransbordoN1Remoto + fs.custoTransbordoN2F) }]
          : []),
        ...(custoRotinasField > 0
          ? [{ label: "Rotinas Field · Microinformática", value: toSell(custoRotinasField) }]
          : []),
      ]
    : [];

  const horasAtendN3 = results.horasAtendimentoN3;
  const horasPrev = Math.max(0, horasTotaisN3 - horasAtendN3);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">
              Proposição{dominantOffer ? ` · ${dominantOffer.name}` : ""}
            </h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
            <SortableNav current="detalhamento" />
          </div>
        </div>
      </header>

      <main id="proposicao-printable" className="proposicao-printable mx-auto max-w-5xl p-6 space-y-6">
        <section className="text-center pt-2 pb-1">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-3 py-1 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Proposta Comercial</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            {dominantOffer ? dominantOffer.name : "Proposição de Smart ITO"}
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            {dominantOffer ? dominantOffer.tagline : "Detalhamento por camada da oferta"}
          </p>
          {componentNames.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Composta por
              </span>
              {componentNames.map((n, i) => (
                <span key={n} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/60 text-xs">+</span>}
                  <span className="inline-flex items-center gap-1 rounded-full border bg-card/70 backdrop-blur px-2.5 py-1 text-[11px] font-bold">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {n}
                  </span>
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 h-1 w-24 mx-auto rounded-full bg-gradient-to-r from-primary to-accent" />
        </section>

        {/* SMART MONITOR */}
        {monitorVisible && (
        <TierBlock active={monitorVisible} color="bronze" icon={Activity} tierIndex={1}
          dominant={dominantColor === "bronze"}
          title={escopo.monitor.titulo} tagline={escopo.monitor.tagline}
          valor={valorMonitor}>
          {escopo.monitor.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.monitor.descricao}</p>
          )}
          {escopo.monitor.incluidos.length > 0 && (
            <>
              <SubTitle>O que está incluído</SubTitle>
              <ul className="space-y-1.5">
                {escopo.monitor.incluidos.map((t, i) => (
                  <Bullet key={i} color="bronze">{t}</Bullet>
                ))}
              </ul>
            </>
          )}
          <SubTitle>Componentes monitorados</SubTitle>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Comp icon={Server} label="Servidores" qtd={state.qtdServidores} ativo />
            <Comp icon={Network} label="Ativos de Rede" qtd={state.qtdAtivosRede} ativo />
            <Comp icon={Database} label="Bancos de Dados" qtd={state.qtdBancosDados} ativo />
            <Comp icon={Shield} label="Firewall / Sistemas" qtd={state.qtdSistemas} ativo />
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <Stat label="Total de ativos" value={formatNumber(sm.ativos)} />
            <Stat label="Chamados de monitoramento" value={`${formatNumber(sm.chamadosAtivos, 1)}/mês`} />
            <Stat label="Alocação N1 sobre monitor" value={`${state.percAlocacaoN1Monitor}%`} />
          </div>

          {(sm.qtdAtendentes > 0 || sm.qtdProxys > 0) && (
            <div className="mt-4">
              <SubTitle>Recursos dimensionados</SubTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sm.qtdAtendentes > 0 && (
                  <div className="rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Atendentes no ITSM</div>
                      <div className="text-lg font-bold leading-tight">{formatNumber(sm.qtdAtendentes)}</div>
                      <div className="text-[11px] text-muted-foreground">acessos</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor mensal</div>
                      <div className="text-base font-bold text-primary">{formatBRL(toSell(sm.custoAtendentes))}</div>
                    </div>
                  </div>
                )}
                {sm.qtdProxys > 0 && (
                  <div className="rounded border bg-background/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Proxys de monitoramento</div>
                      <div className="text-lg font-bold leading-tight">{formatNumber(sm.qtdProxys)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {sm.qtdProxys === 1 ? "1 inicial" : `1 inicial + ${sm.qtdProxys - 1} adicional${sm.qtdProxys - 1 > 1 ? "is" : ""}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor mensal</div>
                      <div className="text-base font-bold text-primary">{formatBRL(toSell(sm.custoProxys))}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {!state.tierOperation && (state.horasN3MonitorManut > 0 || state.horasN3Monitor > 0) && (() => {
            const hManut = Math.max(0, state.horasN3MonitorManut || 0);
            const hAcion = Math.max(0, state.horasN3Monitor || 0);
            const hTotal = hManut + hAcion;
            const pctManut = hTotal > 0 ? (hManut / hTotal) * 100 : 0;
            const pctAcion = hTotal > 0 ? (hAcion / hTotal) * 100 : 0;
            return (
              <div className="mt-4">
                <SubTitle>Consumo das horas N3</SubTitle>
                <div className="rounded border bg-background/70 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Total contratado</span>
                    <span className="font-semibold">
                      {formatNumber(hTotal)}h · {formatBRL(hTotal * state.valorHoraN3 * fatorVenda)}
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-1.5">
                    <div className="text-muted-foreground text-[10px]">Manut. de Monitoramento · {pctManut.toFixed(0)}%</div>
                    <div className="font-semibold">{formatNumber(hManut)}h · {formatBRL(sm.custoN3Manut * fatorVenda)}</div>
                    <div className="text-[10px] text-muted-foreground">Ajustes e tunings do monitoramento.</div>
                  </div>
                  <div className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1.5">
                    <div className="text-muted-foreground text-[10px]">Acionamento N3 · {pctAcion.toFixed(0)}%</div>
                    <div className="font-semibold">{formatNumber(hAcion)}h · {formatBRL(sm.custoN3 * fatorVenda)}</div>
                    <div className="text-[10px] text-muted-foreground">Tratamento de incidentes detectados.</div>
                  </div>
                </div>
                </div>
              </div>
            );
          })()}
          <CompositionBox title="Composição do valor mensal" total={valorMonitor} parts={valorMonitorParts} color="bronze" />
        </TierBlock>
        )}

        {/* SMART OPERATION */}
        <TierBlock active={state.tierOperation} color="silver" icon={Rocket} tierIndex={2}
          dominant={dominantColor === "silver"}
          title={escopo.operation.titulo} tagline={escopo.operation.tagline}
          valor={valorOperation}>
          {escopo.operation.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.operation.descricao}</p>
          )}
          <SubTitle>O que está incluído</SubTitle>
          <ul className="space-y-1.5">
            {escopo.operation.incluidos.map((t, i) => (
              <Bullet key={i} color="silver">{t}</Bullet>
            ))}
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <Stat label="Volume N1" value={`${formatNumber(results.volumeN1, 1)} ch/mês`} />
            <Stat label="Volume N2" value={`${formatNumber(results.volumeN2, 1)} ch/mês`} />
            <Stat label="Custo/chamado N1" value={formatBRL(results.custoPorChamadoN1)} />
          </div>

          {rotinasOp.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas preventivas básicas ({rotinasOp.length})</SubTitle>
              <RoutineList items={rotinasOp} accent="silver" />
            </>
          )}

          {(!n3OptionalScenario || state.tierOperationN3) && !state.tierPerformance && state.horasN3Mensais > 0 && (
            <N3HoursBox
              total={state.horasN3Mensais}
              consumidas={horasAtendN3}
              previstas={horasPrev}
              chamadosN3={results.volumeN3}
              tempoMedio={state.tempoMedioChamadoN3}
              valorHora={valorHoraN3Venda}
              modo="operation"
              horasRotinas={horasRotinasOpN3}
            />
          )}

          {/* FIELD SERVICE — sub-oferta dentro do Smart Operation */}
          {state.tierFieldOperation && (
            <div className="mt-5 rounded-2xl border-2 border-amber-300/70 dark:border-amber-700/60 bg-gradient-to-br from-amber-50/60 via-background/40 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 p-4 space-y-3 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="rounded-xl p-2 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-md">
                  <Wrench className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-extrabold tracking-tight">{escopo.fieldService.titulo}</p>
                  <p className="text-[11px] text-muted-foreground italic">{escopo.fieldService.tagline}</p>
                </div>
                {valorFieldService > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Valor mensal</p>
                    <p className="text-base font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent tabular-nums">{formatBRL(valorFieldService)}</p>
                  </div>
                )}
              </div>
              {escopo.fieldService.descricao && (
                <p className="text-xs text-muted-foreground leading-relaxed">{escopo.fieldService.descricao}</p>
              )}
              {escopo.fieldService.incluidos.length > 0 && (
                <>
                  <SubTitle>O que está incluído</SubTitle>
                  <ul className="space-y-1.5">
                    {escopo.fieldService.incluidos.map((t, i) => (
                      <Bullet key={i} color="amber">{t}</Bullet>
                    ))}
                  </ul>
                </>
              )}
              <SubTitle>Equipe presencial alocada</SubTitle>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="N1F" value={`${state.fieldDirectQtdN1} prof.`} sub={formatBRL(fs.custoN1F)} />
                <Stat label="N2F" value={`${state.fieldDirectQtdN2} prof.`} sub={formatBRL(fs.custoN2F)} />
                <Stat label="N3F" value={`${state.fieldDirectQtdN3} prof.`} sub={formatBRL(fs.custoN3F)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Stat label="Equipamentos cobertos" value={formatNumber(state.qtdEquipamentos)} />
                <Stat label="Chamados escalados ao Field" value={`${formatNumber(fs.volumeUsuariosEscalado, 1)}/mês`} />
              </div>
              {fs.overflowAtivo && (
                <div className="rounded-lg border border-amber-300 bg-amber-100/40 dark:bg-amber-900/20 p-3 text-xs">
                  <strong>Transbordo ativo:</strong> {formatNumber(fs.volumeTransbordoN1Remoto, 1)} ch/mês excedem capacidade presencial e são tratados via N1 remoto + N2F.
                </div>
              )}
              {rotinasField.length > 0 && (
                <>
                  <SubTitle>Rotinas Field — Microinformática ({rotinasField.length})</SubTitle>
                  <RoutineList items={rotinasField} accent="amber" />
                </>
              )}
              <CompositionBox title="Composição Field Service" total={valorFieldService} parts={valorFieldParts} color="amber" />
            </div>
          )}
          <CompositionBox title="Composição do valor mensal" total={valorOperation} parts={valorOperationParts} color="silver" />
        </TierBlock>

        {/* SMART PERFORMANCE */}
        <TierBlock active={state.tierPerformance} color="gold" icon={TrendingUp} tierIndex={4}
          dominant={dominantColor === "gold"}
          title={escopo.performance.titulo} tagline={escopo.performance.tagline}
          valor={valorPerformance}>
          {escopo.performance.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.performance.descricao}</p>
          )}
          <SubTitle>O que está incluído</SubTitle>
          <ul className="space-y-1.5">
            {escopo.performance.incluidos.map((t, i) => (
              <Bullet key={i} color="gold">{t}</Bullet>
            ))}
          </ul>

          {rotinasPerfPadrao.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Performance — Ambiente Padrão ({rotinasPerfPadrao.length})</SubTitle>
              <RoutineList items={rotinasPerfPadrao} accent="gold" />
            </>
          )}

          {algumComplexAtivo && rotinasPerfComplexo.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Performance — Ambiente Complexo ({rotinasPerfComplexo.length})</SubTitle>
              <RoutineList items={rotinasPerfComplexo} accent="gold" complexo />
            </>
          )}

          {state.tierPerformance && (!n3OptionalScenario || state.tierOperationN3) && state.horasN3Mensais > 0 && (
            <N3HoursBox
              total={state.horasN3Mensais}
              consumidas={horasAtendN3}
              previstas={horasPrev}
              chamadosN3={results.volumeN3}
              tempoMedio={state.tempoMedioChamadoN3}
              valorHora={valorHoraN3Venda}
              modo="performance"
              horasRotinas={horasRotinasN3}
              distribuicao={{ tam: pctTam, owner: pctOwner, livre: pctLivre }}
            />
          )}
          <CompositionBox title="Composição do valor mensal" total={valorPerformance} parts={valorPerformanceParts} color="gold" />
        </TierBlock>

        {/* SMART ENTERPRISE */}
        <TierBlock active={state.tierEnterprise} color="diamond" icon={Crown} tierIndex={5}
          dominant={dominantColor === "diamond"}
          title={escopo.enterprise.titulo} tagline={escopo.enterprise.tagline} valor={0}>
          {escopo.enterprise.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed">{escopo.enterprise.descricao}</p>
          )}
          <SubTitle>O que está incluído</SubTitle>
          <ul className="space-y-1.5">
            {escopo.enterprise.incluidos.map((t, i) => (
              <Bullet key={i} color="diamond">{t}</Bullet>
            ))}
          </ul>
        </TierBlock>

        {/* INVESTIMENTO */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Investimento Mensal Total{dominantOffer ? ` · ${dominantOffer.name}` : ""}
                </p>
                <p className="mt-1 text-3xl md:text-4xl font-bold text-primary">{formatBRL(investimentoTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Margem {state.margemLucro}% · Tributos {state.impostosTaxas}%
                </p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div><span className="text-muted-foreground">Anual: </span><strong>{formatBRL(investimentoTotal * 12)}</strong></div>
              </div>
            </div>
            <div className="mt-4 border-t border-primary/20 pt-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                Componentes da oferta{dominantOffer ? ` ${dominantOffer.name}` : ""}
              </p>
              {monitorVisible && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Monitor</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorMonitor)}</span>
                </div>
              )}
              {state.tierOperation && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Operation{state.tierFieldOperation ? " (com Field Service)" : ""}</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorOperation)}</span>
                </div>
              )}
              {state.tierPerformance && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Performance</span>
                  <span className="font-semibold tabular-nums">{formatBRL(valorPerformance)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-primary/30 pt-1.5 mt-1">
                <span className="text-xs font-bold">Total</span>
                <span className="text-sm font-extrabold text-primary tabular-nums">{formatBRL(investimentoTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RESTRIÇÕES DE ATUAÇÃO — bloco compacto por camada ativa */}
        {(() => {
          const ativos: CamadaKey[] = [];
          if (monitorVisible) ativos.push("monitor");
          if (state.tierOperation) ativos.push("operation");
          if (state.tierFieldOperation) ativos.push("fieldService");
          if (state.tierPerformance) ativos.push("performance");
          if (state.tierEnterprise) ativos.push("enterprise");
          const blocos = ativos
            .map((k) => ({ k, items: escopo[k]?.restricoes ?? [] }))
            .filter((b) => b.items.length > 0);
          if (blocos.length === 0) return null;
          const gerais = restricoesGerais.filter((r) => r.trim().length > 0);
          return (
            <Card className="border-muted-foreground/20 bg-muted/20">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                    Restrições de atuação
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blocos.map((b) => (
                    <div key={b.k} className="rounded-lg border bg-background/70 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 mb-1.5">
                        {CAMADA_LABEL[b.k]}
                      </p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground leading-snug">
                        {b.items.map((t, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-muted-foreground/60">·</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {gerais.length > 0 && (
                  <div className="rounded-lg border border-dashed bg-background/50 p-3 mt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 mb-1.5">
                      Restrições Gerais
                    </p>
                    <ul className="space-y-1 text-[11px] text-muted-foreground leading-snug">
                      {gerais.map((t, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-muted-foreground/60">·</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground italic">
                  Itens fora deste escopo podem ser atendidos sob demanda mediante orçamento específico.
                </p>
              </CardContent>
            </Card>
          );
        })()}
      </main>
    </div>
  );
}

/* ===== Subcomponents ===== */

function CompositionBox({
  title,
  total,
  parts,
  color,
}: {
  title: string;
  total: number;
  parts: { label: string; value: number }[];
  color: string;
}) {
  const theme = TIER_THEMES[color] ?? TIER_THEMES.silver;
  if (parts.length < 2 || total <= 0) return null;
  return (
    <div className={`mt-4 rounded-xl border-2 ${theme.ring} bg-background/70 backdrop-blur-sm p-3 space-y-1.5`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      {parts.map((p, i) => (
        <div key={i} className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">{i === 0 ? "" : "+ "}{p.label}</span>
          <span className="font-semibold tabular-nums">{formatBRL(p.value)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-dashed pt-1.5 mt-1">
        <span className="text-[12px] font-bold">Total</span>
        <span className={`text-sm font-extrabold tabular-nums bg-gradient-to-r ${theme.valueGrad} bg-clip-text text-transparent`}>{formatBRL(total)}</span>
      </div>
    </div>
  );
}

function TierBlock({
  active, color, icon: Icon, title, tagline, valor, children, tierIndex, dominant,
}: {
  active: boolean; color: string; icon: React.ElementType;
  title: string; tagline: string; valor: number;
  tierIndex?: number; children?: React.ReactNode; dominant?: boolean;
}) {
  const theme = TIER_THEMES[color] ?? TIER_THEMES.silver;
  const alias = TIER_ALIAS[color];
  const AliasIcon = alias?.icon;
  if (!active) {
    return (
      <div className="relative rounded-3xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-5 opacity-60">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-3 bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-muted-foreground">{title}</p>
              <Badge variant="secondary" className="text-[9px]"><Circle className="h-2.5 w-2.5 mr-1" />Não incluso</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground italic mt-0.5">{tagline}</p>
          </div>
          {alias && AliasIcon && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-muted-foreground">
              <AliasIcon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{alias.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={`group relative overflow-hidden rounded-3xl border-2 ${theme.ring} bg-gradient-to-br ${theme.bg} shadow-xl ${theme.glow} transition-all hover:shadow-2xl ${dominant ? "ring-4 ring-offset-2 ring-offset-background ring-current/30 scale-[1.005]" : ""}`}>
      {/* Decorative blobs */}
      <div className={`pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl ${theme.blob1}`} />
      <div className={`pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full blur-3xl ${theme.blob2}`} />
      <div className={`h-2 w-full bg-gradient-to-r ${theme.bar}`} />

      <div className="relative p-6 space-y-4">
        {/* Header row: icon + title + badge + value, all in one flex line — no absolute overlap */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`relative rounded-2xl p-3.5 shadow-lg ${theme.icon} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className="h-6 w-6" strokeWidth={2.25} />
            {tierIndex && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border-2 border-current text-[10px] font-extrabold flex items-center justify-center text-foreground">
                {tierIndex}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
            </div>
            <p className={`text-[11px] font-semibold mt-1.5 inline-block px-2.5 py-1 rounded-full ${theme.chip}`}>{tagline}</p>
          </div>
          {alias && AliasIcon && (
            <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-md ${theme.badge} text-white`}>
              <AliasIcon className="h-4 w-4" strokeWidth={2.5} />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">{alias.name}</span>
            </div>
          )}
          {valor > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Valor mensal</p>
              <p className={`text-xl font-extrabold bg-gradient-to-r ${theme.valueGrad} bg-clip-text text-transparent tabular-nums`}>{formatBRL(valor)}</p>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function SubTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Star className="h-3 w-3 text-primary fill-primary/30" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">{children}</p>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function Bullet({ children, color }: { children: React.ReactNode; color: string }) {
  const theme = TIER_THEMES[color];
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-relaxed group/b">
      <div className={`mt-0.5 shrink-0 rounded-full p-0.5 bg-background/80 shadow-sm transition-transform group-hover/b:scale-110`}>
        <CheckCircle2 className={`h-4 w-4 ${theme?.check ?? "text-primary"}`} strokeWidth={2.5} />
      </div>
      <span className="text-foreground/90">{children}</span>
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-background/80 backdrop-blur-sm px-3 py-2.5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-extrabold mt-0.5 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  );
}

function Comp({ icon: Icon, label, qtd, ativo }: { icon: React.ElementType; label: string; qtd: number; ativo: boolean }) {
  const enabled = qtd > 0 && ativo;
  return (
    <li className={`flex items-center justify-between rounded-xl border bg-background/80 backdrop-blur-sm px-3 py-2.5 transition-all hover:shadow-md hover:-translate-y-0.5 ${!enabled ? "opacity-50" : ""}`}>
      <span className="flex items-center gap-2.5 text-[12.5px] font-medium">
        <span className="rounded-lg p-1.5 bg-gradient-to-br from-sky-500/15 to-cyan-500/15 text-sky-600 dark:text-sky-300">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        {label}
      </span>
      <span className="text-sm font-extrabold tabular-nums">{formatNumber(qtd)}</span>
    </li>
  );
}

function RoutineList({
  items, accent, complexo,
}: {
  items: { id: string; grupo: string; rotina: string; freq: string; demanda: number }[];
  accent: string; complexo?: boolean;
}) {
  const theme = TIER_THEMES[accent];
  const totalDemanda = items.reduce((a, b) => a + b.demanda, 0);
  return (
    <div className="rounded-xl border bg-background/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <table className="w-full text-[11.5px]">
        <thead className={`bg-gradient-to-r ${theme?.bar ?? "from-primary to-primary"} text-white`}>
          <tr>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px]">Rotina</th>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-28">Frequência</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={i.id} className={`border-t ${idx % 2 ? "bg-muted/30" : ""} hover:bg-muted/50 transition-colors`}>
              <td className="px-3 py-2">
                <ListChecks className={`inline h-3.5 w-3.5 mr-1.5 ${theme?.check ?? "text-primary"}`} strokeWidth={2.5} />
                <span className="text-muted-foreground">{i.grupo} · </span><span className="font-medium">{i.rotina}</span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{i.freq}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40">
            <td className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]" colSpan={1}>
              Total previsto {complexo ? "(execuções/mês)" : "(chamados/mês)"}
            </td>
            <td className="px-3 py-2 text-right tabular-nums font-extrabold">{totalDemanda.toFixed(1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function N3HoursBox({
  total, consumidas, previstas, chamadosN3, tempoMedio, valorHora, modo, horasRotinas = 0, distribuicao,
}: {
  total: number; consumidas: number; previstas: number;
  chamadosN3: number; tempoMedio: number; valorHora: number;
  modo: "operation" | "performance";
  horasRotinas?: number;
  distribuicao?: { tam: number; owner: number; livre: number };
}) {
  const pctConsumido = total > 0 ? Math.min(100, (consumidas / total) * 100) : 0;
  const deficit = consumidas > total;
  const horasTam = distribuicao ? (total * distribuicao.tam) / 100 : 0;
  const horasOwner = distribuicao ? (total * distribuicao.owner) / 100 : 0;
  // Livre = sobra após chamados + TAM + Owner
  const horasLivre = distribuicao ? Math.max(0, total - consumidas - horasRotinas - horasTam - horasOwner) : 0;
  const pctChamados = total > 0 ? (consumidas / total) * 100 : 0;
  const pctRotinas = total > 0 ? (horasRotinas / total) * 100 : 0;
  const pctTam = distribuicao?.tam ?? 0;
  const pctOwner = distribuicao?.owner ?? 0;
  const pctLivre = total > 0 ? (horasLivre / total) * 100 : 0;
  const valorTotalVenda = total * valorHora;
  const livreNegativo = !!distribuicao && (consumidas + horasRotinas + horasTam + horasOwner) > total;

  return (
    <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm p-4 space-y-4 shadow-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl p-2 bg-gradient-to-br from-primary/20 to-primary/5">
            <Clock className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-extrabold">Horas N3 contratadas</p>
            <p className="text-[11px] text-muted-foreground">{formatNumber(total)}h/mês × {formatBRL(valorHora)}/h <span className="text-[9px] uppercase tracking-wider">(venda)</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Valor mensal</p>
          <p className="text-base font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tabular-nums">{formatBRL(valorTotalVenda)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Atendimento de chamados N3</span>
          <span>{formatNumber(consumidas, 1)}h ({pctConsumido.toFixed(0)}%)</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${deficit ? "bg-destructive" : pctConsumido > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pctConsumido}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatNumber(chamadosN3, 1)} chamados × {tempoMedio}h = {formatNumber(consumidas, 1)}h consumidas
        </p>
      </div>

      {modo === "operation" && (() => {
        const horasLivreOp = Math.max(0, total - consumidas - horasRotinas);
        const pctLivreOp = total > 0 ? (horasLivreOp / total) * 100 : 0;
        const estourado = consumidas + horasRotinas > total;
        return (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-foreground/80">Divisão de uso das horas N3</p>
            </div>
            <div className="flex h-7 w-full rounded-full overflow-hidden shadow-inner border bg-muted">
              {pctChamados > 0 && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctChamados)}%` }}>
                  {pctChamados >= 10 && `Chamados ${pctChamados.toFixed(0)}%`}
                </div>
              )}
              {pctRotinas > 0 && (
                <div className="bg-gradient-to-r from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctRotinas)}%` }}>
                  {pctRotinas >= 10 && `Rotinas ${pctRotinas.toFixed(0)}%`}
                </div>
              )}
              {pctLivreOp > 0 && (
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctLivreOp}%` }}>
                  {pctLivreOp >= 8 && `Horas Técnicas ${pctLivreOp.toFixed(0)}%`}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Horas Técnicas = Total contratado − Chamados N3 (funil) − Rotinas Operation
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <DistCard color="amber" pct={pctChamados} horas={consumidas} valor={consumidas * valorHora}
                titulo="Chamados" subtitulo="Atendimento reativo N3"
                desc="Tratamento de incidentes complexos escalados pelo funil de chamados." />
              <DistCard color="rose" pct={pctRotinas} horas={horasRotinas} valor={horasRotinas * valorHora}
                titulo="Rotinas" subtitulo="Rotinas Operation"
                desc="Horas consumidas pelas rotinas preventivas básicas, já cobradas dentro do pool de horas N3." />
              <DistCard color="violet" pct={pctLivreOp} horas={horasLivreOp} valor={horasLivreOp * valorHora}
                titulo="Horas Técnicas" subtitulo="Saldo disponível"
                desc="Horas remanescentes para projetos, mudanças e demandas pontuais." alerta={estourado} />
            </div>
            {estourado && (
              <div className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px]">
                <strong className="text-destructive">⚠ Horas Técnicas zeradas:</strong> Chamados N3 + Rotinas Operation já consomem todas as horas contratadas. Aumente o pacote de horas.
              </div>
            )}
          </div>
        );
      })()}

      {modo === "performance" && distribuicao && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-foreground/80">Divisão de uso das horas N3</p>
          </div>

          {/* Barra segmentada — chamados + TAM + Owner + Livre */}
          <div className="flex h-7 w-full rounded-full overflow-hidden shadow-inner border bg-muted">
            {pctChamados > 0 && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctChamados)}%` }}>
                {pctChamados >= 10 && `Chamados ${pctChamados.toFixed(0)}%`}
              </div>
            )}
            {pctRotinas > 0 && (
              <div className="bg-gradient-to-r from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${Math.min(100, pctRotinas)}%` }}>
                {pctRotinas >= 10 && `Rotinas ${pctRotinas.toFixed(0)}%`}
              </div>
            )}
            {pctTam > 0 && (
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctTam}%` }}>
                {pctTam >= 8 && `TAM ${pctTam}%`}
              </div>
            )}
            {pctOwner > 0 && (
              <div className="bg-gradient-to-r from-sky-400 to-sky-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctOwner}%` }}>
                {pctOwner >= 8 && `Owner ${pctOwner}%`}
              </div>
            )}
            {pctLivre > 0 && (
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ width: `${pctLivre}%` }}>
                {pctLivre >= 8 && `Horas Técnicas ${pctLivre.toFixed(0)}%`}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Horas Técnicas = Total contratado − Chamados N3 − Rotinas Performance − Horas TAM − Horas Owner
          </p>

          {/* Cards detalhados */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <DistCard color="amber" pct={pctChamados} horas={consumidas} valor={consumidas * valorHora}
              titulo="Chamados" subtitulo="Atendimento reativo N3"
              desc="Tratamento de incidentes complexos escalados pelo funil de chamados." />
            <DistCard color="rose" pct={pctRotinas} horas={horasRotinas} valor={horasRotinas * valorHora}
              titulo="Rotinas" subtitulo="Rotinas Performance"
              desc="Horas consumidas pelas rotinas preventivas Padrão/Complexo, já cobradas dentro do pool de horas N3." />
            <DistCard color="emerald" pct={pctTam} horas={horasTam} valor={horasTam * valorHora}
              titulo="TAM" subtitulo="Technical Account Manager"
              desc="Acompanhamento técnico, governança do contrato e relacionamento com o cliente." />
            <DistCard color="sky" pct={pctOwner} horas={horasOwner} valor={horasOwner * valorHora}
              titulo="Owner" subtitulo="Especialista dedicado"
              desc="Execução das rotinas preventivas e melhorias contínuas no ambiente." />
            <DistCard color="violet" pct={pctLivre} horas={horasLivre} valor={horasLivre * valorHora}
              titulo="Horas Técnicas" subtitulo="Saldo disponível"
              desc="Horas remanescentes para projetos, mudanças e demandas pontuais." alerta={livreNegativo} />
          </div>

          {livreNegativo && (
            <div className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px]">
              <strong className="text-destructive">⚠ Horas Técnicas zeradas:</strong> a soma de Chamados + Rotinas + TAM + Owner já consome todas as horas N3 contratadas. Considere ampliar o pacote ou reduzir os percentuais de TAM/Owner.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DistCard({
  color, pct, horas, valor, titulo, subtitulo, desc, alerta,
}: {
  color: "emerald" | "sky" | "violet" | "amber" | "rose";
  pct: number; horas: number; valor: number;
  titulo: string; subtitulo: string; desc: string; alerta?: boolean;
}) {
  const styles = {
    emerald: { bg: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20", border: "border-emerald-300/60 dark:border-emerald-700/60", dot: "bg-gradient-to-br from-emerald-400 to-emerald-600", text: "text-emerald-700 dark:text-emerald-300" },
    sky:     { bg: "from-sky-50 to-sky-100/50 dark:from-sky-950/40 dark:to-sky-900/20",                 border: "border-sky-300/60 dark:border-sky-700/60",         dot: "bg-gradient-to-br from-sky-400 to-sky-600",         text: "text-sky-700 dark:text-sky-300" },
    violet:  { bg: "from-violet-50 to-fuchsia-100/50 dark:from-violet-950/40 dark:to-fuchsia-900/20",   border: "border-violet-300/60 dark:border-violet-700/60",   dot: "bg-gradient-to-br from-violet-500 to-fuchsia-600",  text: "text-violet-700 dark:text-violet-300" },
    amber:   { bg: "from-amber-50 to-orange-100/50 dark:from-amber-950/40 dark:to-orange-900/20",       border: "border-amber-300/60 dark:border-amber-700/60",     dot: "bg-gradient-to-br from-amber-400 to-orange-500",    text: "text-amber-700 dark:text-amber-300" },
    rose:    { bg: "from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/20",             border: "border-rose-300/60 dark:border-rose-700/60",       dot: "bg-gradient-to-br from-rose-400 to-rose-600",       text: "text-rose-700 dark:text-rose-300" },
  }[color];
  const dimmed = pct === 0 && !alerta;
  return (
    <div className={`relative rounded-xl border-2 ${alerta ? "border-destructive/60" : styles.border} bg-gradient-to-br ${styles.bg} p-3 ${dimmed ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${styles.dot} shadow-sm`} />
          <p className={`text-sm font-extrabold ${styles.text}`}>{titulo}</p>
        </div>
        <span className={`text-[10px] font-extrabold ${styles.text} tabular-nums`}>{pct.toFixed(0)}%</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{subtitulo}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-lg font-extrabold tabular-nums">{formatNumber(horas, 1)}</span>
        <span className="text-[10px] text-muted-foreground font-semibold">h/mês</span>
      </div>
      <p className="text-[11px] font-bold tabular-nums text-foreground/80">{formatBRL(valor)}<span className="text-[9px] text-muted-foreground font-normal">/mês</span></p>
      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{desc}</p>
    </div>
  );
}
