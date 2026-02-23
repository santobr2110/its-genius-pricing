import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ITSMState, ITSMResults, formatBRL, formatNumber } from "@/hooks/useITSMCalculator";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { DollarSign, Clock, TrendingUp, FileText } from "lucide-react";

interface Props {
  state: ITSMState;
  results: ITSMResults;
}

const PIE_COLORS = ["hsl(221, 83%, 53%)", "hsl(160, 60%, 45%)"];
const BAR_COLORS = ["hsl(221, 83%, 53%)", "hsl(45, 93%, 47%)", "hsl(0, 72%, 51%)", "hsl(270, 50%, 50%)"];

export default function ResultsPanel({ state, results }: Props) {
  const pieData = [
    { name: "Usuários", value: Math.round(results.totalChamadosUsuarios) },
    { name: "Infraestrutura", value: Math.round(results.totalChamadosInfra) },
  ];

  const barData = [
    { name: "N1", value: results.custoN1 },
    { name: "N2", value: results.custoN2 },
    { name: "N3", value: results.custoN3 },
    { name: "Ferramentas", value: state.custoFixoFerramentas },
  ];

  return (
    <div className="space-y-4">
      {/* Highlight Cards */}
      <div className="grid grid-cols-1 gap-3">
        <HighlightCard
          icon={DollarSign}
          label="Preço Sugerido"
          value={formatBRL(results.precoVendaMensal)}
          accent="text-emerald-600 bg-emerald-50"
        />
        <HighlightCard
          icon={TrendingUp}
          label="Custo Total"
          value={formatBRL(results.custoTotalOperacao)}
          accent="text-blue-600 bg-blue-50"
        />
        <HighlightCard
          icon={Clock}
          label="Total Horas/Mês"
          value={`${formatNumber(results.totalHoras, 1)}h`}
          accent="text-amber-600 bg-amber-50"
        />
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Chamados: Usuários vs Infra</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ChartContainer config={{ usuarios: { label: "Usuários", color: PIE_COLORS[0] }, infra: { label: "Infra", color: PIE_COLORS[1] } }} className="h-[160px] w-[200px]">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Custo por Nível</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ n1: { label: "N1", color: BAR_COLORS[0] }, n2: { label: "N2", color: BAR_COLORS[1] }, n3: { label: "N3", color: BAR_COLORS[2] }, tools: { label: "Ferramentas", color: BAR_COLORS[3] } }} className="h-[160px] w-full">
            <BarChart data={barData} layout="vertical" margin={{ left: 60, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
              </Bar>
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatBRL(value as number)} />} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Mini Report */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Mini-Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ReportRow label="Chamados Gerados" value={formatNumber(results.volumeTotalBruto)} />
          <ReportRow label="Evitados (N0)" value={formatNumber(results.chamadosResolvidosN0)} highlight />
          <ReportRow label="Atendimento Humano" value={formatNumber(results.volumeAtendimentoHumano)} />
          <div className="border-t pt-2 mt-2 space-y-1">
            <ReportRow label="→ N1" value={formatNumber(results.volN1)} sub />
            <ReportRow label="→ N2" value={formatNumber(results.volN2)} sub />
            <ReportRow label="→ N3" value={formatNumber(results.volN3)} sub />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HighlightCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold text-foreground truncate leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportRow({ label, value, highlight, sub }: {
  label: string; value: string; highlight?: boolean; sub?: boolean;
}) {
  return (
    <div className={`flex justify-between ${sub ? "pl-2 text-xs" : ""}`}>
      <span className={`text-muted-foreground ${sub ? "text-xs" : "text-sm"}`}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-primary" : "text-foreground"} ${sub ? "text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}
