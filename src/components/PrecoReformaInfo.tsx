import { Landmark } from "lucide-react";
import { useReformaCBS } from "@/hooks/useReformaCBS";
import { brlReforma, calcPrecoReforma, escalarReforma, REFORMA_VIGENCIA, textoPrecoReforma, type ParcelaReforma } from "@/lib/pricing/reformaTributaria";

interface Props {
  parcelas: ParcelaReforma[];
  /** Multiplicador aplicado ao resultado (ex.: meses do contrato). */
  fator?: number;
  rotulo?: string;
  compacto?: boolean;
  className?: string;
}

/** Preço de venda pós-reforma (informativo, a partir de 01/01/2027). */
export default function PrecoReformaInfo({ parcelas, fator = 1, rotulo, compacto, className = "" }: Props) {
  const { cbsPerc } = useReformaCBS();
  const r = escalarReforma(calcPrecoReforma(parcelas, cbsPerc), fator);
  if (r.precoAtual <= 0) return null;
  const linha = (l: string, v: string) => (
    <div className="flex justify-between gap-2 whitespace-nowrap"><span className="text-muted-foreground">{l}</span><span className="tabular-nums">{v}</span></div>
  );
  return (
    <div className={`rounded-md border border-dashed border-primary/40 bg-primary/5 p-2 text-xs ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-medium text-foreground whitespace-nowrap"><Landmark className="h-3.5 w-3.5 text-primary" />{rotulo ?? `Preço a partir de ${REFORMA_VIGENCIA}`}</span>
        <span className="font-semibold tabular-nums text-primary whitespace-nowrap">{textoPrecoReforma(r)}</span>
      </div>
      {!compacto && (
        <div className="mt-1.5 space-y-0.5">
          {linha("Preço atual", brlReforma(r.precoAtual))}
          {linha("(−) PIS + COFINS", brlReforma(r.pis + r.cofins))}
          {linha("Líquido sem PIS/COFINS/ISS", brlReforma(r.liquidoSemImpostos))}
          {linha(`(+) CBS ${r.cbsPerc != null ? `${r.cbsPerc.toLocaleString("pt-BR")}%` : "(alíquota a definir)"}`, r.cbs != null ? brlReforma(r.cbs) : "—")}
        </div>
      )}
    </div>
  );
}
