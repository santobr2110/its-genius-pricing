import { useITSMContext } from "@/contexts/ITSMContext";
import { formatBRL } from "@/hooks/useITSMCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp, Percent, Wallet } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import { Link } from "react-router-dom";

export default function ConfiguracoesFinanceiras() {
  const { state, update, results } = useITSMContext();

  const { valorMargem, valorImpostos, precoPreImposto } = results;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <DollarSign className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-bold text-foreground">Configurações Financeiras</h1>
          </Link>
          <div className="ml-auto">
            <SortableNav current="financeiro" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Custo Total Operação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatBRL(results.custoTotalOperacao)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Preço de Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatBRL(results.precoVendaMensal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" /> Preço pré-imposto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatBRL(precoPreImposto)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Custo Fixo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Custos Fixos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-md">
              <Label className="text-xs text-muted-foreground">Custo Fixo de Ferramentas (mensal)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step={100}
                  value={state.custoFixoFerramentas}
                  onChange={(e) => update("custoFixoFerramentas", parseFloat(e.target.value) || 0)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Inclui licenças, plataformas de ITSM, monitoramento e demais ferramentas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Margem e Impostos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Margem e Tributos (Markup Divisor)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Margem de Lucro */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Margem de Lucro</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.margemLucro}
                    onChange={(e) => update("margemLucro", parseFloat(e.target.value) || 0)}
                    className="h-8 w-24 text-right"
                  />
                  <span className="text-sm font-semibold text-foreground w-4">%</span>
                </div>
              </div>
              <Slider
                value={[state.margemLucro]}
                onValueChange={([v]) => update("margemLucro", v)}
                min={0}
                max={80}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground">
                Valor estimado da margem: <span className="font-semibold text-foreground">{formatBRL(valorMargem)}</span>
              </p>
            </div>

            <Separator />

            {/* Impostos */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Impostos e Taxas</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.impostosTaxas}
                    onChange={(e) => update("impostosTaxas", parseFloat(e.target.value) || 0)}
                    className="h-8 w-24 text-right"
                  />
                  <span className="text-sm font-semibold text-foreground w-4">%</span>
                </div>
              </div>
              <Slider
                value={[state.impostosTaxas]}
                onValueChange={([v]) => update("impostosTaxas", v)}
                min={0}
                max={40}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground">
                Valor estimado de tributos: <span className="font-semibold text-foreground">{formatBRL(valorImpostos)}</span>
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Método: Markup Divisor (por dentro)</p>
              <p>Preço de Venda = Custo Total / (1 - (Margem% + Impostos%) / 100)</p>
              <p>Soma atual: <span className="font-semibold text-foreground">
                {(state.margemLucro + state.impostosTaxas).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
              </span></p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
