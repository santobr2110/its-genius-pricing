import { useITSMContext } from "@/contexts/ITSMContext";
import { formatNumber, formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ClipboardList, AlertTriangle, TrendingDown, Layers,
  Headphones, Eye, Truck, Server, Monitor, Wrench, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AreaData {
  nome: string;
  icon: React.ElementType;
  chamadosBrutos: number;
  chamadosN0: number;
  chamadosN1: number;
  chamadosN2: number;
  chamadosN3: number;
  custoN1: number;
  custoN2: number;
  custoN3: number;
  custoExtra: number;
  custoExtraLabel?: string;
}

function buildAreas(state: ITSMState, results: ITSMResults): AreaData[] {
  const n0Factor = state.reducaoN0 / 100;
  const humanFactor = 1 - n0Factor;

  // Raw calls per source
  const raw = {
    usuarios: results.chamadosUsuarios,
    servidores: results.chamadosServidores,
    rede: results.chamadosRede,
    bd: results.chamadosBancoDados,
    sistemas: results.chamadosSistemas,
  };

  // Helper: compute area breakdown from a set of raw call sources
  const buildArea = (sources: number[]): { bruto: number; n0: number; n1: number; n2: number; n3: number } => {
    const bruto = sources.reduce((a, b) => a + b, 0);
    const human = bruto * humanFactor;
    return {
      bruto,
      n0: bruto * n0Factor,
      n1: human * (state.percN1 / 100),
      n2: human * (state.percN2 / 100),
      n3: human * (state.percN3 / 100),
    };
  };

  // Cost allocation: proportional to call volume
  const totalBruto = results.volumeTotalBruto;
  const propCost = (areaBruto: number, levelCalls: number, totalLevelCalls: number, totalLevelCost: number) => {
    if (totalLevelCalls <= 0) return 0;
    return (levelCalls / totalLevelCalls) * totalLevelCost;
  };

  const totalN1 = results.volumeN1;
  const totalN2 = results.volumeN2;
  const totalN3 = results.volumeN3;

  // === Areas ===
  const centralServico = buildArea([raw.usuarios, raw.sistemas]);
  const monitoramento = buildArea([raw.servidores, raw.rede, raw.bd]);
  const fieldService = buildArea([raw.usuarios]);
  const gestaoInfra = buildArea([raw.servidores, raw.rede, raw.bd]);
  const gestaoSistemas = buildArea([raw.sistemas]);

  // Prevention hours cost (part of N3 budget, allocated to Gestão Infra)
  const custoHorasPreventivas = results.horasPrevencao > 0
    ? results.horasPrevencao * state.valorHoraN3
    : 0;

  // N3 cost for atendimento only (excluding prevention hours)
  const custoN3Atendimento = results.horasAtendimentoN3 * state.valorHoraN3;

  const areas: AreaData[] = [
    {
      nome: "Central de Serviço",
      icon: Headphones,
      chamadosBrutos: centralServico.bruto,
      chamadosN0: centralServico.n0,
      chamadosN1: centralServico.n1,
      chamadosN2: 0,
      chamadosN3: 0,
      custoN1: propCost(centralServico.bruto, centralServico.n1, totalN1, results.custoN1),
      custoN2: 0,
      custoN3: 0,
      custoExtra: 0,
    },
    {
      nome: "Monitoramento",
      icon: Eye,
      chamadosBrutos: monitoramento.bruto,
      chamadosN0: monitoramento.n0,
      chamadosN1: monitoramento.n1,
      chamadosN2: 0,
      chamadosN3: 0,
      custoN1: propCost(monitoramento.bruto, monitoramento.n1, totalN1, results.custoN1),
      custoN2: 0,
      custoN3: 0,
      custoExtra: 0,
    },
    {
      nome: "Field Service",
      icon: Truck,
      chamadosBrutos: fieldService.bruto,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: fieldService.n2,
      chamadosN3: fieldService.n3,
      custoN1: 0,
      custoN2: propCost(fieldService.bruto, fieldService.n2, totalN2, results.custoN2),
      custoN3: totalN3 > 0 ? (fieldService.n3 / totalN3) * custoN3Atendimento : 0,
      custoExtra: 0,
    },
    {
      nome: "Gestão Infra e Banco de Dados",
      icon: Server,
      chamadosBrutos: gestaoInfra.bruto,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: gestaoInfra.n2,
      chamadosN3: gestaoInfra.n3,
      custoN1: 0,
      custoN2: propCost(gestaoInfra.bruto, gestaoInfra.n2, totalN2, results.custoN2),
      custoN3: totalN3 > 0 ? (gestaoInfra.n3 / totalN3) * custoN3Atendimento : 0,
      custoExtra: custoHorasPreventivas,
      custoExtraLabel: "Rotinas p/ Prevenção",
    },
    {
      nome: "Gestão de Sistemas",
      icon: Monitor,
      chamadosBrutos: gestaoSistemas.bruto,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: gestaoSistemas.n2,
      chamadosN3: gestaoSistemas.n3,
      custoN1: 0,
      custoN2: propCost(gestaoSistemas.bruto, gestaoSistemas.n2, totalN2, results.custoN2),
      custoN3: totalN3 > 0 ? (gestaoSistemas.n3 / totalN3) * custoN3Atendimento : 0,
      custoExtra: 0,
    },
    {
      nome: "Custo de Ferramentas",
      icon: Wrench,
      chamadosBrutos: 0,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: 0,
      chamadosN3: 0,
      custoN1: 0,
      custoN2: 0,
      custoN3: 0,
      custoExtra: state.custoFixoFerramentas,
      custoExtraLabel: "Ferramentas",
    },
  ];

  return areas;
}

export default function Detalhamento() {
  const { state, results } = useITSMCalculator();
  const areas = buildAreas(state, results);
  const hasDeficit = results.horasPrevencao <= 0;

  const custoTotalAreas = areas.reduce((sum, a) => sum + a.custoN1 + a.custoN2 + a.custoN3 + a.custoExtra, 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-bold text-foreground">Detalhamento por Área</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Resumo Geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Chamados Brutos" value={formatNumber(results.volumeTotalBruto)} />
          <SummaryCard label="Evitados (N0)" value={formatNumber(results.chamadosResolvidosN0)} badge={`-${state.reducaoN0}%`} />
          <SummaryCard label="Atendimento Humano" value={formatNumber(results.volumeAtendimentoHumano)} />
          <SummaryCard label="Preço Sugerido" value={formatBRL(results.precoVendaMensal)} highlight />
        </div>

        {/* Distribuição do Funil por Área */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Distribuição do Funil por Área
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.filter(a => a.chamadosBrutos > 0).map((area) => {
                const totalHuman = area.chamadosN1 + area.chamadosN2 + area.chamadosN3;
                return (
                  <div key={area.nome} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <area.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{area.nome}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(area.chamadosBrutos)} brutos → {formatNumber(area.chamadosN0, 1)} N0 → {formatNumber(totalHuman, 1)} humanos
                    </div>
                    {/* Mini funnel bars */}
                    <div className="space-y-1.5">
                      {area.chamadosN1 > 0 && (
                        <FunnelBar label="N0/N1" value={area.chamadosN0 + area.chamadosN1} total={area.chamadosBrutos} color="bg-blue-500" />
                      )}
                      {area.chamadosN2 > 0 && (
                        <FunnelBar label="N2" value={area.chamadosN2} total={area.chamadosBrutos} color="bg-amber-500" />
                      )}
                      {area.chamadosN3 > 0 && (
                        <FunnelBar label="N3" value={area.chamadosN3} total={area.chamadosBrutos} color="bg-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chamados por Área */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Chamados por Área</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Área</TableHead>
                  <TableHead className="text-xs text-right">Brutos</TableHead>
                  <TableHead className="text-xs text-right">N0</TableHead>
                  <TableHead className="text-xs text-right">N1</TableHead>
                  <TableHead className="text-xs text-right">N2</TableHead>
                  <TableHead className="text-xs text-right">N3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.filter(a => a.chamadosBrutos > 0).map((area) => (
                  <TableRow key={area.nome}>
                    <TableCell className="text-sm py-3">
                      <span className="flex items-center gap-2">
                        <area.icon className="h-4 w-4 text-primary" />
                        {area.nome}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatNumber(area.chamadosBrutos)}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">{formatNumber(area.chamadosN0, 1)}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{area.chamadosN1 > 0 ? formatNumber(area.chamadosN1, 1) : "—"}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{area.chamadosN2 > 0 ? formatNumber(area.chamadosN2, 1) : "—"}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{area.chamadosN3 > 0 ? formatNumber(area.chamadosN3, 1) : "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell className="text-sm py-3">Total</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.volumeTotalBruto)}</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.chamadosResolvidosN0, 1)}</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.volumeN1, 1)}</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.volumeN2, 1)}</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.volumeN3, 1)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Análise N3 - Horas */}
        <Card className={hasDeficit ? "border-destructive/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Análise de Horas N3
              {hasDeficit && (
                <Badge variant="destructive" className="ml-auto gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  Deficit
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <MetricBox label="Horas Contratadas" value={`${formatNumber(results.horasN3)}h`} desc="Inserido no inventário" />
              <MetricBox label="Horas Consumidas" value={`${formatNumber(results.horasAtendimentoN3, 1)}h`} desc={`${formatNumber(results.volumeN3, 1)} chamados × ${state.tempoMedioChamadoN3}h`} />
              <MetricBox
                label="Horas p/ Prevenção"
                value={`${formatNumber(results.horasPrevencao, 1)}h`}
                desc={hasDeficit ? `Deficit de ${formatNumber(Math.abs(results.horasN3 - results.horasAtendimentoN3), 1)}h` : "Disponíveis para ações preventivas"}
                variant={hasDeficit ? "destructive" : "success"}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Consumo de horas N3</span>
                <span>{formatNumber(Math.min(100, (results.horasAtendimentoN3 / results.horasN3) * 100), 0)}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    results.horasAtendimentoN3 / results.horasN3 > 1
                      ? "bg-destructive"
                      : results.horasAtendimentoN3 / results.horasN3 > 0.8
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (results.horasAtendimentoN3 / results.horasN3) * 100)}%` }}
                />
              </div>
            </div>
            {hasDeficit && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Horas insuficientes para o volume projetado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aumente as horas N3 no inventário ou reduza a % do funil N3 para equilibrar.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Composição de Custos por Área */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Composição de Custos por Área
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Área</TableHead>
                  <TableHead className="text-xs text-right">N1</TableHead>
                  <TableHead className="text-xs text-right">N2</TableHead>
                  <TableHead className="text-xs text-right">N3</TableHead>
                  <TableHead className="text-xs text-right">Outros</TableHead>
                  <TableHead className="text-xs text-right">Total Área</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.map((area) => {
                  const totalArea = area.custoN1 + area.custoN2 + area.custoN3 + area.custoExtra;
                  if (totalArea <= 0) return null;
                  return (
                    <TableRow key={area.nome}>
                      <TableCell className="text-sm py-3">
                        <span className="flex items-center gap-2">
                          <area.icon className="h-4 w-4 text-primary" />
                          <span>
                            {area.nome}
                            {area.custoExtraLabel && (
                              <span className="block text-[10px] text-muted-foreground">{area.custoExtraLabel}</span>
                            )}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-right">{area.custoN1 > 0 ? formatBRL(area.custoN1) : "—"}</TableCell>
                      <TableCell className="text-sm text-right">{area.custoN2 > 0 ? formatBRL(area.custoN2) : "—"}</TableCell>
                      <TableCell className="text-sm text-right">{area.custoN3 > 0 ? formatBRL(area.custoN3) : "—"}</TableCell>
                      <TableCell className="text-sm text-right">{area.custoExtra > 0 ? formatBRL(area.custoExtra) : "—"}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{formatBRL(totalArea)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2">
                  <TableCell className="text-sm py-3 font-bold">Custo Total Operação</TableCell>
                  <TableCell colSpan={4} />
                  <TableCell className="text-sm text-right font-bold text-primary">{formatBRL(custoTotalAreas)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm py-3 font-bold">Preço de Venda</TableCell>
                  <TableCell colSpan={4} className="text-xs text-muted-foreground text-right">
                    Margem {state.margemLucro}% + Impostos {state.impostosTaxas}%
                  </TableCell>
                  <TableCell className="text-sm text-right font-bold text-primary">{formatBRL(results.precoVendaMensal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, badge, highlight }: { label: string; value: string; badge?: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={`text-lg font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
          {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const perc = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-8 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, perc)}%` }} />
      </div>
      <span className="text-[10px] w-10 text-right font-medium">{formatNumber(value, 1)}</span>
    </div>
  );
}

function MetricBox({ label, value, desc, variant }: { label: string; value: string; desc: string; variant?: "destructive" | "success" }) {
  return (
    <div className={`rounded-lg border p-4 ${
      variant === "destructive" ? "border-destructive/30 bg-destructive/5" :
      variant === "success" ? "border-emerald-500/30 bg-emerald-50/50" : ""
    }`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-1 ${
        variant === "destructive" ? "text-destructive" :
        variant === "success" ? "text-emerald-600" : "text-foreground"
      }`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}
