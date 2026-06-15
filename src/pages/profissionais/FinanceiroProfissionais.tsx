import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Percent, TrendingUp, Wallet, Receipt } from "lucide-react";
import { useFinanceiroProfissionais, markupDivisorPct } from "@/hooks/useFinanceiroProfissionais";
import { formatBRL } from "@/lib/profissionais/calc";
import { useAuth } from "@/contexts/AuthContext";

export default function FinanceiroProfissionais() {
  const { config, update } = useFinanceiroProfissionais();
  const { can } = useAuth();
  const canEdit = can("page.prof.financeiro.write");
  const markup = markupDivisorPct(config);
  const invalid = markup >= 100;

  // Demonstrativo com um custo de exemplo (R$ 10.000) para visualização do Markup divisor
  const exemplo = 10000;
  const denom = 1 - Math.min(99, markup) / 100;
  const pv = denom > 0 ? exemplo / denom : 0;
  const lin = (label: string, valor: number, perc: number, opts?: { bold?: boolean; tone?: "neg" | "pos" | "neutral" }) => {
    const tone = opts?.tone ?? "neutral";
    const cls = tone === "neg" ? "text-destructive" : tone === "pos" ? "text-emerald-600 dark:text-emerald-400" : "";
    return (
      <div className={`flex items-center justify-between text-sm ${opts?.bold ? "font-semibold" : ""}`}>
        <span>{label}</span>
        <span className="flex items-baseline gap-3 tabular-nums">
          <span className="w-16 text-right text-xs text-muted-foreground">{perc.toFixed(2)}%</span>
          <span className={`w-32 text-right ${opts?.bold ? cls : ""}`}>{formatBRL(valor)}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro — BodyShop</h1>
        <p className="text-sm text-muted-foreground">
          Configurações autônomas de impostos, comissão e markup divisor aplicadas ao custo do profissional alocado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Custo de exemplo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(exemplo)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Base do markup divisor (Salário × Encargos × Overhead)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Σ Markup Divisor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${invalid ? "text-destructive" : ""}`}>{markup.toFixed(2)}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">PV = Custo / (1 − Σ%/100)</p>
          </CardContent>
        </Card>
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> PV de exemplo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatBRL(pv)}</p>
          </CardContent>
        </Card>
      </div>

      {invalid && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Σ Markup = {markup.toFixed(2)}% (≥ 100%). Reduza algum percentual para tornar o PV calculável.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Custo do Profissional</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div><Label>Encargos (%)</Label><Input disabled={!canEdit} type="number" value={config.encargos_pct} onChange={(e) => update({ encargos_pct: +e.target.value || 0 })} /></div>
            <div><Label>Overhead (%)</Label><Input disabled={!canEdit} type="number" value={config.overhead_pct} onChange={(e) => update({ overhead_pct: +e.target.value || 0 })} /></div>
            <div className="col-span-2"><Label>Carga Horária Mensal (h)</Label><Input disabled={!canEdit} type="number" value={config.horas_mensais} onChange={(e) => update({ horas_mensais: parseInt(e.target.value) || 0 })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Impostos & Markup</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div><Label>PIS (%)</Label><Input disabled={!canEdit} type="number" step="0.01" value={config.pis_pct} onChange={(e) => update({ pis_pct: +e.target.value || 0 })} /></div>
            <div><Label>COFINS (%)</Label><Input disabled={!canEdit} type="number" step="0.01" value={config.cofins_pct} onChange={(e) => update({ cofins_pct: +e.target.value || 0 })} /></div>
            <div><Label>ISS (%)</Label><Input disabled={!canEdit} type="number" step="0.01" value={config.iss_pct} onChange={(e) => update({ iss_pct: +e.target.value || 0 })} /></div>
            <div><Label>IRPJ / CSLL (%)</Label><Input disabled={!canEdit} type="number" step="0.01" value={config.irpj_csll_pct} onChange={(e) => update({ irpj_csll_pct: +e.target.value || 0 })} /></div>
            <div><Label>Encargos Financeiros (%)</Label><Input disabled={!canEdit} type="number" step="0.01" value={config.enc_financ_pct} onChange={(e) => update({ enc_financ_pct: +e.target.value || 0 })} /></div>
            <div><Label>Rentabilidade / ROI (%)</Label><Input disabled={!canEdit} type="number" step="0.01" value={config.lucro_pct} onChange={(e) => update({ lucro_pct: +e.target.value || 0 })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Comissão</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Comissão (%)</Label><Input disabled={!canEdit} type="number" step="0.01" value={config.comissao_pct} onChange={(e) => update({ comissao_pct: +e.target.value || 0 })} /></div>
            <p className="col-span-2 text-xs text-muted-foreground">Aplicada sobre o valor de venda (mesmo motor do Smart ITO).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Demonstrativo (Custo {formatBRL(exemplo)})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lin("Valor de VENDA", pv, 100, { bold: true })}
            <Separator className="my-2" />
            {lin("(−) Impostos (PIS+COFINS+ISS)", -(pv * (config.pis_pct + config.cofins_pct + config.iss_pct) / 100), config.pis_pct + config.cofins_pct + config.iss_pct, { tone: "neg" })}
            {lin("(−) Comissão", -(pv * config.comissao_pct / 100), config.comissao_pct, { tone: "neg" })}
            {lin("(−) Custo da Operação", -exemplo, (exemplo / (pv || 1)) * 100, { tone: "neg" })}
            {config.enc_financ_pct > 0 && lin("(−) Encargos Financeiros", -(pv * config.enc_financ_pct / 100), config.enc_financ_pct, { tone: "neg" })}
            {lin("(−) IR / CSLL", -(pv * config.irpj_csll_pct / 100), config.irpj_csll_pct, { tone: "neg" })}
            <Separator className="my-2" />
            {lin("Rentabilidade (ROI)", pv * config.lucro_pct / 100, config.lucro_pct, { bold: true, tone: "pos" })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}