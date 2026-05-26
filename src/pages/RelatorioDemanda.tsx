import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Server, Network, Database, ShieldCheck, Monitor, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, Customized } from "recharts";
import { usePersistentState } from "@/hooks/usePersistentState";
import { ROTINAS_DEFAULT, rotinaMultiplicador, type ComplexFlags, type Rotina } from "@/data/rotinas";
import { useMemo } from "react";
import { ListChecks, GitBranch } from "lucide-react";
import {
  GMUDS_DEFAULT,
  bucketGmuds,
  computeGmud,
  type Gmud,
  type GmudComputed,
} from "@/data/gmuds";

interface TeamRow {
  name: string;
  origem: string;
  demanda: number;
  capacidade: number;
  custo: number;
}

function StatusBadge({ demanda, limite, capacidade }: { demanda: number; limite: number; capacidade: number }) {
  if (capacidade <= 0) return <Badge variant="outline">Sem capacidade</Badge>;
  if (demanda > limite) return <Badge variant="destructive">Excedido</Badge>;
  if (demanda > capacidade) return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">Acima do nominal</Badge>;
  return <Badge variant="secondary">OK</Badge>;
}

export default function RelatorioDemanda() {
  const { state, results } = useITSMContext();
  const limitePerc = state.percLimiteExcedente ?? 0;
  const fatorLimite = 1 + limitePerc / 100;

  // === Rotinas (CACs previstos por origem/ativo) ===
  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  // === GMUDs (demanda extra para N2/N3) ===
  const [gmuds] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);
  const gmudData = useMemo(() => {
    const input = {
      custoPorChamadoN2: results.custoPorChamadoN2,
      tempoMedioChamadoN3: state.tempoMedioChamadoN3,
      valorHoraN3: state.valorHoraN3,
      percN2: state.percGmudN2 ?? 70,
      percN3: state.percGmudN3 ?? 30,
    };
    const buckets = bucketGmuds(gmuds);
    const tierActive = (oferta: "operation" | "performance") =>
      oferta === "operation" ? state.tierOperation : state.tierPerformance;
    const build = (lista: Gmud[], camada: "operation" | "performance") => {
      if (!tierActive(camada)) return { items: [] as GmudComputed[], totals: { chamados: 0, chamadosN2: 0, chamadosN3: 0, horasN3: 0, custoN2: 0, custoN3: 0, custo: 0 }, camada };
      const items = lista.map((g) => computeGmud(g, input));
      const totals = items.reduce(
        (acc, i) => {
          acc.chamados += i.chamadosMes;
          acc.chamadosN2 += i.chamadosN2;
          acc.chamadosN3 += i.chamadosN3;
          acc.horasN3 += i.horasN3;
          acc.custoN2 += i.custoN2;
          acc.custoN3 += i.custoN3;
          acc.custo += i.custo;
          return acc;
        },
        { chamados: 0, chamadosN2: 0, chamadosN3: 0, horasN3: 0, custoN2: 0, custoN3: 0, custo: 0 },
      );
      return { items, totals, camada };
    };
    const operation = build(buckets.operation, "operation");
    const performance = build(buckets.performance, "performance");
    const totalChamadosN2 = operation.totals.chamadosN2 + performance.totals.chamadosN2;
    const totalChamadosN3 = operation.totals.chamadosN3 + performance.totals.chamadosN3;
    const totalHorasN3 = operation.totals.horasN3 + performance.totals.horasN3;
    const totalCustoN2 = operation.totals.custoN2 + performance.totals.custoN2;
    const totalCustoN3 = operation.totals.custoN3 + performance.totals.custoN3;
    return { operation, performance, totalChamadosN2, totalChamadosN3, totalHorasN3, totalCustoN2, totalCustoN3 };
  }, [gmuds, results.custoPorChamadoN2, state.tempoMedioChamadoN3, state.valorHoraN3, state.percGmudN2, state.percGmudN3, state.tierOperation, state.tierPerformance]);
  const gmudHasAny =
    gmudData.operation.items.length > 0 || gmudData.performance.items.length > 0;
  const rotinasPorAtivo = useMemo(() => {
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
    const buckets = {
      usuarios: { cac: 0, count: 0 },
      servidores: { cac: 0, count: 0 },
      rede: { cac: 0, count: 0 },
      bd: { cac: 0, count: 0 },
      firewall: { cac: 0, count: 0 },
      ambiente: { cac: 0, count: 0 },
    };
    let totalCac = 0;
    let totalRot = 0;
    rotinas.forEach((r) => {
      // normaliza Sistema Operacional como Ambiente/Servidor (mesma regra do SmartTiers)
      const grupoLower = r.grupo.toLowerCase();
      const isOs = grupoLower.includes("sistema operacional");
      const rNorm: Rotina = isOs
        ? { ...r, ativo: "Servidor", unidade: "Servidor (Ambiente)", abrangencia: "Ambiente" }
        : r;
      const mult = rotinaMultiplicador(rNorm, inv, complexFlags);
      if (mult <= 0) return;
      // Usa a demanda total da rotina em chamados/mês (mesma base do Smart Tiers),
      // e não o fator CAC (20%), para que o total bata com a aba de tiers.
      const cac = r.chamadosMes * mult;
      if (cac <= 0) return;
      const k: keyof typeof buckets =
        rNorm.ativo === "Servidor" ? "servidores"
        : rNorm.ativo === "Ativo de Rede" ? "rede"
        : rNorm.ativo === "Banco de Dados" ? "bd"
        : rNorm.ativo === "Firewall" ? "firewall"
        : rNorm.ativo === "Usuário" || rNorm.ativo === "Equipamento" ? "usuarios"
        : "ambiente";
      buckets[k].cac += cac;
      buckets[k].count += 1;
      totalCac += cac;
      totalRot += 1;
    });
    return { ...buckets, totalCac, totalRot };
  }, [rotinas, state]);

  // === Demanda por origem ===
  const usuariosBruto = results.chamadosUsuarios;
  const ativosBruto =
    results.chamadosServidores + results.chamadosRede +
    results.chamadosBancoDados + results.chamadosSistemas;
  const reducaoN0 = state.reducaoN0 / 100;
  const usuariosHumano = usuariosBruto * (1 - reducaoN0);
  const ativosHumano = ativosBruto * (1 - reducaoN0);

  // === Demanda por time (alocação efetiva conforme calculadora) ===
  const teamRows: TeamRow[] = [
    {
      name: "N1 — Suporte remoto",
      origem: results.fieldService.active ? "Ativos (funil)" : "Usuários + Ativos (funil)",
      demanda: results.volumeN1 + (results.fieldService.volumeTransbordoN1Remoto || 0) + (results.smartMonitor.chamadosAtivos * (state.percAlocacaoN1Monitor / 100)),
      capacidade: state.capacidadeChamadosN1,
      custo: results.custoN1 + results.smartMonitor.custoN1Alocado + (results.fieldService.custoTransbordoN1Remoto || 0) + (results.fieldService.custoTriagemN1 || 0),
    },
    {
      name: "N2 — Especialistas remotos",
      origem: gmudData.totalChamadosN2 > 0 ? "Funil (N2) + GMUDs" : "Funil (N2)",
      demanda: results.volumeN2 + gmudData.totalChamadosN2,
      capacidade: state.capacidadeChamadosN2,
      custo: results.custoN2 + gmudData.totalCustoN2,
    },
    {
      name: "N3 — Especialistas sêniores",
      origem: gmudData.totalChamadosN3 > 0 ? "Funil (N3) + horas avulsas + GMUDs" : "Funil (N3) + horas avulsas",
      demanda: results.volumeN3 + gmudData.totalChamadosN3,
      capacidade: state.tempoMedioChamadoN3 > 0 ? state.horasN3Mensais / state.tempoMedioChamadoN3 : 0,
      custo: results.custoN3 + gmudData.totalCustoN3,
    },
  ];

  if (results.fieldService.active) {
    teamRows.push(
      {
        name: "Field N1F",
        origem: "Usuários (presencial)",
        demanda: results.fieldService.volumeN1F,
        capacidade: state.capacidadeFieldN1,
        custo: results.fieldService.custoN1F,
      },
      {
        name: "Field N2F",
        origem: "Usuários (presencial)",
        demanda: results.fieldService.volumeN2F + (results.fieldService.volumeTransbordoN2F || 0),
        capacidade: state.capacidadeFieldN2,
        custo: results.fieldService.custoN2F + (results.fieldService.custoTransbordoN2F || 0),
      },
      {
        name: "Field N3F",
        origem: "Usuários (presencial)",
        demanda: results.fieldService.volumeN3F,
        capacidade: state.capacidadeFieldN3,
        custo: results.fieldService.custoN3F,
      },
    );
  }

  // === Custos por camada de oferta ===
  const custoEndpoint = state.custoFerramentaEndpoint * state.qtdEquipamentos;
  const custoProxies = (state.valorProxyInicial || 0) + (state.valorProxyAdicional || 0);
  const layerRows = [
    { layer: "Smart Monitor — monitoramento de ativos", custo: results.smartMonitor.custoMonitoramento },
    { layer: "Smart Monitor — N1 alocado (triagem)", custo: results.smartMonitor.custoN1Alocado },
    { layer: "Smart Monitor — N3 horas avulsas", custo: results.smartMonitor.custoN3 },
    { layer: "Service Desk — ferramenta end-point", custo: custoEndpoint },
    { layer: "Atendimento N1 (funil)", custo: results.custoN1 },
    { layer: "Atendimento N2 (funil)", custo: results.custoN2 },
    { layer: "Atendimento N3 (funil + prevenção)", custo: results.custoN3 },
    ...(gmudData.operation.totals.custo > 0
      ? [{ layer: "GMUDs — Smart Operation (N2 + N3)", custo: gmudData.operation.totals.custo }]
      : []),
    ...(gmudData.performance.totals.custo > 0
      ? [{ layer: "GMUDs — Performance (N2 + N3)", custo: gmudData.performance.totals.custo }]
      : []),
    { layer: "Field Service (N1F + N2F + N3F + transbordo + triagem)", custo: results.fieldService.total },
    { layer: "Proxies de monitoramento (informativo)", custo: custoProxies },
  ];
  const custoGmudTotal = gmudData.operation.totals.custo + gmudData.performance.totals.custo;
  const custoOperacaoTotal = results.custoTotalOperacao + custoGmudTotal;

  const origemRows = [
    { icon: Users, label: "Usuários (Service Desk)", bruto: usuariosBruto, humano: usuariosHumano, cac: rotinasPorAtivo.usuarios.cac, rotCount: rotinasPorAtivo.usuarios.count },
    { icon: Server, label: "Servidores", bruto: results.chamadosServidores, humano: results.chamadosServidores * (1 - reducaoN0), cac: rotinasPorAtivo.servidores.cac, rotCount: rotinasPorAtivo.servidores.count },
    { icon: Network, label: "Rede", bruto: results.chamadosRede, humano: results.chamadosRede * (1 - reducaoN0), cac: rotinasPorAtivo.rede.cac, rotCount: rotinasPorAtivo.rede.count },
    { icon: Database, label: "Banco de Dados", bruto: results.chamadosBancoDados, humano: results.chamadosBancoDados * (1 - reducaoN0), cac: rotinasPorAtivo.bd.cac, rotCount: rotinasPorAtivo.bd.count },
    { icon: ShieldCheck, label: "Firewall", bruto: results.chamadosSistemas, humano: results.chamadosSistemas * (1 - reducaoN0), cac: rotinasPorAtivo.firewall.cac, rotCount: rotinasPorAtivo.firewall.count },
  ];

  const totalBruto = results.volumeTotalBruto;
  const totalHumano = results.volumeAtendimentoHumano;

  const chartData = [
    ...origemRows.map((r) => ({
      origem: r.label.replace(" (Service Desk)", ""),
      prevista: Math.round(r.humano * 10) / 10,
      excedente: Math.round(r.humano * fatorLimite * 10) / 10,
    })),
    {
      origem: "Total geral",
      prevista: Math.round(totalHumano * 10) / 10,
      excedente: Math.round(totalHumano * fatorLimite * 10) / 10,
    },
  ];

  // === Distribuição N0/N1/N2/N3 — Previsão vs Cliente ===
  const clienteAtivos = state.semVolumesAtuais ? 0 : (state.volumeChamadosAtivosManual || 0);
  const clienteUsuarios = state.semVolumesAtuais ? 0 : (state.volumeChamadosUsuariosManual || 0);
  const clienteTotal = clienteAtivos + clienteUsuarios;
  // Aplica o mesmo funil (N0 + ratios N1/N2/N3) sobre o total informado pelo cliente
  const clienteN0 = clienteTotal * reducaoN0;
  const clienteHumano = clienteTotal - clienteN0;
  const humanoPrev = results.volumeAtendimentoHumano || 0;
  const ratioN1 = humanoPrev > 0 ? results.volumeN1 / humanoPrev : 0;
  const ratioN2 = humanoPrev > 0 ? results.volumeN2 / humanoPrev : 0;
  const ratioN3 = humanoPrev > 0 ? results.volumeN3 / humanoPrev : 0;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const distData = [
    { nivel: "N0 (automação)", previsto: round1(results.chamadosResolvidosN0), excedente: round1(results.chamadosResolvidosN0 * fatorLimite), cliente: round1(clienteN0) },
    { nivel: "N1", previsto: round1(results.volumeN1), excedente: round1(results.volumeN1 * fatorLimite), cliente: round1(clienteHumano * ratioN1) },
    { nivel: "N2", previsto: round1(results.volumeN2), excedente: round1(results.volumeN2 * fatorLimite), cliente: round1(clienteHumano * ratioN2) },
    { nivel: "N3", previsto: round1(results.volumeN3), excedente: round1(results.volumeN3 * fatorLimite), cliente: round1(clienteHumano * ratioN3) },
  ];

  // Renderiza linhas conectando a barra "cliente" → "previsto" com o % de redução
  const ReductionLines = (props: any) => {
    const items = props?.formattedGraphicalItems;
    if (!items) return null;
    const cliente = items.find((g: any) => g?.item?.props?.dataKey === "cliente");
    const previsto = items.find((g: any) => g?.item?.props?.dataKey === "previsto");
    if (!cliente || !previsto) return null;
    const cPts = cliente.props?.data || [];
    const pPts = previsto.props?.data || [];
    return (
      <g>
        {cPts.map((cp: any, i: number) => {
          const pp = pPts[i];
          if (!cp || !pp) return null;
          const cv = cp.value ?? cp.cliente;
          const pv = pp.value ?? pp.previsto;
          const x1 = cp.x + (cp.width || 0) / 2;
          const y1 = cp.y;
          const x2 = pp.x + (pp.width || 0) / 2;
          const y2 = pp.y;
          if (!isFinite(x1) || !isFinite(x2) || !isFinite(y1) || !isFinite(y2)) return null;
          if (!cv || cv <= 0) return null;
          const reduction = ((cv - pv) / cv) * 100;
          const midX = (x1 + x2) / 2;
          const midY = Math.min(y1, y2) - 8;
          const sign = reduction >= 0 ? "−" : "+";
          const label = `${sign}${Math.abs(reduction).toFixed(1)}%`;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--foreground))" strokeWidth={1.5} strokeDasharray="4 3" />
              <circle cx={x1} cy={y1} r={2.5} fill="hsl(var(--foreground))" />
              <circle cx={x2} cy={y2} r={2.5} fill="hsl(var(--foreground))" />
              <rect x={midX - 26} y={midY - 11} width={52} height={15} rx={3} fill="hsl(var(--background))" stroke="hsl(var(--border))" />
              <text x={midX} y={midY} textAnchor="middle" fontSize={10} fontWeight={600} fill="hsl(var(--foreground))">
                {label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Relatório de Demanda Operacional</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="relatorio-demanda" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Volume Bruto</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatNumber(results.volumeTotalBruto)}</p>
              <p className="text-xs text-muted-foreground">chamados/mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Resolvidos N0</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatNumber(results.chamadosResolvidosN0)}</p>
              <p className="text-xs text-muted-foreground">{state.reducaoN0}% de auto-resolução</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Atendimento Humano</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatNumber(results.volumeAtendimentoHumano)}</p>
              <p className="text-xs text-muted-foreground">chamados/mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Limite de excedente</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{limitePerc}%</p>
              <p className="text-xs text-muted-foreground">acima da capacidade nominal</p>
            </CardContent>
          </Card>
        </div>

        {/* === GRÁFICOS === */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição no funil — Previsão vs Cliente</CardTitle>
            <p className="text-xs text-muted-foreground">
              Volume informado pelo cliente ({formatNumber(clienteTotal, 1)} ch/mês{state.semVolumesAtuais ? " — não informado" : ""}) como base, e a previsão da calculadora e o limite com excedente (+{limitePerc}%) como metas contratuais por nível (N0, N1, N2, N3).
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nivel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    cursor={{ fill: "hsl(var(--foreground) / 0.05)" }}
                    formatter={(v: number) => formatNumber(v, 1)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="cliente" name="Cliente (inventário) — base" fill="hsl(0 75% 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="previsto" name="Previsão (calculadora) — meta" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="excedente" name={`Com excedente (+${limitePerc}%) — teto contratual`} fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
                  <Customized component={ReductionLines} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demanda prevista vs com excedente</CardTitle>
            <p className="text-xs text-muted-foreground">
              Demanda prevista (após N0) vs demanda prevista com excedente (+{limitePerc}%) — chamados/mês.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="origem" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    cursor={{ fill: "hsl(var(--foreground) / 0.05)" }}
                    formatter={(v: number) => formatNumber(v, 1)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="prevista" name="Demanda prevista" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="excedente" name={`Com excedente (+${limitePerc}%)`} fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Demanda por origem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demanda por origem</CardTitle>
            <p className="text-xs text-muted-foreground">
              Separação entre <span className="font-medium">incidentes</span> que cada ativo gera por existir (volume bruto e após auto-resolução N0) e os <span className="font-medium text-primary">chamados de rotina/CAC</span> previstos para o mesmo ativo. O <span className="font-medium">Total previsto</span> soma incidentes (após N0) + rotinas.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Incidentes do ativo<br/><span className="text-[10px] font-normal text-muted-foreground">bruto (ch/mês)</span></TableHead>
                  <TableHead className="text-right">Resolvidos N0<br/><span className="text-[10px] font-normal text-muted-foreground">automação ({state.reducaoN0}%)</span></TableHead>
                  <TableHead className="text-right">Incidentes após N0<br/><span className="text-[10px] font-normal text-muted-foreground">ch/mês</span></TableHead>
                  <TableHead className="text-right text-primary">Rotinas<br/><span className="text-[10px] font-normal text-muted-foreground">ch/mês</span></TableHead>
                  <TableHead className="text-right">Total previsto<br/><span className="text-[10px] font-normal text-muted-foreground">após N0 + rotinas</span></TableHead>
                  <TableHead className="text-right">% do total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {origemRows.map(({ icon: Icon, label, bruto, humano, cac, rotCount }) => {
                  const totalPrev = humano + cac;
                  const totalGeralPrev = totalHumano + rotinasPorAtivo.totalCac;
                  const n0 = bruto - humano;
                  return (
                  <TableRow key={label} className={cac > 0 ? "bg-primary/5" : undefined}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" /> {label}
                        {cac > 0 && (
                          <Badge variant="secondary" className="ml-1 gap-1 text-[10px] font-normal">
                            <ListChecks className="h-3 w-3" /> rotinas
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(bruto, 1)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatNumber(n0, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(humano, 1)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${cac > 0 ? "font-medium text-primary" : "text-muted-foreground"}`}>
                      {cac > 0 ? (
                        <span title={`${rotCount} rotina(s) ativa(s)`}>{formatNumber(cac, 2)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatNumber(totalPrev, 1)}</TableCell>
                    <TableCell className="text-right">{totalGeralPrev > 0 ? ((totalPrev / totalGeralPrev) * 100).toFixed(1) : "0"}%</TableCell>
                  </TableRow>
                  );
                })}
                {rotinasPorAtivo.ambiente.cac > 0 && (
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-primary" /> Rotinas de ambiente (não atreladas a inventário)
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-primary">{formatNumber(rotinasPorAtivo.ambiente.cac, 2)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatNumber(rotinasPorAtivo.ambiente.cac, 2)}</TableCell>
                    <TableCell className="text-right">{(totalHumano + rotinasPorAtivo.totalCac) > 0 ? ((rotinasPorAtivo.ambiente.cac / (totalHumano + rotinasPorAtivo.totalCac)) * 100).toFixed(1) : "0"}%</TableCell>
                  </TableRow>
                )}
                <TableRow className="font-bold border-t-2 bg-muted/30">
                  <TableCell>Total Geral</TableCell>
                  <TableCell className="text-right">{formatNumber(totalBruto, 1)}</TableCell>
                  <TableCell className="text-right">{formatNumber(totalBruto - totalHumano, 1)}</TableCell>
                  <TableCell className="text-right">{formatNumber(totalHumano, 1)}</TableCell>
                  <TableCell className="text-right tabular-nums text-primary">{formatNumber(rotinasPorAtivo.totalCac, 2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(totalHumano + rotinasPorAtivo.totalCac, 1)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
                <TableRow className="text-xs text-muted-foreground bg-muted/10">
                  <TableCell className="font-medium">Composição do total previsto</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">
                    {(totalHumano + rotinasPorAtivo.totalCac) > 0 ? ((totalHumano / (totalHumano + rotinasPorAtivo.totalCac)) * 100).toFixed(1) : "0"}%
                    <span className="ml-1 opacity-70">incidentes</span>
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    {(totalHumano + rotinasPorAtivo.totalCac) > 0 ? ((rotinasPorAtivo.totalCac / (totalHumano + rotinasPorAtivo.totalCac)) * 100).toFixed(1) : "0"}%
                    <span className="ml-1 opacity-70">rotinas</span>
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Distribuição por time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por time de atendimento</CardTitle>
            <p className="text-xs text-muted-foreground">
              Demanda alocada vs capacidade nominal. Limite com excedente = capacidade × (1 + {limitePerc}%).
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Demanda (ch/mês)</TableHead>
                  <TableHead className="text-right">Capacidade</TableHead>
                  <TableHead className="text-right">Limite com excedente</TableHead>
                  <TableHead className="text-right">Ocupação</TableHead>
                  <TableHead className="text-right">Custo (R$/mês)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamRows.map((r) => {
                  const limite = r.capacidade * fatorLimite;
                  const ocupacao = r.capacidade > 0 ? (r.demanda / r.capacidade) * 100 : 0;
                  return (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.origem}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.demanda, 1)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.capacidade, 1)}</TableCell>
                      <TableCell className="text-right">{formatNumber(limite, 1)}</TableCell>
                      <TableCell className="text-right">{ocupacao.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatBRL(r.custo)}</TableCell>
                      <TableCell><StatusBadge demanda={r.demanda} limite={limite} capacidade={r.capacidade} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Custos por camada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por camada de atendimento</CardTitle>
            <p className="text-xs text-muted-foreground">Composição mensal do custo total da operação.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camada</TableHead>
                  <TableHead className="text-right">Custo (R$/mês)</TableHead>
                  <TableHead className="text-right">% do total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {layerRows.map((r) => (
                  <TableRow key={r.layer}>
                    <TableCell className="font-medium">{r.layer}</TableCell>
                    <TableCell className="text-right">{formatBRL(r.custo)}</TableCell>
                    <TableCell className="text-right">{custoOperacaoTotal > 0 ? ((r.custo / custoOperacaoTotal) * 100).toFixed(1) : "0"}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-t-2">
                  <TableCell>Total custo da operação</TableCell>
                  <TableCell className="text-right">{formatBRL(custoOperacaoTotal)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Camadas ativas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: "Smart Monitor", on: state.tierMonitor, icon: Monitor },
            { label: "Smart Operation", on: state.tierOperation, icon: Server },
            { label: "Performance", on: state.tierPerformance, icon: Server },
            { label: "Enterprise", on: state.tierEnterprise, icon: Server },
            { label: "Field Service", on: state.tierFieldOperation, icon: MapPin },
          ].map(({ label, on, icon: Icon }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${on ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/30 text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
              <span className="ml-auto font-medium">{on ? "ON" : "off"}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}