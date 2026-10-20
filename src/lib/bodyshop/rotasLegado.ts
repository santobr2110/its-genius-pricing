const BASE = "/profissionais-alocados";

/** Published legacy links remain valid; destination permissions still apply. */
export const ROTAS_LEGADO_BS = [
  ["", ""],
  ["selecao-manual", ""],
  ["precificacao-manual", ""],
  ["selecao-ia", ""],
  ["precificacao-ia", ""],
  ["base-conhecimento", "configuracoes/cargos"],
  ["cotacoes", "cotacoes"],
  ["financeiro", "financeiro"],
  ["financeiro-legacy", "financeiro"],
  ["financeiro/impostos", "financeiro/impostos"],
  ["financeiro/comissoes", "financeiro/comissoes"],
].map(([origem, destino]) => ({
  origem: `${BASE}/legado${origem ? `/${origem}` : ""}`,
  destino: `${BASE}${destino ? `/${destino}` : ""}`,
}));

export const ALIASES_LEGADO_BS = ROTAS_LEGADO_BS
  .filter(r => /\/(selecao-manual|precificacao-manual|selecao-ia|precificacao-ia|base-conhecimento|financeiro-legacy)$/.test(r.origem))
  .map(r => ({ ...r, origem: r.origem.replace("/legado", "") }));