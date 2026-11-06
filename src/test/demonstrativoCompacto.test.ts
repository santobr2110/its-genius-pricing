import { expect,it } from "vitest";
import { aliquotasDemonstrativo, demonstrativoCliente, linhasDemonstrativo } from "@/lib/pricing/demonstrativoCliente";
it("o novo demonstrativo conserva os três totais e as alíquotas distintas",()=>{
  const d=demonstrativoCliente([{preco:1000,issPerc:5,pisPerc:0.65,cofinsPerc:3},{preco:1000,issPerc:2,pisPerc:0.65,cofinsPerc:3}]);
  expect(d.versao).toBe(2);expect(d.total).toBe(2000);expect(d.impostos).toBe(143);expect(d.semImpostos).toBe(1857);
  expect(aliquotasDemonstrativo(d)).toBe("ISS 2% / 5% · PIS 0,65% · COFINS 3%");
  expect(linhasDemonstrativo(d).filter(l=>l.includes("R$")).length).toBe(3);
});
it("a versão antiga mantém todos os valores tributários congelados",()=>{
  const d={...demonstrativoCliente([{preco:1000,issPerc:5,pisPerc:0.65,cofinsPerc:3}]),versao:1 as const};
  expect(linhasDemonstrativo(d).length).toBe(6);
  expect(linhasDemonstrativo(d)[1]).toBe("ISS 5% sobre R$ 1.000,00: R$ 50,00");
});