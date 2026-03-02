import { useITSMCalculator, formatNumber, formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ClipboardList, AlertTriangle, TrendingDown, Layers, Server, Users, Network, Database, Monitor, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Detalhamento() {
  const { state, results } = useITSMCalculator();

  const chamadosN3PorCategoria = [
    { label: "Usuários", icon: Users, color: "text-blue-500", chamados: results.chamadosUsuarios, n3: results.chamadosUsuarios * (state.percN3 / 100) },
    { label: "Servidores", icon: Server, color: "text-emerald-500", chamados: results.chamadosServidores, n3: results.chamadosServidores * (state.percN3 / 100) },
    { label: "Rede", icon: Network, color: "text-amber-500", chamados: results.chamadosRede, n3: results.chamadosRede * (state.percN3 / 100) },
    { label: "Banco de Dados", icon: Database, color: "text-purple-500", chamados: results.chamadosBancoDados, n3: results.chamadosBancoDados * (state.percN3 / 100) },
    { label: "Sistemas", icon: Monitor, color: "text-cyan-500", chamados: results.chamadosSistemas, n3: results.chamadosSistemas * (state.percN3 / 100) },
  ];

  const horasN3PorCategoria = chamadosN3PorCategoria.map(c => ({
    ...c,
    horas: c.n3 * state.tempoMedioChamadoN3,
  }));

  const hasDeficit = results.horasPrevencao <= 0;

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
          <h1 className="text-sm font-bold text-foreground">Detalhamento dos Cálculos</h1>
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

        {/* Funil de distribuição */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Distribuição do Funil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <FunnelCard level="N1" label="Service Desk" perc={state.percN1} volume={results.volumeN1} custo={results.custoN1} color="bg-blue-500" />
              <FunnelCard level="N2" label="Infraestrutura" perc={state.percN2} volume={results.volumeN2} custo={results.custoN2} color="bg-amber-500" />
              <FunnelCard level="N3" label="Especialistas" perc={state.percN3} volume={results.volumeN3} custo={results.custoN3} color="bg-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Chamados por Categoria */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Chamados por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-right">No N3 ({state.percN3}%)</TableHead>
                  <TableHead className="text-xs text-right">Horas N3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {horasN3PorCategoria.map((cat) => (
                  <TableRow key={cat.label}>
                    <TableCell className="text-sm py-3">
                      <span className="flex items-center gap-2">
                        <cat.icon className={`h-4 w-4 ${cat.color}`} />
                        {cat.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatNumber(cat.chamados)}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatNumber(cat.n3, 1)}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatNumber(cat.horas, 1)}h</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell className="text-sm py-3">Total</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.volumeTotalBruto)}</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.volumeN3, 1)}</TableCell>
                  <TableCell className="text-sm text-right">{formatNumber(results.horasAtendimentoN3, 1)}h</TableCell>
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

            {/* Barra visual de consumo */}
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

        {/* Custos detalhados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Composição de Custos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs">Base de Cálculo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-sm py-3 font-medium">Custo N1</TableCell>
                  <TableCell className="text-sm text-right font-semibold">{formatBRL(results.custoN1)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatNumber(results.volumeN1, 1)} chamados × {formatBRL(results.custoPorChamadoN1)}/chamado</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm py-3 font-medium">Custo N2</TableCell>
                  <TableCell className="text-sm text-right font-semibold">{formatBRL(results.custoN2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatNumber(state.qtdServidores)} servidores × {formatBRL(results.custoPorServidorN2)}/servidor</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm py-3 font-medium">Custo N3</TableCell>
                  <TableCell className="text-sm text-right font-semibold">{formatBRL(results.custoN3)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatNumber(results.horasN3)}h × {formatBRL(state.valorHoraN3)}/hora</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm py-3 font-medium">Ferramentas</TableCell>
                  <TableCell className="text-sm text-right font-semibold">{formatBRL(state.custoFixoFerramentas)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Custo fixo mensal</TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="text-sm py-3 font-bold">Custo Total</TableCell>
                  <TableCell className="text-sm text-right font-bold text-primary">{formatBRL(results.custoTotalOperacao)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Soma de todos os custos</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm py-3 font-bold">Preço de Venda</TableCell>
                  <TableCell className="text-sm text-right font-bold text-primary">{formatBRL(results.precoVendaMensal)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Margem {state.margemLucro}% + Impostos {state.impostosTaxas}%</TableCell>
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

function FunnelCard({ level, label, perc, volume, custo, color }: { level: string; label: string; perc: number; volume: number; custo: number; color: string }) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <span className="text-sm font-semibold">{level}</span>
        <Badge variant="outline" className="ml-auto text-xs">{perc}%</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{formatNumber(volume)} chamados</p>
        <p className="text-sm font-bold text-primary">{formatBRL(custo)}</p>
      </div>
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
