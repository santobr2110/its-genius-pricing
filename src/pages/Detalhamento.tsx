import { useMemo } from "react";
import { useITSMContext } from "@/contexts/ITSMContext";
import SaveDefaultsButton from "@/components/SaveDefaultsButton";
import { formatNumber, formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Activity, Zap, Gauge, MapPin, Crown,
  Clock, ListChecks, CheckCircle2, Circle, Sparkles, Server, Network,
  Database, Shield, Rocket, TrendingUp, Wrench, Target, Star,
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

  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [n3Cortes] = usePersistentState<[number, number]>("gestao-ti:smartPerf:n3Cortes", [33, 66]);
  const [corteTam, corteOwner] = n3Cortes;
  const pctTam = corteTam;
  const pctOwner = Math.max(0, corteOwner - corteTam);
  const pctLivre = Math.max(0, 100 - corteOwner);
  const horasTotaisN3 = state.horasN3Mensais || 0;

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

  const filterRoutines = (oferta: "Operation" | "Performance", complexidade?: "Padrão" | "Complexo") =>
    rotinas
      .filter(r => r.oferta === oferta)
      .filter(r => oferta === "Performance" ? (r.complexidade ?? "Padrão") === complexidade : true)
      .filter(r => {
        const isMicro = r.grupo.toLowerCase().includes("microinform");
        if (isMicro) return state.tierFieldOperation;
        return true;
      })
      .map(r => {
        const rotina = normalizeOsRotina(r);
        const mult = rotinaMultiplicador(rotina, inv, complexFlags);
        return { id: r.id, grupo: r.grupo, rotina: r.rotina, freq: r.frequencia, demanda: r.chamadosMes * mult, mult };
      })
      .filter(i => i.demanda > 0);

  const rotinasOp = useMemo(() => filterRoutines("Operation"), [rotinas, state]);
  const rotinasPerfPadrao = useMemo(() => filterRoutines("Performance", "Padrão"), [rotinas, state]);
  const rotinasPerfComplexo = useMemo(() => filterRoutines("Performance", "Complexo"), [rotinas, state]);

  const horasAtendN3 = results.horasAtendimentoN3;
  const horasPrev = Math.max(0, horasTotaisN3 - horasAtendN3);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Detalhamento da Proposta</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SaveDefaultsButton />
            <SortableNav current="detalhamento" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
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
          valor={state.tierMonitor ? sm.total : 0}>
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
          valor={state.tierOperation ? results.custoN1 + results.custoN2 + (state.tierPerformance ? 0 : results.custoN3) : 0}>
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
              valorHora={state.valorHoraN3}
              modo="operation"
            />
          )}
        </TierBlock>

        {/* FIELD SERVICE */}
        {state.tierFieldOperation && (
          <TierBlock active={true} color="amber" icon={Wrench} tierIndex={3}
            title="Field Service" tagline="Suporte presencial onde o usuário precisa"
            valor={fs.total}>
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
          </TierBlock>
        )}

        {/* SMART PERFORMANCE */}
        <TierBlock active={state.tierPerformance} color="violet" icon={TrendingUp} tierIndex={4}
          title="Smart Performance" tagline="Rotinas preventivas avançadas e horas técnicas N3"
          valor={state.tierPerformance ? results.custoN3 : 0}>
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
              valorHora={state.valorHoraN3}
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
                <p className="mt-1 text-3xl md:text-4xl font-bold text-primary">{formatBRL(results.precoVendaMensal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Margem {state.margemLucro}% · Tributos {state.impostosTaxas}%
                </p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div><span className="text-muted-foreground">Anual: </span><strong>{formatBRL(results.precoVendaMensal * 12)}</strong></div>
                {state.qtdUsuarios > 0 && <div><span className="text-muted-foreground">Por usuário/mês: </span><strong>{formatBRL(results.precoVendaMensal / state.qtdUsuarios)}</strong></div>}
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
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Custo mensal</p>
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
  return <p className={`text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground ${className}`}>{children}</p>;
}

function Bullet({ children, color }: { children: React.ReactNode; color: string }) {
  const theme = TIER_THEMES[color];
  return (
    <li className="flex items-start gap-2 text-[12.5px] leading-snug">
      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${theme?.check ?? "text-primary"}`} />
      <span className="text-foreground/90">{children}</span>
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-background/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Comp({ icon: Icon, label, qtd, ativo }: { icon: React.ElementType; label: string; qtd: number; ativo: boolean }) {
  const enabled = qtd > 0 && ativo;
  return (
    <li className={`flex items-center justify-between rounded-lg border bg-background/70 px-3 py-2 ${!enabled ? "opacity-50" : ""}`}>
      <span className="flex items-center gap-2 text-[12px]">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums">{formatNumber(qtd)}</span>
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
    <div className="rounded-lg border bg-background/70 overflow-hidden">
      <table className="w-full text-[11.5px]">
        <thead className="bg-muted/60">
          <tr>
            <th className="text-left px-3 py-1.5 font-semibold">Rotina</th>
            <th className="text-left px-3 py-1.5 font-semibold w-28">Frequência</th>
            <th className="text-right px-3 py-1.5 font-semibold w-24">{complexo ? "Exec/mês" : "Ch/mês"}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-3 py-1.5">
                <ListChecks className={`inline h-3 w-3 mr-1 ${theme?.check ?? "text-primary"}`} />
                <span className="text-muted-foreground">{i.grupo} · </span>{i.rotina}
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">{i.freq}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{i.demanda.toFixed(1)}</td>
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
  const horasLivre = distribuicao ? (total * distribuicao.livre) / 100 : 0;

  return (
    <div className="mt-4 rounded-xl border bg-background/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Horas N3 contratadas: {formatNumber(total)}h/mês</p>
        </div>
        <span className="text-xs text-muted-foreground">{formatBRL(valorHora)}/h</span>
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
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Distribuição de uso das horas</p>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-1.5">
              <div className="text-muted-foreground">TAM · {distribuicao.tam}%</div>
              <div className="font-bold">{formatNumber(horasTam)}h</div>
              <div className="text-[10px] text-muted-foreground">Acompanhamento técnico</div>
            </div>
            <div className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-1.5">
              <div className="text-muted-foreground">Owner · {distribuicao.owner}%</div>
              <div className="font-bold">{formatNumber(horasOwner)}h</div>
              <div className="text-[10px] text-muted-foreground">Rotinas preventivas</div>
            </div>
            <div className="rounded bg-violet-500/10 border border-violet-500/30 px-2 py-1.5">
              <div className="text-muted-foreground">Livre · {distribuicao.livre}%</div>
              <div className="font-bold">{formatNumber(horasLivre)}h</div>
              <div className="text-[10px] text-muted-foreground">Demandas sob solicitação</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
