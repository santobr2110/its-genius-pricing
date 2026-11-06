import { demonstrativoCliente, linhasDemonstrativo, type DemonstrativoCliente } from "@/lib/pricing/demonstrativoCliente";
import type { ParcelaReforma } from "@/lib/pricing/reformaTributaria";

interface Props { parcelas?: ParcelaReforma[]; demonstrativo?: DemonstrativoCliente; fator?: number; titulo?: string; className?: string }
export default function PrecoClienteDetalhado({ parcelas, demonstrativo, fator = 1, titulo = "Composição do preço ao cliente", className = "" }: Props) {
  const d = demonstrativo ?? (parcelas?.length ? demonstrativoCliente(parcelas, fator) : null);
  if (!d) return null;
  return <section aria-label={titulo} className={`min-w-0 border-t border-border py-2 text-xs space-y-1 break-inside-avoid ${className}`}>
    <h3 className="font-semibold text-foreground">{titulo}</h3>
    <dl className="space-y-1">{linhasDemonstrativo(d, true).slice(0,3).map((linha, i) => {
      const pos = linha.lastIndexOf(": ");
      return <div key={i} className={`flex flex-wrap justify-between gap-x-3 gap-y-0.5 ${i === 0 || i === 2 ? "font-semibold" : ""}`}>
        <dt className="min-w-0 break-words">{linha.slice(0, pos)}</dt><dd className="tabular-nums shrink-0">{linha.slice(pos + 2)}</dd>
      </div>;
    })}</dl>
    <p className="text-muted-foreground">{linhasDemonstrativo(d, true)[3]}</p>
  </section>;
}