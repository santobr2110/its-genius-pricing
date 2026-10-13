import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { computeCascata, resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { resolveTaxRates, type TaxCode, type TaxRate } from "@/lib/pricing/taxRates";

const base = { pisPerc: 0, cofinsPerc: 0, issPerc: 0, comissaoPerc: 0, encFinancPerc: 0 };

describe("computeCascata", () => {
  it("Σ 43,27% → PV ≈ 17.627 e camadas somam o PV", () => {
    const r = computeCascata(10000, { ...base, pisPerc: 1.65, cofinsPerc: 7.6, issPerc: 2, comissaoPerc: 3, irpjCsllPerc: 10.3, encFinancPerc: 0.72, lucroPerc: 18 });
    expect(r.totalEncargosPerc).toBeCloseTo(43.27, 6);
    expect(r.precoVenda).toBeCloseTo(17627, 0);
    const soma = r.custo + r.pis + r.cofins + r.iss + r.comissao + r.irpjCsll + r.encFinanc + r.lucro;
    expect(Math.abs(soma - r.precoVenda)).toBeLessThan(0.01);
  });
  it("Σ 45,54% → PV ≈ 18.362", () => {
    const r = computeCascata(10000, { ...base, irpjCsllPerc: 12.57, lucroPerc: 32.97 });
    expect(r.precoVenda).toBeCloseTo(18362, 0);
  });
  it("Σ ≥ 100 → inválido, sem divisão por zero", () => {
    const r = computeCascata(10000, { ...base, irpjCsllPerc: 50, lucroPerc: 50 });
    expect(r.invalido).toBe(true);
    expect(r.precoVenda).toBe(0);
  });
  it("IR/CSLL: padrão 10,30; roi_ito ≈ 13,8", () => {
    expect(resolveIrpjCsllPerc("padrao_site")).toBeCloseTo(10.3, 6);
    expect(resolveIrpjCsllPerc("roi_ito")).toBeCloseTo(13.8, 1);
  });
});

// Lê o seed da migration e compara com o arquivo estático (16 códigos × 3 municípios).
function loadSeed() {
  const dir = path.resolve(__dirname, "../../drizzle/migrations");
  const file = readdirSync(dir).find((f) => f.includes("treinamento_fase1a_cadastros"))!;
  const sql = readFileSync(path.join(dir, file), "utf8");
  const rates = [...sql.matchAll(/\('([^']+)','(Joinville|Blumenau|Barueri)',([\d.]+),([\d.]+),([\d.]+),(true|false)\)/g)]
    .map((m) => ({ codigo: m[1], municipio: m[2], pis: +m[3], cofins: +m[4], iss: +m[5], ac: m[6] === "true" }));
  return rates;
}

describe("cadastro tributário", () => {
  const seed = loadSeed();
  it("resolveTaxRates respeita município e vigência", () => {
    const codes: TaxCode[] = [{ id: "c1", codigo: "TRN", nome: "T", descricao: null, lc116_item: "8.02", ativo: true, a_confirmar: true }];
    const rates: TaxRate[] = [
      { id: "r1", tax_product_code_id: "c1", municipio: "Joinville", pis_perc: 1.65, cofins_perc: 7.6, iss_perc: 2, vigencia_inicio: "2000-01-01", vigencia_fim: "2026-12-31", a_confirmar: false },
      { id: "r2", tax_product_code_id: "c1", municipio: "Joinville", pis_perc: 1.65, cofins_perc: 7.6, iss_perc: 3, vigencia_inicio: "2027-01-01", vigencia_fim: null, a_confirmar: false },
    ];
    expect(resolveTaxRates("TRN", "joinville", "2026-10-13", codes, rates)?.issPerc).toBe(2);
    expect(resolveTaxRates("TRN", "Joinville", "2027-02-01", codes, rates)?.issPerc).toBe(3);
    expect(resolveTaxRates("TRN", "Joinville", "2027-02-01", codes, rates)?.aConfirmar).toBe(true);
    expect(resolveTaxRates("TRN", "Blumenau", "2026-10-13", codes, rates)).toBeNull();
  });
});
