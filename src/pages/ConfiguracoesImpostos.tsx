import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Calculator, DollarSign, Percent, TrendingUp, Wallet } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Link } from "react-router-dom";
import FinanceiroSubNav from "@/components/itsm/FinanceiroSubNav";

type CompKey = "pisPerc" | "cofinsPerc" | "issPerc" | "irpjCsllPerc" | "encFinancPerc" | "lucroPerc";

const COMPONENTES: { key: CompKey; label: string; descricao: string; max: number }[] = [
  { key: "pisPerc",       label: "PIS",                 descricao: "Imposto federal sobre receita bruta.",                                max: 10 },
  { key: "cofinsPerc",    label: "COFINS",              descricao: "Contribuição federal sobre receita bruta.",                            max: 15 },
  { key: "issPerc",       label: "ISS",                 descricao: "Imposto municipal sobre serviços.",                                    max: 10 },
  { key: "irpjCsllPerc",  label: "IRPJ / CSLL",         descricao: "Imposto de renda e contribuição social sobre o lucro presumido.",     max: 15 },
  { key: "encFinancPerc", label: "Encargos Financeiros", descricao: "Custos financeiros do contrato (prazos, antecipações, garantias).",   max: 15 },
  { key: "lucroPerc",     label: "Rentabilidade",        descricao: "Rentabilidade pretendida da operação. Define automaticamente a comissão pela tabela de Comissões.", max: 60 },
];

export default function ConfiguracoesImpostos() {
  const { state, update, results } = useITSMContext();
  const comp = results.composicaoPreco;
  const custo = results.custoTotalOperacao;
  const pv = comp.precoVenda;
  const invalidConfig = comp.totalEncargosPerc >= 100;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <Calculator className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Impostos &amp; Markup Divisor</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="financeiro" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <FinanceiroSubNav />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Custo Total da Operação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatBRL(custo)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Base do markup divisor</p>
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
              <p className="text-[11px] text-muted-foreground mt-1">PV = Custo / (1 − Σ%/100)</p>
            </CardContent>
          </Card>
        </div>

        {invalidConfig && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            A soma dos percentuais é {comp.totalEncargosPerc.toFixed(2)}% (≥ 100%). Reduza algum componente para tornar o preço calculável.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Componentes do Markup Divisor
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Defina os percentuais tributários, encargos e a rentabilidade pretendida. A comissão é
              calculada automaticamente em <Link to="/financeiro/comissoes" className="text-primary hover:underline">Comissões</Link>.
            </p>
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

            <Separator className="mt-3" />
            <div className="space-y-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <Label className="text-sm font-medium">Comissão (automática)</Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Definida pela faixa de rentabilidade. Editável em{" "}
                    <Link to="/financeiro/comissoes" className="text-primary hover:underline">Comissões</Link>.
                  </p>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-base font-bold text-primary tabular-nums">
                    {(state.comissaoPerc || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Valor estimado sobre PV</span>
                <span className="font-semibold text-foreground tabular-nums">{formatBRL(pv * (state.comissaoPerc || 0) / 100)}</span>
              </div>
            </div>

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
      </main>
    </div>
  );
}