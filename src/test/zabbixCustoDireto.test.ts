import { describe, it, expect } from "vitest";
import { computeLinha, type EntradaLinha, type GlobaisZbx } from "@/lib/zabbix/carrinho";

const e: EntradaLinha = {
  linhaId: "l", subscriptionId: "s", partNumber: "SUP-ZBX-HA-GLD", nome: "HA Gold", categoria: "suporte", unidade: "server",
  vendaUnitaria: 0, listaUsd: null, listaBrl: null, cambio: 5.5,
  descontos: { ro: 70, semRo: 55, pgto30Ro: 20, pgto30SemRo: 20 },
  origemDesconto: { ro: "sku", semRo: "sku", pgto30Ro: "sku", pgto30SemRo: "sku" },
  codigoProduto: "ZBX2", tax: { pisPerc: 0.65, cofinsPerc: 3, issPerc: 3 },
  quantidade: 2, descontoPerc: 0, permiteQuantidade: true, quantidadeMaxima: null, pisoRentabilidadePerc: null,
  custoDireto: 8167.5, margemPerc: 30,
};
const g: GlobaisZbx = { cenario: { temRO: true, pagamento30d: true, publicTender: true }, comissaoFixaPerc: 5, retencaoPerc: 5, irpjCsllPerc: 10.34, encFinancPerc: 0, descontoTotalPerc: 0 };

describe("Zabbix SKU de custo direto", () => {
  it("usa o custo informado sem RO, pagamento 30d ou Public Tender", () => {
    const r = computeLinha(e, g, []);
    expect(r.custoLinha).toBeCloseTo(16335, 2);
    expect(r.publicTender).toBe(false);
  });
  it("preço sai da cascata e a rentabilidade volta igual à margem", () => {
    const r = computeLinha(e, g, []);
    const sigma = 0.65 + 3 + 3 + 10.34 + 5 + 5 + 30;
    expect(r.precoFinal).toBeCloseTo(16335 / (1 - sigma / 100), 2);
    expect(r.rentabilidadePerc).toBeCloseTo(30, 6);
  });
  it("desconto manual do vendedor reduz o preço", () => {
    const r = computeLinha({ ...e, descontoPerc: 10 }, g, []);
    expect(r.rentabilidadePerc).toBeLessThan(30);
  });
});
