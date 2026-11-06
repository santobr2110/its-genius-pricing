import type { ParcelaReforma } from "./reformaTributaria";

export type TributoCliente = "ISS" | "PIS" | "COFINS";
export interface CargaCliente { tributo: TributoCliente; aliquota: number; base: number; valor: number }
/** Somente apresentação: não altera a precisão nem a conta de nenhum motor. */
export interface DemonstrativoCliente {
  versao: 1 | 2; semImpostos: number; impostos: number; total: number; cargas: CargaCliente[];
}
const centavos = (v: number) => Math.round((v + Number.EPSILON) * 100);
export function demonstrativoCliente(parcelas: ParcelaReforma[], fator = 1): DemonstrativoCliente {
  if (!Number.isFinite(fator) || fator < 0) throw new Error("Período inválido para o demonstrativo.");
  const grupos = new Map<string, { tributo: TributoCliente; aliquota: number; base: number; valor: number }>();
  let total = 0;
  for (const p of parcelas) {
    if (![p.preco, p.issPerc, p.pisPerc, p.cofinsPerc].every(Number.isFinite)
      || p.preco < 0 || [p.issPerc, p.pisPerc, p.cofinsPerc].some(v => v < 0 || v > 100)
      || p.issPerc + p.pisPerc + p.cofinsPerc > 100) throw new Error("Dados fiscais incompletos ou inválidos.");
    const base = p.preco * fator;
    total += base;
    for (const [tributo, aliquota] of [["ISS", p.issPerc], ["PIS", p.pisPerc], ["COFINS", p.cofinsPerc]] as const) {
      const key = `${tributo}:${aliquota}`;
      const g = grupos.get(key) ?? { tributo, aliquota, base: 0, valor: 0 };
      g.base += base; g.valor += base * aliquota / 100; grupos.set(key, g);
    }
  }
  const ordem: TributoCliente[] = ["ISS", "PIS", "COFINS"];
  const cargas = [...grupos.values()].sort((a, b) => ordem.indexOf(a.tributo) - ordem.indexOf(b.tributo) || a.aliquota - b.aliquota)
    .map(g => ({ ...g, base: centavos(g.base) / 100, valor: centavos(g.valor) / 100 }));
  const impostosCent = cargas.reduce((s, c) => s + centavos(c.valor), 0);
  const totalCent = centavos(total);
  return { versao: 2, semImpostos: (totalCent - impostosCent) / 100, impostos: impostosCent / 100, total: totalCent / 100, cargas };
}
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function linhasDemonstrativo(d: DemonstrativoCliente, compacto = d.versao === 2): string[] {
  if (compacto) return [
    `Preço de Venda sem impostos: ${brl(d.semImpostos)}`,
    `Total de Impostos (ISS/PIS/COFINS): ${brl(d.impostos)}`,
    `Preço de Venda com impostos: ${brl(d.total)}`,
    `Alíquotas: ${aliquotasDemonstrativo(d)}`,
  ];
  return [
    `Preço sem impostos (ISS, PIS e COFINS): ${brl(d.semImpostos)}`,
    ...d.cargas.map(c => `${c.tributo} ${c.aliquota.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}% sobre ${brl(c.base)}: ${brl(c.valor)}`),
    `Total de impostos destacados: ${brl(d.impostos)}`,
    `Preço final com impostos: ${brl(d.total)}`,
  ];
}
export function aliquotasDemonstrativo(d: DemonstrativoCliente): string {
  return (["ISS", "PIS", "COFINS"] as const).map(tributo => {
    const taxas = [...new Set(d.cargas.filter(c => c.tributo === tributo).map(c => c.aliquota))];
    return `${tributo} ${taxas.map(a => `${a.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}%`).join(" / ")}`;
  }).join(" · ");
}
export function textoDemonstrativo(d: DemonstrativoCliente): string { return linhasDemonstrativo(d).join("\n"); }