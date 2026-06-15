import { useProfFinanceiro } from "@/hooks/useProfFinanceiro";
import { formatBRL } from "@/lib/profissionais/calc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Percent, Wallet, Receipt } from "lucide-react";
import FinanceiroSubNav from "@/components/itsm/FinanceiroSubNav";
import { Link } from "react-router-dom";

const BASE = "/profissionais-alocados/financeiro";

export default function FinanceiroResultadoProf() {
  const { state, update, results } = useProfFinanceiro();
  const comp = results.composicaoPreco;
  const custo = results.custoTotalOperacao;
  const pv = comp.precoVenda;
  const invalid = comp.totalEncargosPerc >= 100;

  const linha = (label: string, valor: number, perc: number, opts?: { bold?: boolean; muted?: boolean; tone?: "neutral" | "negative" | "positive" }) => {
    const tone = opts?.tone ?? "neutral";
    const toneCls = tone === "negative" ? "text-destructive" : tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground";
    return (
      <div className={`flex items-center justify-between text-sm ${opts?.muted ? "text-muted-foreground" : ""} ${opts?.bold ? "font-semibold" : ""}`}>
        <span className="truncate">{label}</span>
        <span className="flex items-baseline gap-3 tabular-nums">
          <span className={`w-16 text-right text-xs ${opts?.muted ? "" : "text-muted-foreground"}`}>{perc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
          <span className={`w-32 text-right ${opts?.bold ? toneCls : ""}`}>{formatBRL(valor)}</span>
        </span>
      </div>
    );
  };

  const impostosVendaPerc = state.pisPerc + state.cofinsPerc + state.issPerc;
  const impostosVendaRs = comp.pis + comp.cofins + comp.iss;
  const lucroAntesIR = pv - impostosVendaRs - comp.comissao - custo - comp.encFinanc;
  const lucroAntesIRPerc = pv > 0 ? (lucroAntesIR / pv) * 100 : 0;
  const irEfetivo = lucroAntesIR > 0 ? (comp.irpjCsll / lucroAntesIR) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <FinanceiroSubNav basePath={BASE} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Custo Mensal Base do Profissional (referência)</CardTitle>
          <p className="text-xs text-muted-foreground">Usado apenas para visualizar o demonstrativo. Na precificação real, o custo vem do salário × encargos × overhead + benefícios.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Custo de referência (R$)</Label>
            <Input type="number" value={state.custoExemplo} onChange={(e) => update("custoExemplo", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Encargos (%)</Label>
            <Input type="number" value={state.encargosPerc} onChange={(e) => update("encargosPerc", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Overhead (%)</Label>
            <Input type="number" value={state.overheadPerc} onChange={(e) => update("overheadPerc", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Benefícios padrão (R$/mês)</Label>
            <Input type="number" step={50} value={state.beneficioFixo} onChange={(e) => update("beneficioFixo", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Carga Horária Mensal (h)</Label>
            <Input type="number" value={state.horasMensais} onChange={(e) => update("horasMensais", parseInt(e.target.value) || 0)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Custo Total da Operação</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatBRL(custo)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Base de entrada do markup divisor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Σ Encargos sobre Venda</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${invalid ? "text-destructive" : "text-foreground"}`}>{comp.totalEncargosPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">Custo = {comp.custoPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% do PV</p>
          </CardContent>
        </Card>
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Preço de Venda Mensal</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatBRL(pv)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">PV = Custo / (1 - Σ%/100)</p>
          </CardContent>
        </Card>
      </div>

      {invalid && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          A soma dos percentuais é {comp.totalEncargosPerc.toFixed(2)}% (≥ 100%). Reduza algum componente para tornar o preço calculável.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Resultado da Operação</CardTitle>
          <p className="text-xs text-muted-foreground">
            Edite os componentes em <Link to={`${BASE}/impostos`} className="text-primary hover:underline">Impostos &amp; Markup</Link> e em <Link to={`${BASE}/comissoes`} className="text-primary hover:underline">Comissões</Link>.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {linha("Valor de VENDA", pv, 100, { bold: true })}
          <Separator className="my-2" />
          {linha("(−) Impostos (PIS + COFINS + ISS)", -impostosVendaRs, impostosVendaPerc, { tone: "negative" })}
          {linha("(−) Comissão", -comp.comissao, state.comissaoPerc, { tone: "negative" })}
          {linha("(−) Custo Total da Operação", -custo, (custo / (pv || 1)) * 100, { tone: "negative" })}
          {state.encFinancPerc > 0 && linha("(−) Encargos Financeiros", -comp.encFinanc, state.encFinancPerc, { tone: "negative" })}
          <Separator className="my-2" />
          {linha("Lucro antes do IR", lucroAntesIR, lucroAntesIRPerc, { bold: true })}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground -mt-1">
            <span className="italic">IR/CSLL efetivo sobre o lucro antes do IR</span>
            <span className="tabular-nums">{irEfetivo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
          </div>
          {linha("(−) IR / CSLL", -comp.irpjCsll, state.irpjCsllPerc, { tone: "negative" })}
          <Separator className="my-2" />
          {linha("Rentabilidade (ROI)", comp.lucro, state.lucroPerc, { bold: true, tone: "positive" })}
        </CardContent>
      </Card>
    </div>
  );
}