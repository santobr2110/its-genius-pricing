import { describe, expect, it } from "vitest";
import { ROTAS_LEGADO_BS, ALIASES_LEGADO_BS } from "@/lib/bodyshop/rotasLegado";
import { paramsFromRows } from "@/lib/bodyshop/calc";
import { describeStatus, pickTier, type ApprovalTier } from "@/lib/approval/types";

describe("BodyShop — liberação v1", () => {
  it("ausência de faixa ativa libera a oferta", () => {
    const tier: ApprovalTier = { id: "bs", offering: "profissionais-alocados", label: "A calibrar", min_pct: null, max_pct: null, mode: "all", ativo: false, sort_order: 0, role_ids: ["diretor"] };
    expect(pickTier([], 20)).toBeNull();
    expect(pickTier([tier], -5)).toBeNull();
    expect(pickTier([{ ...tier, ativo: true }], -5)?.id).toBe("bs");
    expect(describeStatus("not_required")).toBe("Liberado");
  });
  it.each([
    ["selecao-manual", ""], ["selecao-ia", ""],
    ["base-conhecimento", "/configuracoes/cargos"], ["cotacoes", "/cotacoes"],
    ["financeiro", "/financeiro"], ["financeiro/impostos", "/financeiro/impostos"],
    ["financeiro/comissoes", "/financeiro/comissoes"],
  ])("endereço antigo %s aponta para o substituto", (origem, destino) => {
    expect(ROTAS_LEGADO_BS.find(r => r.origem === `/profissionais-alocados/legado/${origem}`)?.destino).toBe(`/profissionais-alocados${destino}`);
  });
  it("aliases de seleção não levam de volta ao legado", () => {
    expect(ALIASES_LEGADO_BS.find(r => r.origem === "/profissionais-alocados/precificacao-manual")?.destino).toBe("/profissionais-alocados");
  });
  it("INSS nasce em zero e não altera a retenção existente de 5%", () => {
    expect(paramsFromRows([]).retencaoPerc).toBe(5);
    expect(paramsFromRows([{ key: "retencao_inss_perc", value: 0 }]).retencaoPerc).toBe(5);
  });
  it("INSS de 11% pode ser ligado pelo parâmetro, somando à retenção", () => {
    expect(paramsFromRows([{ key: "retencao_perc", value: 5 }, { key: "retencao_inss_perc", value: 11 }]).retencaoPerc).toBe(16);
  });
});