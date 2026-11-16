import { describe, it, expect } from "vitest";
import { ajustesForaDoPadrao, calculatorLimpo, CHAVES_LIMPAS_NOVA_PRECIFICACAO } from "@/lib/novaPrecificacao";
import { ITSM_DEFAULTS } from "@/hooks/useITSMCalculator";
import { RESTRICOES_GERAIS_DEFAULT } from "@/data/escopoProposicao";

describe("Nova precificação", () => {
  it("zera inventário e mantém parâmetros do usuário", () => {
    const atual = { ...ITSM_DEFAULTS, qtdServidores: 99, complexMultiSites: true, valorHoraN3: 321 } as Record<string, unknown>;
    const limpo = calculatorLimpo(atual);
    expect(limpo.qtdServidores).toBe(ITSM_DEFAULTS.qtdServidores);
    expect(limpo.complexMultiSites).toBe(ITSM_DEFAULTS.complexMultiSites);
    expect(limpo.valorHoraN3).toBe(321);
  });
  it("limpa escopo, rotinas desligadas e cidade do ISS; mantém código do produto", () => {
    const chaves = CHAVES_LIMPAS_NOVA_PRECIFICACAO.map((c) => c.chave);
    expect(chaves).toContain("ito.smart-ito.escopo:proposicao");
    expect(chaves).toContain("ito.smart-ito.gestao-ti:rotinasOff");
    expect(chaves).toContain("ito.smart-ito.financeiro.cidadeIss");
    expect(chaves).not.toContain("ito.smart-ito.financeiro.codigoProduto");
    expect(chaves).not.toContain("ito.smart-ito.gestao-ti:rotinas");
  });
  it("aviso ao salvar lista 2 rotinas desligadas", () => {
    const v: Record<string, unknown> = { "gestao-ti:rotinasOff": ["a", "b"], "gestao-ti:smartOp:horasMelhoria": 8 };
    expect(ajustesForaDoPadrao((k) => v[k])).toEqual(["2 rotinas desligadas", "Horas de melhoria: 8"]);
  });
  it("rascunho limpo não gera aviso", () => {
    const v: Record<string, unknown> = { "escopo:restricoesGerais": RESTRICOES_GERAIS_DEFAULT, "gestao-ti:rotinasOff": [] };
    expect(ajustesForaDoPadrao((k) => v[k])).toEqual([]);
  });
});
