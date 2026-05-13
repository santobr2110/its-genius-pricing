import { useITSMContext } from "@/contexts/ITSMContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Server, Network, Database, ShieldCheck, Monitor, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, Cell } from "recharts";

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
      origem: "Funil (N2)",
      demanda: results.volumeN2,
      capacidade: state.capacidadeChamadosN2,
      custo: results.custoN2,
    },
    {
      name: "N3 — Especialistas sêniores",
      origem: "Funil (N3) + horas avulsas",
      demanda: results.volumeN3,
      capacidade: state.tempoMedioChamadoN3 > 0 ? state.horasN3Mensais / state.tempoMedioChamadoN3 : 0,
      custo: results.custoN3,
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
    { layer: "Field Service (N1F + N2F + N3F + transbordo + triagem)", custo: results.fieldService.total },
    { layer: "Proxies de monitoramento (informativo)", custo: custoProxies },
  ];
  const custoOperacaoTotal = results.custoTotalOperacao;

  const origemRows = [
    { icon: Users, label: "Usuários (Service Desk)", bruto: usuariosBruto, humano: usuariosHumano },
    { icon: Server, label: "Servidores", bruto: results.chamadosServidores, humano: results.chamadosServidores * (1 - reducaoN0) },
    { icon: Network, label: "Rede", bruto: results.chamadosRede, humano: results.chamadosRede * (1 - reducaoN0) },
    { icon: Database, label: "Banco de Dados", bruto: results.chamadosBancoDados, humano: results.chamadosBancoDados * (1 - reducaoN0) },
    { icon: ShieldCheck, label: "Firewall", bruto: results.chamadosSistemas, humano: results.chamadosSistemas * (1 - reducaoN0) },
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

  // === Distribuição N0/N1/N2/N3 ===
  const distData = [
    { nivel: "N0 (automação)", volume: Math.round(results.chamadosResolvidosN0 * 10) / 10, fill: "hsl(var(--primary))" },
    { nivel: "N1", volume: Math.round(results.volumeN1 * 10) / 10, fill: "hsl(var(--muted-foreground))" },
    { nivel: "N2", volume: Math.round(results.volumeN2 * 10) / 10, fill: "hsl(var(--muted-foreground))" },
    { nivel: "N3", volume: Math.round(results.volumeN3 * 10) / 10, fill: "hsl(var(--muted-foreground))" },
  ];

  // === Previsão vs Volume informado pelo cliente ===
  const clienteAtivos = state.semVolumesAtuais ? 0 : (state.volumeChamadosAtivosManual || 0);
  const clienteUsuarios = state.semVolumesAtuais ? 0 : (state.volumeChamadosUsuariosManual || 0);
  const clienteTotal = clienteAtivos + clienteUsuarios;
  const previsaoVsClienteData = [
    { categoria: "Usuários", previsto: Math.round(usuariosBruto * 10) / 10, cliente: clienteUsuarios },
    { categoria: "Ativos", previsto: Math.round(ativosBruto * 10) / 10, cliente: clienteAtivos },
    { categoria: "Total", previsto: Math.round(totalBruto * 10) / 10, cliente: clienteTotal },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
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

        {/* Demanda por origem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demanda por origem</CardTitle>
            <p className="text-xs text-muted-foreground">Volume bruto e volume após auto-resolução N0, por categoria de origem.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Bruto (ch/mês)</TableHead>
                  <TableHead className="text-right">Após N0 (ch/mês)</TableHead>
                  <TableHead className="text-right">% do total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {origemRows.map(({ icon: Icon, label, bruto, humano }) => (
                  <TableRow key={label}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {label}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(bruto, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(humano, 1)}</TableCell>
                    <TableCell className="text-right">{results.volumeTotalBruto > 0 ? ((bruto / results.volumeTotalBruto) * 100).toFixed(1) : "0"}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-t-2">
                  <TableCell>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Total Usuários</div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(usuariosBruto, 1)}</TableCell>
                  <TableCell className="text-right">{formatNumber(usuariosHumano, 1)}</TableCell>
                  <TableCell className="text-right">{results.volumeTotalBruto > 0 ? ((usuariosBruto / results.volumeTotalBruto) * 100).toFixed(1) : "0"}%</TableCell>
                </TableRow>
                <TableRow className="font-semibold">
                  <TableCell>
                    <div className="flex items-center gap-2"><Server className="h-4 w-4" /> Total Ativos</div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(ativosBruto, 1)}</TableCell>
                  <TableCell className="text-right">{formatNumber(ativosHumano, 1)}</TableCell>
                  <TableCell className="text-right">{results.volumeTotalBruto > 0 ? ((ativosBruto / results.volumeTotalBruto) * 100).toFixed(1) : "0"}%</TableCell>
                </TableRow>
                <TableRow className="font-bold border-t-2 bg-muted/30">
                  <TableCell>Total Geral</TableCell>
                  <TableCell className="text-right">{formatNumber(totalBruto, 1)}</TableCell>
                  <TableCell className="text-right">{formatNumber(totalHumano, 1)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-2">
                Demanda prevista (após N0) vs demanda prevista com excedente (+{limitePerc}%) — chamados/mês.
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="origem" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <RTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                      formatter={(v: number) => formatNumber(v, 1)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="prevista" name="Demanda prevista" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="excedente" name={`Com excedente (+${limitePerc}%)`} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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