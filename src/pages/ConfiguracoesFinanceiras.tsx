import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp, Percent, Wallet, Calculator, Receipt } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";

type CompKey = "pisPerc" | "cofinsPerc" | "issPerc" | "comissaoPerc" | "irpjCsllPerc" | "encFinancPerc" | "lucroPerc";

const COMPONENTES: { key: CompKey; label: string; descricao: string; max: number }[] = [
  { key: "pisPerc",       label: "PIS",                 descricao: "Imposto federal sobre receita bruta.",                                max: 10 },
  { key: "cofinsPerc",    label: "COFINS",              descricao: "Contribuição federal sobre receita bruta.",                            max: 15 },
  { key: "issPerc",       label: "ISS",                 descricao: "Imposto municipal sobre serviços.",                                    max: 10 },
  { key: "comissaoPerc",  label: "Comissão",            descricao: "Comissão comercial sobre o preço de venda.",                           max: 20 },
  { key: "irpjCsllPerc",  label: "IRPJ / CSLL",         descricao: "Imposto de renda e contribuição social sobre o lucro presumido.",     max: 15 },
  { key: "encFinancPerc", label: "Encargos Financeiros", descricao: "Custos financeiros do contrato (prazos, antecipações, garantias).",   max: 15 },
  { key: "lucroPerc",     label: "Lucro Pretendido",     descricao: "Margem líquida desejada para a operação.",                            max: 60 },
];

export default function ConfiguracoesFinanceiras() {
  const { state, update, results } = useITSMContext();
  const comp = results.composicaoPreco;
  const custo = results.custoTotalOperacao;
  const pv = comp.precoVenda;
  const invalidConfig = comp.totalEncargosPerc >= 100;

  const renderLinha = (label: string, valor: number, perc: number, opts?: { bold?: boolean; muted?: boolean; tone?: "neutral" | "negative" | "positive" }) => {
    const tone = opts?.tone ?? "neutral";
    const toneCls =
      tone === "negative" ? "text-destructive" :
      tone === "positive" ? "text-emerald-600 dark:text-emerald-400" :
      "text-foreground";
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

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton /><Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Configurações Financeiras</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="financeiro" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Resumo topo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Custo Total da Operação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatBRL(custo)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Base de entrada do markup divisor</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" /> Σ Encargos sobre Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${invalidConfig ? "text-destructive" : "text-foreground"}`}>
                {comp.totalEncargosPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Custo = {comp.custoPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% do PV
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Preço de Venda Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatBRL(pv)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">PV = Custo / (1 - Σ%/100)</p>
            </CardContent>
          </Card>
        </div>

        {invalidConfig && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            A soma dos percentuais é {comp.totalEncargosPerc.toFixed(2)}% (≥ 100%). Reduza algum componente para tornar o preço calculável.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Componentes do markup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Componentes do Markup Divisor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {COMPONENTES.map((c, i) => {
                const val = (state[c.key] as number) ?? 0;
                const rs = pv * val / 100;
                return (
                  <div key={c.key} className="space-y-2">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <Label className="text-sm font-medium">{c.label}</Label>
                        <p className="text-[11px] text-muted-foreground leading-snug">{c.descricao}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          step={0.01}
                          value={val}
                          onChange={(e) => update(c.key, parseFloat(e.target.value) || 0)}
                          className="h-8 w-20 text-right"
                        />
                        <span className="text-sm font-semibold text-foreground w-4">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[val]}
                      onValueChange={([v]) => update(c.key, v)}
                      min={0}
                      max={c.max}
                      step={0.01}
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Valor estimado sobre PV</span>
                      <span className="font-semibold text-foreground tabular-nums">{formatBRL(rs)}</span>
                    </div>
                    {i < COMPONENTES.length - 1 && <Separator className="mt-3" />}
                  </div>
                );
              })}

              <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground">Como o cálculo funciona</p>
                <p>Preço de Venda = Custo Total da Operação ÷ (1 − Σ% ÷ 100)</p>
                <p>Cada componente (R$) = PV × (%componente ÷ 100)</p>
                <p className="pt-1 border-t border-border/50 mt-2">
                  Todos os encargos, comissão e lucro são aplicados sobre o PV final (dentro do markup). O cliente paga apenas o PV.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Resultado da Operação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Resultado da Operação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(() => {
                const impostosVendaPerc = state.pisPerc + state.cofinsPerc + state.issPerc;
                const impostosVendaRs = comp.pis + comp.cofins + comp.iss;
                const lucroAntesIR = pv - impostosVendaRs - comp.comissao - custo - comp.encFinanc;
                const lucroAntesIRPerc = pv > 0 ? (lucroAntesIR / pv) * 100 : 0;
                const irEfetivo = lucroAntesIR > 0 ? (comp.irpjCsll / lucroAntesIR) * 100 : 0;
                const markupPerc = comp.custoPerc; // % do custo sobre PV
                return (
                  <>
                    {renderLinha("Valor de VENDA", pv, 100, { bold: true })}
                    <Separator className="my-2" />
                    {renderLinha("(−) Impostos (PIS + COFINS + ISS)", -impostosVendaRs, impostosVendaPerc, { tone: "negative" })}
                    {renderLinha("(−) Comissão", -comp.comissao, state.comissaoPerc, { tone: "negative" })}
                    {renderLinha("(−) Custo Total da Operação", -custo, (custo / (pv || 1)) * 100, { tone: "negative" })}
                    {state.encFinancPerc > 0 && renderLinha("(−) Encargos Financeiros", -comp.encFinanc, state.encFinancPerc, { tone: "negative" })}
                    <Separator className="my-2" />
                    {renderLinha("Lucro antes do IR", lucroAntesIR, lucroAntesIRPerc, { bold: true })}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground -mt-1">
                      <span className="italic">IR/CSLL efetivo sobre o lucro antes do IR</span>
                      <span className="tabular-nums">{irEfetivo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                    </div>
                    {renderLinha("(−) IR / CSLL", -comp.irpjCsll, state.irpjCsllPerc, { tone: "negative" })}
                    <Separator className="my-2" />
                    {renderLinha("Lucro Líquido (ROI)", comp.lucro, state.lucroPerc, { bold: true, tone: "positive" })}

                    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Markup (Custo/PV)</p>
                        <p className="text-sm font-bold text-foreground">
                          {markupPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI s/ Custo</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {custo > 0 ? ((comp.lucro / custo) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lucro / PV</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {state.lucroPerc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
