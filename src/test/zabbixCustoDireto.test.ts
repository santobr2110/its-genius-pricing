import { describe, it, expect } from "vitest";
import { computeLinha, congelar, entradasDoSnapshot, globaisDoSnapshot, linhasDoSnapshot, CONFIG_ZBX_PADRAO, type EntradaLinha, type GlobaisZbx, type LinhaZbx } from "@/lib/zabbix/carrinho";
import { mesmasEntradas } from "@/pages/zabbix/useZabbixResultado";

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
  const config = { ...CONFIG_ZBX_PADRAO, publicTender: true };
  const linha: LinhaZbx = { id: "l", subscriptionId: "s", quantidade: 2, descontoPerc: 0 };
  const snap = congelar([e], g, config.municipio, e.cambio, "qa");

  it("margem padrão implícita fica intacta no salvamento antigo e na recarga", () => {
    const recarregado = JSON.parse(JSON.stringify({ linhas: [linha], snapshot: snap }));
    expect(recarregado.linhas[0].margemPerc).toBeUndefined();
    expect(recarregado.snapshot.itens[0].margemPerc).toBe(30);
    expect(mesmasEntradas(recarregado.snapshot, recarregado.linhas, config)).toBe(true);
  });
  it("novo salvamento materializa a margem congelada de 30 nas linhas", () => {
    const linhas = linhasDoSnapshot(snap);
    expect(linhas[0].margemPerc).toBe(30);
    expect(mesmasEntradas(snap, linhas, config)).toBe(true);
  });
  it.each([0, 25, 35])("editar a margem para %s invalida o congelamento", (margemPerc) => {
    expect(mesmasEntradas(snap, [{ ...linha, margemPerc }], config)).toBe(false);
  });
  it("quantidade ou desconto manual editados continuam invalidando", () => {
    expect(mesmasEntradas(snap, [{ ...linha, quantidade: 3 }], config)).toBe(false);
    expect(mesmasEntradas(snap, [{ ...linha, descontoPerc: 10 }], config)).toBe(false);
  });
  it("preço congelado mantém a margem de 30 sem consultar parâmetros atuais", () => {
    const r = computeLinha(entradasDoSnapshot(snap)[0], globaisDoSnapshot(snap), []);
    expect(r.precoFinal).toBeCloseTo(16335 / (1 - 56.99 / 100), 2);
    expect(r.rentabilidadePerc).toBeCloseTo(30, 6);
  });
  it("subscrições de chegada sem margem continuam intactas", () => {
    const antigo = congelar([{ ...e, custoDireto: undefined, margemPerc: undefined }], g, config.municipio, e.cambio, "qa");
    expect(mesmasEntradas(antigo, [linha], config)).toBe(true);
  });
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
