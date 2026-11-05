import { describe, expect, it } from "vitest";
import { paramsFromRows, type ZabbixSubscription } from "@/lib/zabbix/calc";
import { computeLinha, congelar, custoUnitario, entradasDoSnapshot, globaisDoSnapshot, montarEntradas, CONFIG_ZBX_PADRAO, type GlobaisZbx } from "@/lib/zabbix/carrinho";
import { mesmasEntradas } from "@/pages/zabbix/useZabbixResultado";

const subscription: ZabbixSubscription = {
  id: "support", slug: "support", part_number: "SUP", nome: "Support", categoria: "suporte", unidade: "server", nivel: "Gold",
  venda_brl: 2000, lista_usd: null, lista_brl: 1000, ro_perc: null, sem_ro_perc: null, pgto30_ro_perc: null, pgto30_sem_ro_perc: null,
  permite_quantidade: true, quantidade_maxima: null, codigo_produto: "ZBX", descricao: null, piso_rentabilidade_perc: null,
  ativo: true, ordem: 0, campos_a_confirmar: [],
};
const lines = [{ id: "line", subscriptionId: "support", quantidade: 1, descontoPerc: 0 }];
const input = (percent = 35, categoria: "suporte" | "academy" = "suporte") => montarEntradas(lines, [{ ...subscription, categoria }], paramsFromRows([{ key: "desconto_public_tender_suporte", value: percent }]), () => ({ pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 2 }))[0];
const globals: GlobaisZbx = { cenario: { temRO: false, pagamento30d: true, publicTender: true }, comissaoFixaPerc: 0, retencaoPerc: 0, irpjCsllPerc: 10.34, encFinancPerc: 0, descontoTotalPerc: 0 };

describe("Zabbix Public Tender", () => {
  it("substitui parceria de 55% por 35%, sem acumular", () => {
    const e = input();
    expect(custoUnitario(e, { temRO: false, pagamento30d: false })).toBeCloseTo(450);
    expect(custoUnitario(e, { temRO: false, pagamento30d: false, publicTender: true })).toBeCloseTo(650);
    expect(computeLinha(e, globals, []).descBasePerc).toBe(35);
  });
  it("combina normalmente com pagamento 30 dias", () => {
    const r = computeLinha(input(), globals, []);
    expect(r.descPgtoPerc).toBe(20);
    expect(r.custoUnitario).toBeCloseTo(520);
    expect(r.precoFinal).toBe(2000);
    expect(r.lucro).toBeCloseTo(1048.2);
  });
  it("percentual vem de Parâmetros, inclusive zero", () => {
    expect(custoUnitario(input(25), globals.cenario)).toBeCloseTo(600);
    expect(custoUnitario(input(0), globals.cenario)).toBeCloseTo(800);
    expect(paramsFromRows([]).publicTenderPerc).toBe(35);
  });
  it("aplica Public Tender ao Suporte mesmo com RO marcado, sem somar RO", () => {
    expect(custoUnitario(input(), { ...globals.cenario, temRO: true })).toBeCloseTo(520);
  });
  it("Academy mantém descontos originais nos dois cenários de RO", () => {
    const e = input(35, "academy");
    expect(custoUnitario(e, { ...globals.cenario, temRO: true })).toBeCloseTo(700);
    expect(custoUnitario(e, globals.cenario)).toBeCloseTo(1000);
    expect(computeLinha(e, globals, []).publicTender).toBe(false);
  });
  it("pagamento 30 dias mantém a exceção do SKU sem RO", () => {
    const e = input();
    e.descontos.pgto30SemRo = 40;
    expect(custoUnitario(e, globals.cenario)).toBeCloseTo(390);
  });
  it("congela ativação e percentual, sem recalcular com novos parâmetros", () => {
    const snap = congelar([input()], globals, "Joinville", 5.5, "tester");
    expect(snap.cenario.publicTender).toBe(true);
    expect(snap.itens[0].publicTenderPerc).toBe(35);
    expect(custoUnitario(entradasDoSnapshot(snap)[0], globaisDoSnapshot(snap).cenario)).toBeCloseTo(520);
    expect(custoUnitario(input(25), globals.cenario)).toBeCloseTo(600);
    expect(mesmasEntradas(snap, lines, { ...CONFIG_ZBX_PADRAO, temRO: false, publicTender: true })).toBe(true);
    expect(mesmasEntradas(snap, lines, { ...CONFIG_ZBX_PADRAO, temRO: false, publicTender: false })).toBe(false);
  });
  it("snapshot legado sem Public Tender continua com parceria de 55%", () => {
    const e = input();
    delete e.publicTenderPerc;
    const snap = congelar([e], { ...globals, cenario: { temRO: false, pagamento30d: true } }, "Joinville", 5.5, "tester");
    expect(custoUnitario(entradasDoSnapshot(snap)[0], globaisDoSnapshot(snap).cenario)).toBeCloseTo(360);
    expect(mesmasEntradas(snap, lines, { ...CONFIG_ZBX_PADRAO, temRO: false })).toBe(true);
  });
  it("bloqueia percentuais Public Tender fora de 0 a 100", () => {
    expect(computeLinha(input(101), globals, []).erros).toContain("Desconto Public Tender deve estar entre 0% e 100%.");
    expect(computeLinha(input(-1), globals, []).erros).toContain("Desconto Public Tender deve estar entre 0% e 100%.");
  });
});