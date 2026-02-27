import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ITSMState } from "@/hooks/useITSMCalculator";
import { Settings2, DollarSign, TrendingUp } from "lucide-react";

interface Props {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
}

function NumInput({ label, value, onChange, step = 0.1, prefix }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; prefix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`h-8 text-sm ${prefix ? "pl-8" : ""}`}
        />
      </div>
    </div>
  );
}

export default function ConfigPanel({ state, update }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 mb-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Motor de Configurações</h2>
      </div>
      <Accordion type="multiple" defaultValue={["taxas", "financeiro"]} className="space-y-2">
        <AccordionItem value="taxas" className="border rounded-lg px-3 bg-card">
          <AccordionTrigger className="text-sm py-3 hover:no-underline">
            <span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-primary" />Taxas de Demanda</span>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Chamados/Usuário" value={state.taxaUsuario} onChange={(v) => update("taxaUsuario", v)} />
              <NumInput label="Chamados/Servidor" value={state.taxaServidor} onChange={(v) => update("taxaServidor", v)} />
              <NumInput label="Chamados/Rede" value={state.taxaRede} onChange={(v) => update("taxaRede", v)} />
              <NumInput label="Chamados/BD" value={state.taxaBancoDados} onChange={(v) => update("taxaBancoDados", v)} />
              <NumInput label="Chamados/Sistemas" value={state.taxaSistemas} onChange={(v) => update("taxaSistemas", v)} />
              <NumInput label="Rotinas/Mês" value={state.taxaRotinas} onChange={(v) => update("taxaRotinas", v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="financeiro" className="border rounded-lg px-3 bg-card">
          <AccordionTrigger className="text-sm py-3 hover:no-underline">
            <span className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-primary" />Configurações Financeiras</span>
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-4">
            <NumInput label="Custo Fixo Ferramentas" value={state.custoFixoFerramentas} onChange={(v) => update("custoFixoFerramentas", v)} prefix="R$" step={100} />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Margem de Lucro</Label>
                <span className="text-xs font-semibold text-foreground">{state.margemLucro}%</span>
              </div>
              <Slider value={[state.margemLucro]} onValueChange={([v]) => update("margemLucro", v)} min={0} max={60} step={1} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Impostos e Taxas</Label>
                <span className="text-xs font-semibold text-foreground">{state.impostosTaxas}%</span>
              </div>
              <Slider value={[state.impostosTaxas]} onValueChange={([v]) => update("impostosTaxas", v)} min={0} max={40} step={1} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
