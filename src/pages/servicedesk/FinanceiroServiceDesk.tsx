import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WriteFence from "@/components/auth/WriteFence";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { brl, pct } from "@/lib/servicedesk/format";
import type { ServiceDeskState } from "@/lib/servicedesk/types";

const CAMPOS: { key: keyof ServiceDeskState; label: string }[] = [
  { key: "pisPerc", label: "PIS (%)" },
  { key: "cofinsPerc", label: "COFINS (%)" },
  { key: "issPerc", label: "ISS (%)" },
  { key: "comissaoPerc", label: "Comissão (%)" },
  { key: "irpjCsllPerc", label: "IRPJ / CSLL — imposto de renda e contribuição social (%)" },
  { key: "encFinancPerc", label: "Encargos financeiros (%)" },
  { key: "lucroPerc", label: "Lucro (%)" },
];

export default function FinanceiroServiceDesk() {
  const { state, update, results } = useServiceDesk();
  const c = results.cascata;

  return (
    <WriteFence permission="page.sd.financeiro.write" anyOf={["sd.financeiro.edit"]}>
      <div className="mx-auto max-w-5xl space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuração financeira — Smart Service Desk</CardTitle>
            <p className="text-xs text-muted-foreground">
              Markup divisor: o preço de venda = custo ÷ (1 − soma dos percentuais). Impostos, comissão e lucro incidem sobre o preço final, não sobre o custo. Isolado da configuração do Smart ITO.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {CAMPOS.map((f) => (
                <div key={String(f.key)} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input className="h-8" type="number" step={0.01}
                    value={state[f.key] as number}
                    onChange={(e) => update(f.key, (Number(e.target.value) || 0) as never)} />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Σ percentuais (soma de impostos, comissão e lucro)</Label>
                <p className="flex h-8 items-center text-sm font-semibold">{pct(c.totalPercentuais)}</p>
              </div>
            </div>

            <div className="grid gap-2 text-sm md:grid-cols-2">
              <Linha label="Custo total mensal" valor={brl(results.custoTotalMensal)} />
              <Linha label="Fator de venda" valor={c.fatorVenda.toFixed(4)} />
              <Linha label="PIS" valor={brl(c.pis)} />
              <Linha label="COFINS" valor={brl(c.cofins)} />
              <Linha label="ISS" valor={brl(c.iss)} />
              <Linha label="Comissão" valor={brl(c.comissao)} />
              <Linha label="IRPJ / CSLL" valor={brl(c.irpjCsll)} />
              <Linha label="Encargos financeiros" valor={brl(c.encFinanc)} />
              <Linha label="Lucro" valor={brl(c.lucro)} />
              <Linha label="Rentabilidade" valor={pct(c.rentabilidadePct)} />
              <Linha destaque label="Preço de venda mensal" valor={brl(c.precoVenda)} />
              <Linha destaque label="Valores únicos (cobrança única de implantação)" valor={brl(results.custoOneTime)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </WriteFence>
  );
}

function Linha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${destaque ? "border-primary/30 bg-primary/5 font-semibold" : ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{valor}</span>
    </div>
  );
}