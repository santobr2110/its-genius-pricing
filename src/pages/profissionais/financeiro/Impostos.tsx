import { useEffect } from "react";
import { useProfFinanceiro } from "@/hooks/useProfFinanceiro";
import { formatBRL } from "@/lib/profissionais/calc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DollarSign, Percent, TrendingUp, Wallet, Package, MapPin } from "lucide-react";
import FinanceiroSubNav from "@/components/itsm/FinanceiroSubNav";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePersistentState } from "@/hooks/usePersistentState";
import ProdutoFiscalCard from "@/components/financeiro/ProdutoFiscalCard";
import type { ProfFinState } from "@/hooks/useProfFinanceiro";

const BASE = "/profissionais-alocados/financeiro";

type CompKey = keyof Pick<ProfFinState, "pisPerc" | "cofinsPerc" | "issPerc" | "irpjCsllPerc" | "encFinancPerc" | "lucroPerc">;

const AUTO: { key: CompKey; label: string; descricao: string }[] = [
  { key: "pisPerc", label: "PIS", descricao: "Imposto federal sobre receita bruta. Definido pelo código de produto." },
  { key: "cofinsPerc", label: "COFINS", descricao: "Contribuição federal sobre receita bruta. Definido pelo código de produto." },
  { key: "issPerc", label: "ISS", descricao: "Imposto municipal sobre serviços. Definido pelo município selecionado." },
];
const EDITAVEIS: { key: CompKey; label: string; descricao: string; max: number }[] = [
  { key: "irpjCsllPerc", label: "IRPJ / CSLL", descricao: "Imposto de renda e contribuição social sobre o lucro presumido.", max: 20 },
  { key: "encFinancPerc", label: "Encargos Financeiros", descricao: "Custos financeiros do contrato (prazos, antecipações, garantias).", max: 15 },
];

export default function FinanceiroImpostosProf() {
  const { state, update, results } = useProfFinanceiro();
  const comp = results.composicaoPreco;
  const custo = results.custoTotalOperacao;
  const pv = comp.precoVenda;
  const invalid = comp.totalEncargosPerc >= 100;


  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <FinanceiroSubNav basePath={BASE} />

      <ProdutoFiscalCard oferta="bodyshop" storagePrefix="prof.financeiro" current={state} onApply={(r) => { update("pisPerc", r.pisPerc); update("cofinsPerc", r.cofinsPerc); update("issPerc", r.issPerc); }} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Custo de Referência</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{formatBRL(custo)}</p><p className="text-[11px] text-muted-foreground mt-1">Base do markup divisor</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Σ Encargos sobre Venda</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${invalid ? "text-destructive" : "text-foreground"}`}>{comp.totalEncargosPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</p><p className="text-[11px] text-muted-foreground mt-1">Custo = {comp.custoPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% do PV</p></CardContent>
        </Card>
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Preço de Venda Mensal</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatBRL(pv)}</p><p className="text-[11px] text-muted-foreground mt-1">PV = Custo / (1 − Σ%/100)</p></CardContent>
        </Card>
      </div>

      {invalid && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          A soma dos percentuais é {comp.totalEncargosPerc.toFixed(2)}% (≥ 100%). Reduza algum componente para tornar o preço calculável.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Componentes do Markup Divisor</CardTitle>
          <p className="text-xs text-muted-foreground">Defina os percentuais tributários, encargos e a rentabilidade. A comissão é calculada em <Link to={`${BASE}/comissoes`} className="text-primary hover:underline">Comissões</Link>.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {AUTO.map((c) => {
            const val = state[c.key] ?? 0;
            const rs = pv * val / 100;
            return (
              <div key={c.key} className="space-y-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{c.label} <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">(automático)</span></Label>
                    <p className="text-[11px] text-muted-foreground leading-snug">{c.descricao}</p>
                  </div>
                  <span className="text-base font-bold text-foreground tabular-nums shrink-0">{val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground"><span>Valor estimado sobre PV</span><span className="font-semibold text-foreground tabular-nums">{formatBRL(rs)}</span></div>
              </div>
            );
          })}

          {EDITAVEIS.map((c) => {
            const val = state[c.key] ?? 0;
            const rs = pv * val / 100;
            return (
              <div key={c.key} className="space-y-2 rounded-lg border border-primary/30 bg-background p-3">
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{c.label} <span className="text-[10px] uppercase tracking-wider text-primary ml-1">(editável)</span></Label>
                    <p className="text-[11px] text-muted-foreground leading-snug">{c.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input type="number" step={0.01} value={val} onChange={(e) => update(c.key, parseFloat(e.target.value) || 0)} className="h-8 w-20 text-right" />
                    <span className="text-sm font-semibold text-foreground w-4">%</span>
                  </div>
                </div>
                <Slider value={[val]} onValueChange={([v]) => update(c.key, v)} min={0} max={c.max} step={0.01} />
                <div className="flex justify-between text-[11px] text-muted-foreground"><span>Valor estimado sobre PV</span><span className="font-semibold text-foreground tabular-nums">{formatBRL(rs)}</span></div>
              </div>
            );
          })}

          <div className="space-y-2 rounded-lg border border-primary/30 bg-background p-3">
            <div className="flex justify-between items-center gap-3">
              <div className="min-w-0">
                <Label className="text-sm font-medium">Rentabilidade <span className="text-[10px] uppercase tracking-wider text-primary ml-1">(editável)</span></Label>
                <p className="text-[11px] text-muted-foreground leading-snug">Determina a faixa de comissão automaticamente.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input type="number" step={0.01} value={state.lucroPerc} onChange={(e) => update("lucroPerc", parseFloat(e.target.value) || 0)} className="h-8 w-20 text-right" />
                <span className="text-sm font-semibold text-foreground w-4">%</span>
              </div>
            </div>
            <Slider value={[state.lucroPerc]} onValueChange={([v]) => update("lucroPerc", v)} min={0} max={50} step={0.01} />
            <div className="flex justify-between text-[11px] text-muted-foreground"><span>Valor estimado sobre PV</span><span className="font-semibold text-foreground tabular-nums">{formatBRL(pv * state.lucroPerc / 100)}</span></div>
          </div>

          <div className="space-y-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
            <div className="flex justify-between items-center">
              <div className="min-w-0">
                <Label className="text-sm font-medium">Comissão (automática)</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">Definida pela faixa de rentabilidade. Editável em <Link to={`${BASE}/comissoes`} className="text-primary hover:underline">Comissões</Link>.</p>
              </div>
              <span className="text-base font-bold text-primary tabular-nums">{(state.comissaoPerc || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground"><span>Valor estimado sobre PV</span><span className="font-semibold text-foreground tabular-nums">{formatBRL(pv * (state.comissaoPerc || 0) / 100)}</span></div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Como o cálculo funciona</p>
            <p>Preço de Venda = Custo (Salário × Encargos × Overhead) ÷ (1 − Σ% ÷ 100)</p>
            <p>Cada componente (R$) = PV × (%componente ÷ 100)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}