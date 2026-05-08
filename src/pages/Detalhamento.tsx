import { useMemo } from "react";
import { useITSMContext } from "@/contexts/ITSMContext";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import { formatNumber, formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Crown,
  Clock, ListChecks, CheckCircle2, Circle, Sparkles, Server, Network,
  Database, Shield, Rocket, TrendingUp, Wrench, Star, Activity, FileDown,
} from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  ROTINAS_DEFAULT, rotinaMultiplicador, COMPLEX_FLAG_KEYS,
  type ComplexFlags, type Rotina,
} from "@/data/rotinas";

function normalizeOsRotina(r: Rotina): Rotina {
  const isOs = r.grupo.toLowerCase().includes("sistema operacional");
  if (!isOs) return r;
  return { ...r, ativo: "Servidor", unidade: "Servidor (Ambiente)", abrangencia: "Ambiente" };
}

const TIER_THEMES: Record<string, { ring: string; bg: string; chip: string; icon: string; bar: string; badge: string; check: string; glow: string; valueGrad: string; blob1: string; blob2: string }> = {
  sky:     { ring: "border-sky-300/70 dark:border-sky-600/60",      bg: "from-sky-100/80 via-card to-cyan-50/40 dark:from-sky-950/50 dark:via-card dark:to-cyan-950/20",          chip: "bg-gradient-to-r from-sky-500/20 to-cyan-500/20 text-sky-700 dark:text-sky-300",         icon: "bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-600 text-white",        bar: "from-sky-400 via-cyan-400 to-sky-600",        badge: "bg-gradient-to-r from-sky-500 to-cyan-500",     check: "text-sky-600 dark:text-sky-400", glow: "shadow-sky-500/30", valueGrad: "from-sky-600 to-cyan-600 dark:from-sky-300 dark:to-cyan-300", blob1: "bg-sky-400/30", blob2: "bg-cyan-400/20" },
  emerald: { ring: "border-emerald-300/70 dark:border-emerald-600/60", bg: "from-emerald-100/80 via-card to-teal-50/40 dark:from-emerald-950/50 dark:via-card dark:to-teal-950/20", chip: "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300", icon: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white", bar: "from-emerald-400 via-teal-400 to-emerald-600", badge: "bg-gradient-to-r from-emerald-500 to-teal-500", check: "text-emerald-600 dark:text-emerald-400", glow: "shadow-emerald-500/30", valueGrad: "from-emerald-600 to-teal-600 dark:from-emerald-300 dark:to-teal-300", blob1: "bg-emerald-400/30", blob2: "bg-teal-400/20" },
  amber:   { ring: "border-amber-300/70 dark:border-amber-600/60",  bg: "from-amber-100/80 via-card to-orange-50/40 dark:from-amber-950/50 dark:via-card dark:to-orange-950/20",  chip: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300",   icon: "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white",  bar: "from-amber-400 via-orange-400 to-rose-500",   badge: "bg-gradient-to-r from-amber-500 to-orange-500",   check: "text-amber-600 dark:text-amber-400", glow: "shadow-amber-500/30", valueGrad: "from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300", blob1: "bg-amber-400/30", blob2: "bg-orange-400/20" },
  violet:  { ring: "border-violet-300/70 dark:border-violet-600/60", bg: "from-violet-100/80 via-card to-fuchsia-50/40 dark:from-violet-950/50 dark:via-card dark:to-fuchsia-950/20", chip: "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-700 dark:text-violet-300", icon: "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 text-white", bar: "from-violet-500 via-purple-500 to-fuchsia-600", badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",  check: "text-violet-600 dark:text-violet-400", glow: "shadow-violet-500/30", valueGrad: "from-violet-600 to-fuchsia-600 dark:from-violet-300 dark:to-fuchsia-300", blob1: "bg-violet-400/30", blob2: "bg-fuchsia-400/20" },
  rose:    { ring: "border-rose-300/70 dark:border-rose-600/60",    bg: "from-rose-100/80 via-card to-pink-50/40 dark:from-rose-950/50 dark:via-card dark:to-pink-950/20",    chip: "bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-700 dark:text-rose-300",      icon: "bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-600 text-white",     bar: "from-rose-400 via-pink-500 to-fuchsia-500",      badge: "bg-gradient-to-r from-rose-500 to-pink-500",    check: "text-rose-600 dark:text-rose-400", glow: "shadow-rose-500/30", valueGrad: "from-rose-600 to-pink-600 dark:from-rose-300 dark:to-pink-300", blob1: "bg-rose-400/30", blob2: "bg-pink-400/20" },
};

export default function Detalhamento() {
  const { state, results } = useITSMContext();
  const sm = results.smartMonitor;
  const fs = results.fieldService;

  const handleExportPDF = async () => {
    const el = document.getElementById("proposicao-printable");
    if (!el) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `proposicao-smart-ito-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };
    await html2pdf().set(opt).from(el).save();
  };

  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [n3Cortes] = usePersistentState<[number, number]>("gestao-ti:smartPerf:n3Cortes", [33, 66]);
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
      // Microinformática é exibida no bloco Field Service
      .filter(r => !r.grupo.toLowerCase().includes("microinform"))
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
    if (!state.tierFieldOperation) return [];
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

  // Valores de venda por camada (alinhados ao painel principal)
  const toSell = (c: number) => c * fatorVenda;
  const valorMonitor = state.tierMonitor ? toSell(sm.total) : 0;
  const custoOperacaoBase =
    results.custoN1 + results.custoN2 + (state.tierPerformance ? 0 : results.custoN3);
  const valorFieldService = state.tierFieldOperation
    ? toSell(fs.total) + toSell(custoRotinasField)
    : 0;
  const valorOperation = state.tierOperation
    ? toSell(custoOperacaoBase) + toSell(custoRotinasOp) + valorFieldService
    : 0;
  const valorPerformance = state.tierPerformance
    ? toSell(results.custoN3) + toSell(custoRotinasPerfPadrao) + toSell(custoRotinasPerfComplexo)
    : 0;
  const investimentoTotal = valorMonitor + valorOperation + valorPerformance;

  const horasAtendN3 = results.horasAtendimentoN3;
  const horasPrev = Math.max(0, horasTotaisN3 - horasAtendN3);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Proposição</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
            <SaveDefaultsButton />
            <SortableNav current="detalhamento" />
          </div>
        </div>
      </header>

      <main id="proposicao-printable" className="mx-auto max-w-5xl p-6 space-y-6">
        <section className="text-center pt-2 pb-1">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-3 py-1 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Proposta Comercial</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            Proposição de Smart ITO
          </h1>
          <p className="text-sm text-muted-foreground mt-3">Detalhamento por camada da oferta</p>
          <div className="mt-4 h-1 w-24 mx-auto rounded-full bg-gradient-to-r from-primary to-accent" />
        </section>

        {/* SMART MONITOR */}
        <TierBlock active={state.tierMonitor} color="sky" icon={Activity} tierIndex={1}
          title="Smart Monitor" tagline="Monitoramento proativo da infraestrutura"
          valor={valorMonitor}>
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
          {!state.tierOperation && state.horasN3Monitor > 0 && (
            <div className="mt-3 rounded border bg-background/70 p-3 text-xs">
              <strong>{formatNumber(state.horasN3Monitor)}h</strong> de N3 opcional
              · {formatBRL(state.valorHoraN3)}/h — para tratamento de incidentes detectados pelo monitoramento.
            </div>
          )}
        </TierBlock>

        {/* SMART OPERATION */}
        <TierBlock active={state.tierOperation} color="emerald" icon={Rocket} tierIndex={2}
          title="Smart Operation" tagline="Service Desk humano N1 e N2 com rotinas básicas"
          valor={valorOperation}>
          <SubTitle>O que está incluído</SubTitle>
          <ul className="space-y-1.5">
            <Bullet color="emerald">Funil N1 ({state.percN1}%) e N2 ({state.percN2}%) reativo com SLA controlado</Bullet>
            <Bullet color="emerald">Triagem técnica e roteamento dos chamados</Bullet>
            <Bullet color="emerald">Rotinas preventivas básicas (Operation)</Bullet>
            <Bullet color="emerald">Indicadores e relatórios mensais</Bullet>
            {!state.tierPerformance && (
              <Bullet color="emerald">Atendimento N3 contratado em horas ({formatNumber(state.horasN3Mensais)}h/mês)</Bullet>
            )}
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <Stat label="Volume N1" value={`${formatNumber(results.volumeN1, 1)} ch/mês`} />
            <Stat label="Volume N2" value={`${formatNumber(results.volumeN2, 1)} ch/mês`} />
            <Stat label="Custo/chamado N1" value={formatBRL(results.custoPorChamadoN1)} />
          </div>

          {rotinasOp.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas preventivas básicas ({rotinasOp.length})</SubTitle>
              <RoutineList items={rotinasOp} accent="emerald" />
            </>
          )}

          {!state.tierPerformance && state.horasN3Mensais > 0 && (
            <N3HoursBox
              total={state.horasN3Mensais}
              consumidas={horasAtendN3}
              previstas={horasPrev}
              chamadosN3={results.volumeN3}
              tempoMedio={state.tempoMedioChamadoN3}
              valorHora={valorHoraN3Venda}
              modo="operation"
            />
          )}
        </TierBlock>

        {/* FIELD SERVICE */}
        {state.tierFieldOperation && (
          <TierBlock active={true} color="amber" icon={Wrench} tierIndex={3}
            title="Field Service" tagline="Suporte presencial onde o usuário precisa"
            valor={valorFieldService}>
            <SubTitle>Equipe presencial alocada</SubTitle>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="N1F" value={`${state.fieldDirectQtdN1} prof.`} sub={formatBRL(fs.custoN1F)} />
              <Stat label="N2F" value={`${state.fieldDirectQtdN2} prof.`} sub={formatBRL(fs.custoN2F)} />
              <Stat label="N3F" value={`${state.fieldDirectQtdN3} prof.`} sub={formatBRL(fs.custoN3F)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <Stat label="Equipamentos cobertos" value={formatNumber(state.qtdEquipamentos)} />
              <Stat label="Chamados escalados ao Field" value={`${formatNumber(fs.volumeUsuariosEscalado, 1)}/mês`} />
            </div>
            {fs.overflowAtivo && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-100/40 dark:bg-amber-900/20 p-3 text-xs">
                <strong>Transbordo ativo:</strong> {formatNumber(fs.volumeTransbordoN1Remoto, 1)} ch/mês excedem capacidade presencial e são tratados via N1 remoto + N2F.
              </div>
            )}
            {rotinasField.length > 0 && (
              <>
                <SubTitle className="mt-4">Rotinas Field — Microinformática ({rotinasField.length})</SubTitle>
                <RoutineList items={rotinasField} accent="amber" />
              </>
            )}
          </TierBlock>
        )}

        {/* SMART PERFORMANCE */}
        <TierBlock active={state.tierPerformance} color="violet" icon={TrendingUp} tierIndex={4}
          title="Smart Performance" tagline="Rotinas preventivas avançadas e horas técnicas N3"
          valor={valorPerformance}>
          <SubTitle>O que está incluído</SubTitle>
          <ul className="space-y-1.5">
            <Bullet color="violet">Rotinas preventivas avançadas executadas pelo N3</Bullet>
            <Bullet color="violet">Cobertura de ambientes complexos (HA, multi-site, 24x7, ERP)</Bullet>
            <Bullet color="violet">Otimização contínua de performance e capacidade</Bullet>
            <Bullet color="violet">Horas técnicas N3 dedicadas ao cliente</Bullet>
          </ul>

          {rotinasPerfPadrao.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Performance — Ambiente Padrão ({rotinasPerfPadrao.length})</SubTitle>
              <RoutineList items={rotinasPerfPadrao} accent="violet" />
            </>
          )}

          {algumComplexAtivo && rotinasPerfComplexo.length > 0 && (
            <>
              <SubTitle className="mt-4">Rotinas Performance — Ambiente Complexo ({rotinasPerfComplexo.length})</SubTitle>
              <RoutineList items={rotinasPerfComplexo} accent="violet" complexo />
            </>
          )}

          {state.tierPerformance && state.horasN3Mensais > 0 && (
            <N3HoursBox
              total={state.horasN3Mensais}
              consumidas={horasAtendN3}
              previstas={horasPrev}
              chamadosN3={results.volumeN3}
              tempoMedio={state.tempoMedioChamadoN3}
              valorHora={valorHoraN3Venda}
              modo="performance"
              distribuicao={{ tam: pctTam, owner: pctOwner, livre: pctLivre }}
            />
          )}
        </TierBlock>

        {/* SMART ENTERPRISE */}
        <TierBlock active={state.tierEnterprise} color="rose" icon={Crown} tierIndex={5}
          title="Smart Enterprise" tagline="Governança e visão executiva da TI" valor={0}>
          <SubTitle>O que está incluído</SubTitle>
          <ul className="space-y-1.5">
            <Bullet color="rose">Gestão estratégica e roadmap tecnológico</Bullet>
            <Bullet color="rose">Comitê executivo e governança de mudanças (GMUDs)</Bullet>
            <Bullet color="rose">Alinhamento contínuo entre TI e negócio</Bullet>
          </ul>
        </TierBlock>

        {/* INVESTIMENTO */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Investimento Mensal Total</p>
                <p className="mt-1 text-3xl md:text-4xl font-bold text-primary">{formatBRL(investimentoTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Margem {state.margemLucro}% · Tributos {state.impostosTaxas}%
                </p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div><span className="text-muted-foreground">Anual: </span><strong>{formatBRL(investimentoTotal * 12)}</strong></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

/* ===== Subcomponents ===== */

function TierBlock({
  active, color, icon: Icon, title, tagline, valor, children, tierIndex,
}: {
  active: boolean; color: string; icon: React.ElementType;
  title: string; tagline: string; valor: number;
  tierIndex?: number; children?: React.ReactNode;
}) {
  const theme = TIER_THEMES[color] ?? TIER_THEMES.emerald;
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
        </div>
      </div>
    );
  }
  return (
    <div className={`group relative overflow-hidden rounded-3xl border-2 ${theme.ring} bg-gradient-to-br ${theme.bg} shadow-xl ${theme.glow} transition-all hover:shadow-2xl`}>
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
              <span className={`inline-flex items-center gap-1 ${theme.badge} text-white text-[9px] font-extrabold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full shadow-md`}>
                <Sparkles className="h-3 w-3" /> Incluído
              </span>
            </div>
            <p className={`text-[11px] font-semibold mt-1.5 inline-block px-2.5 py-1 rounded-full ${theme.chip}`}>{tagline}</p>
          </div>
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
  return (
    <div className="rounded-xl border bg-background/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <table className="w-full text-[11.5px]">
        <thead className={`bg-gradient-to-r ${theme?.bar ?? "from-primary to-primary"} text-white`}>
          <tr>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px]">Rotina</th>
            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-28">Frequência</th>
            <th className="text-right px-3 py-2 font-bold uppercase tracking-wider text-[10px] w-24">{complexo ? "Exec/mês" : "Ch/mês"}</th>
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
              <td className="px-3 py-2 text-right tabular-nums font-extrabold">{i.demanda.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function N3HoursBox({
  total, consumidas, previstas, chamadosN3, tempoMedio, valorHora, modo, distribuicao,
}: {
  total: number; consumidas: number; previstas: number;
  chamadosN3: number; tempoMedio: number; valorHora: number;
  modo: "operation" | "performance";
  distribuicao?: { tam: number; owner: number; livre: number };
}) {
  const pctConsumido = total > 0 ? Math.min(100, (consumidas / total) * 100) : 0;
  const deficit = consumidas > total;
  const horasTam = distribuicao ? (total * distribuicao.tam) / 100 : 0;
  const horasOwner = distribuicao ? (total * distribuicao.owner) / 100 : 0;
  // Livre = sobra após chamados + TAM + Owner
  const horasLivre = distribuicao ? Math.max(0, total - consumidas - horasTam - horasOwner) : 0;
  const pctChamados = total > 0 ? (consumidas / total) * 100 : 0;
  const pctTam = distribuicao?.tam ?? 0;
  const pctOwner = distribuicao?.owner ?? 0;
  const pctLivre = total > 0 ? (horasLivre / total) * 100 : 0;
  const valorTotalVenda = total * valorHora;
  const livreNegativo = distribuicao && (consumidas + horasTam + horasOwner) > total;

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

      {modo === "operation" && (
        <div className="rounded border bg-card px-3 py-2 text-xs">
          <strong className={deficit ? "text-destructive" : "text-emerald-600"}>
            {deficit ? `Deficit de ${formatNumber(Math.abs(previstas), 1)}h` : `${formatNumber(previstas, 1)}h restantes`}
          </strong>
          {" — "}{deficit ? "aumente as horas N3 ou reduza % do funil para N3." : "disponíveis para tratamento de incidentes complexos."}
        </div>
      )}

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
                {pctLivre >= 8 && `Livre ${pctLivre.toFixed(0)}%`}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Livre = Total contratado − Chamados N3 − Horas TAM − Horas Owner
          </p>

          {/* Cards detalhados */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <DistCard color="amber" pct={pctChamados} horas={consumidas} valor={consumidas * valorHora}
              titulo="Chamados" subtitulo="Atendimento reativo N3"
              desc="Tratamento de incidentes complexos escalados pelo funil de chamados." />
            <DistCard color="emerald" pct={pctTam} horas={horasTam} valor={horasTam * valorHora}
              titulo="TAM" subtitulo="Technical Account Manager"
              desc="Acompanhamento técnico, governança do contrato e relacionamento com o cliente." />
            <DistCard color="sky" pct={pctOwner} horas={horasOwner} valor={horasOwner * valorHora}
              titulo="Owner" subtitulo="Especialista dedicado"
              desc="Execução das rotinas preventivas e melhorias contínuas no ambiente." />
            <DistCard color="violet" pct={pctLivre} horas={horasLivre} valor={horasLivre * valorHora}
              titulo="Livre" subtitulo="Saldo disponível"
              desc="Horas remanescentes para projetos, mudanças e demandas pontuais." alerta={livreNegativo} />
          </div>

          {livreNegativo && (
            <div className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px]">
              <strong className="text-destructive">⚠ Saldo livre zerado:</strong> a soma de Chamados + TAM + Owner já consome todas as horas N3 contratadas. Considere ampliar o pacote ou reduzir os percentuais de TAM/Owner.
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
  color: "emerald" | "sky" | "violet" | "amber";
  pct: number; horas: number; valor: number;
  titulo: string; subtitulo: string; desc: string; alerta?: boolean;
}) {
  const styles = {
    emerald: { bg: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20", border: "border-emerald-300/60 dark:border-emerald-700/60", dot: "bg-gradient-to-br from-emerald-400 to-emerald-600", text: "text-emerald-700 dark:text-emerald-300" },
    sky:     { bg: "from-sky-50 to-sky-100/50 dark:from-sky-950/40 dark:to-sky-900/20",                 border: "border-sky-300/60 dark:border-sky-700/60",         dot: "bg-gradient-to-br from-sky-400 to-sky-600",         text: "text-sky-700 dark:text-sky-300" },
    violet:  { bg: "from-violet-50 to-fuchsia-100/50 dark:from-violet-950/40 dark:to-fuchsia-900/20",   border: "border-violet-300/60 dark:border-violet-700/60",   dot: "bg-gradient-to-br from-violet-500 to-fuchsia-600",  text: "text-violet-700 dark:text-violet-300" },
    amber:   { bg: "from-amber-50 to-orange-100/50 dark:from-amber-950/40 dark:to-orange-900/20",       border: "border-amber-300/60 dark:border-amber-700/60",     dot: "bg-gradient-to-br from-amber-400 to-orange-500",    text: "text-amber-700 dark:text-amber-300" },
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
