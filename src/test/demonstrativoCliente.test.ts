import { describe, expect, it } from "vitest";
import { demonstrativoCliente } from "@/lib/pricing/demonstrativoCliente";

describe("Preço ao cliente: somente ISS, PIS e COFINS", () => {
  const parcela = { preco: 1000, issPerc: 5, pisPerc: 0.65, cofinsPerc: 3 };
  it("retira apenas os três impostos já incluídos, sem reaplicar sobre o líquido", () => {
    const d = demonstrativoCliente([{ ...parcela, irpjCsllPerc: 10.34 }]);
    expect(d).toMatchObject({ total: 1000, semImpostos: 913.5, impostos: 86.5 });
    expect(d.cargas.map(c => [c.tributo, c.base, c.valor])).toEqual([["ISS",1000,50],["PIS",1000,6.5],["COFINS",1000,30]]);
  });
  it("usa preço efetivo após desconto", () => {
    expect(demonstrativoCliente([{ ...parcela, preco: 800 }])).toMatchObject({ total: 800, semImpostos: 730.8, impostos: 69.2 });
  });
  it("não inventa uma alíquota única para itens com ISS diferente", () => {
    const d = demonstrativoCliente([parcela, { ...parcela, issPerc: 2 }]);
    expect(d.cargas.filter(c => c.tributo === "ISS")).toEqual([{ tributo:"ISS", aliquota:2, base:1000, valor:20 },{ tributo:"ISS", aliquota:5, base:1000, valor:50 }]);
    expect(d.semImpostos).toBe(1857);
  });
  it("mensaliza Zabbix em 12 meses sem mudar o valor contratado", () => {
    expect(demonstrativoCliente([{ ...parcela, preco:12000 }],1/12).total).toBe(1000);
    expect(demonstrativoCliente([parcela],12).total).toBe(12000);
  });
  it("reconcilia centavos somente no demonstrativo", () => {
    const d = demonstrativoCliente([{ ...parcela, preco: 123.47 }]);
    expect(Math.round((d.semImpostos + d.cargas.reduce((s,c)=>s+c.valor,0))*100)).toBe(12347);
    expect(parcela.preco).toBe(1000);
  });
  it("não preenche histórico incompleto com zero", () => {
    expect(() => demonstrativoCliente([{ ...parcela, issPerc: undefined as unknown as number }])).toThrow("Dados fiscais");
  });
  it("mantém zero como alíquota válida e exclui CBS", () => {
    expect(demonstrativoCliente([{ preco:100, pisPerc:0, cofinsPerc:0, issPerc:0 }])).toMatchObject({ total:100, semImpostos:100, impostos:0 });
  });
});