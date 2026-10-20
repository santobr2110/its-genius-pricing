import { comissaoFromRent, type ComissaoTier } from "@/lib/comissaoRentabilidade";
import { cascataNucleo, REGRA_SMART_ITO } from "@/lib/pricing/cascata";
import { decomporVenda, type ChegadaFixos } from "@/lib/pricing/chegada";
import { resolveParamsCargo, salarioFaixa, type BodyshopCargo, type BodyshopParams, type Faixa, type OrigemParam, type Regime } from "./calc";

/** New BodyShop rejects impossible prices; unlike legacy BodyShop it never caps Σ. */
export const REGRA_BODYSHOP_NOVO = { ...REGRA_SMART_ITO, ordem: [...REGRA_SMART_ITO.ordem] };

export type TaxPercs = { pisPerc: number; cofinsPerc: number; issPerc: number };
export interface LinhaBS {
  id: string; cargoId: string; faixa: Faixa; quantidade: number; regime: Regime;
  horasLinha: number | null; descontoPerc: number;
  iaJustificativa?: string; iaIndiceAderencia?: number;
}
export interface ConfigBS {
  municipio: string; duracaoMeses: number; dataInicio: string | null;
  descontoTotalPerc: number; convencao: "padrao_site" | "roi_ito";
  encFinancPerc: number | null; rentabilidadeAlvoPerc: number | null;
}
export const CONFIG_BS_PADRAO: ConfigBS = { municipio: "Joinville", duracaoMeses: 12, dataInicio: null, descontoTotalPerc: 0, convencao: "padrao_site", encFinancPerc: null, rentabilidadeAlvoPerc: null };
export interface EntradaLinhaBS {
  linhaId: string; cargoId: string; cargo: string; area: string; senioridade: string; nivelNum: number; faixa: Faixa;
  salarioBase: number; encargosPerc: number; indiretosPerc: number; beneficiosMensais: number;
  beneficiosProporcionais: boolean; horasPadrao: number; horasLinha: number; regime: Regime;
  quantidade: number; descontoPerc: number; codigoProduto: string; tax: TaxPercs | null;
  pisoRentabilidadePerc: number | null; origemParam: Record<string, OrigemParam>;
  iaJustificativa?: string; iaIndiceAderencia?: number; ausente?: boolean; salarioAusente?: boolean;
}
export interface GlobaisBS {
  rentabilidadeAlvoPerc: number; comissaoFixaPerc: number | null; retencaoPerc: number;
  irpjCsllPerc: number; encFinancPerc: number; descontoTotalPerc: number; duracaoMeses: number;
}
export function montarEntradas(linhas: LinhaBS[], catalogo: BodyshopCargo[], p: BodyshopParams, taxPorProduto: (codigo: string) => TaxPercs | null): EntradaLinhaBS[] {
  return linhas.map(l => {
    const c = catalogo.find(c => c.id === l.cargoId);
    const r = resolveParamsCargo(c ?? { beneficios_mensais: null, encargos_perc: null, indiretos_perc: null, horas_mensais: null, piso_rentabilidade_perc: null, codigo_produto: null }, p);
    const salario = c ? salarioFaixa(c, l.faixa) : null;
    return { linhaId: l.id, cargoId: l.cargoId, cargo: c?.cargo ?? "Cargo não encontrado", area: c?.area ?? "", senioridade: c?.senioridade ?? "", nivelNum: c?.nivel_num ?? 0, faixa: l.faixa,
      salarioBase: salario ?? 0, encargosPerc: r.encargosPerc, indiretosPerc: r.indiretosPerc, beneficiosMensais: r.beneficiosMensais,
      beneficiosProporcionais: p.beneficiosProporcionais, horasPadrao: r.horasMensais,
      horasLinha: l.horasLinha ?? (l.regime === "integral" ? r.horasMensais : p.horasMeioPeriodo), regime: l.regime,
      quantidade: l.quantidade, descontoPerc: l.descontoPerc, codigoProduto: r.codigoProduto, tax: taxPorProduto(r.codigoProduto),
      pisoRentabilidadePerc: r.pisoRentabilidadePerc, origemParam: r.origem,
      ...(l.iaJustificativa !== undefined ? { iaJustificativa: l.iaJustificativa } : {}),
      ...(l.iaIndiceAderencia !== undefined ? { iaIndiceAderencia: l.iaIndiceAderencia } : {}),
      ...(!c ? { ausente: true } : {}), ...(c && salario === null ? { salarioAusente: true } : {}) };
  });
}
export function memorialCusto(e: EntradaLinhaBS) {
  const fator = e.horasPadrao > 0 ? e.horasLinha / e.horasPadrao : 0;
  const base = e.salarioBase * fator;
  const encargos = base * e.encargosPerc / 100;
  const beneficios = e.beneficiosMensais * (e.beneficiosProporcionais ? fator : 1);
  const baseIndiretos = base + encargos + beneficios;
  const indiretos = baseIndiretos * e.indiretosPerc / 100;
  return { fator, base, encargos, beneficios, baseIndiretos, indiretos, total: baseIndiretos + indiretos };
}
export const custoMensalUnitario = (e: EntradaLinhaBS) => memorialCusto(e).total;
export interface LinhaResultadoBS {
  entrada: EntradaLinhaBS; custoUnitario: number; custoLinha: number; vendaTabela: number;
  precoFinal: number; lucro: number; rentabilidadePerc: number; comissaoPerc: number;
  descontoEfetivoPerc: number; comissaoInstavel: boolean; abaixoPiso: boolean;
  sigma: number; fixos: ChegadaFixos | null; erros: string[];
}
export function computeLinhaBS(e: EntradaLinhaBS, g: GlobaisBS, tiers: ComissaoTier[]): LinhaResultadoBS {
  const erros: string[] = [];
  if (e.ausente) erros.push("Cargo não encontrado no catálogo.");
  if (e.salarioAusente) erros.push("Faixa salarial não preenchida.");
  if (!Number.isInteger(e.quantidade) || e.quantidade < 1) erros.push("Quantidade deve ser um inteiro maior ou igual a 1.");
  if (!Number.isFinite(e.horasLinha) || e.horasLinha <= 0 || !Number.isFinite(e.horasPadrao) || e.horasPadrao <= 0) erros.push("Horas mensais devem ser maiores que zero.");
  if (!e.tax) erros.push(`Produto ${e.codigoProduto} sem alíquotas vigentes para o município.`);
  if (!Number.isFinite(e.salarioBase) || e.salarioBase < 0) erros.push("Salário inválido.");
  if (![e.descontoPerc, g.descontoTotalPerc].every(d => Number.isFinite(d) && d >= 0 && d <= 100)) erros.push("Desconto deve estar entre 0% e 100%.");
  if (!Number.isInteger(g.duracaoMeses) || g.duracaoMeses < 1) erros.push("Duração deve ser um número inteiro de meses maior que zero.");
  const custoUnitario = custoMensalUnitario(e);
  const comissao = g.comissaoFixaPerc ?? comissaoFromRent(g.rentabilidadeAlvoPerc, tiers);
  const descontoEfetivoPerc = 100 * (1 - (1 - e.descontoPerc / 100) * (1 - g.descontoTotalPerc / 100));
  const vazio = { entrada: e, custoUnitario, custoLinha: 0, vendaTabela: 0, precoFinal: 0, lucro: 0, rentabilidadePerc: 0, comissaoPerc: 0, descontoEfetivoPerc, comissaoInstavel: false, abaixoPiso: false, sigma: 0, fixos: null, erros };
  if (erros.length || !e.tax) return vazio;
  const custoLinha = custoUnitario * e.quantidade;
  const subida = cascataNucleo(custoLinha, { pis: e.tax.pisPerc, cofins: e.tax.cofinsPerc, iss: e.tax.issPerc, comissao: comissao + g.retencaoPerc, irpjCsll: g.irpjCsllPerc, encFinanc: g.encFinancPerc, lucro: g.rentabilidadeAlvoPerc }, REGRA_BODYSHOP_NOVO);
  if (subida.totalEncargosPerc >= 100) return { ...vazio, sigma: subida.totalEncargosPerc, erros: ["Soma dos percentuais ≥ 100%: preço impossível."] };
  const fixos = { ...e.tax, irpjCsllPerc: g.irpjCsllPerc, encFinancPerc: g.encFinancPerc, retencaoPerc: g.retencaoPerc };
  const d = decomporVenda(custoLinha, subida.precoVenda, descontoEfetivoPerc, fixos, tiers, g.comissaoFixaPerc);
  return { ...vazio, ...d, custoLinha, vendaTabela: subida.precoVenda, sigma: subida.totalEncargosPerc, fixos, abaixoPiso: e.pisoRentabilidadePerc != null && d.rentabilidadePerc < e.pisoRentabilidadePerc };
}
export function computeCarrinhoBS(entradas: EntradaLinhaBS[], g: GlobaisBS, tiers: ComissaoTier[]) {
  const linhas = entradas.map(e => computeLinhaBS(e, g, tiers));
  const ok = linhas.filter(l => !l.erros.length);
  const sum = (k: "custoLinha" | "vendaTabela" | "precoFinal" | "lucro") => ok.reduce((s, l) => s + l[k], 0);
  const precoFinalTotalMensal = sum("precoFinal"), lucroTotalMensal = sum("lucro");
  return { linhas, cascataBase: g, custoTotal: sum("custoLinha"), precoTabelaTotal: sum("vendaTabela"), precoFinalTotalMensal,
    precoFinalTotalContrato: precoFinalTotalMensal * g.duracaoMeses, lucroTotalMensal, lucroTotalContrato: lucroTotalMensal * g.duracaoMeses,
    rentabilidadePerc: precoFinalTotalMensal > 0 ? lucroTotalMensal / precoFinalTotalMensal * 100 : 0,
    temErros: linhas.some(l => l.erros.length > 0), abaixoPiso: ok.some(l => l.abaixoPiso) };
}
export type CarrinhoBS = ReturnType<typeof computeCarrinhoBS>;
export interface SnapshotBS extends GlobaisBS {
  versao: number; congeladoEm: string; congeladoPor: string; municipio: string;
  convencao: ConfigBS["convencao"]; dataInicio: string | null; beneficiosProporcionais: boolean;
  tiers: ComissaoTier[];
  itens: Array<Omit<EntradaLinhaBS, "tax"> & { pisPerc: number | null; cofinsPerc: number | null; issPerc: number | null }>;
}
export function congelar(entradas: EntradaLinhaBS[], g: GlobaisBS, c: ConfigBS, usuario: string, tiers: ComissaoTier[], versaoAnterior = 0, agora = new Date()): SnapshotBS {
  return { ...g, versao: versaoAnterior + 1, congeladoEm: agora.toISOString(), congeladoPor: usuario, municipio: c.municipio,
    convencao: c.convencao, dataInicio: c.dataInicio, beneficiosProporcionais: entradas[0]?.beneficiosProporcionais ?? true,
    tiers: tiers.map(t => ({ ...t })), itens: entradas.map(({ tax, ...e }) => ({ ...e, origemParam: { ...e.origemParam }, pisPerc: tax?.pisPerc ?? null, cofinsPerc: tax?.cofinsPerc ?? null, issPerc: tax?.issPerc ?? null })) };
}
export function entradasDoSnapshot(s: SnapshotBS): EntradaLinhaBS[] {
  return s.itens.map(({ pisPerc, cofinsPerc, issPerc, ...e }) => ({ ...e, origemParam: { ...e.origemParam }, tax: pisPerc == null || cofinsPerc == null || issPerc == null ? null : { pisPerc, cofinsPerc, issPerc } }));
}
export const globaisDoSnapshot = (s: SnapshotBS): GlobaisBS => ({ rentabilidadeAlvoPerc: s.rentabilidadeAlvoPerc, comissaoFixaPerc: s.comissaoFixaPerc, retencaoPerc: s.retencaoPerc, irpjCsllPerc: s.irpjCsllPerc, encFinancPerc: s.encFinancPerc, descontoTotalPerc: s.descontoTotalPerc, duracaoMeses: s.duracaoMeses });
export function mesmasEntradas(s: SnapshotBS, linhas: LinhaBS[], c: ConfigBS) {
  return s.municipio === c.municipio && s.duracaoMeses === c.duracaoMeses && s.dataInicio === c.dataInicio && s.convencao === c.convencao && s.descontoTotalPerc === c.descontoTotalPerc
    && (c.encFinancPerc == null || c.encFinancPerc === s.encFinancPerc) && (c.rentabilidadeAlvoPerc == null || c.rentabilidadeAlvoPerc === s.rentabilidadeAlvoPerc)
    && s.itens.length === linhas.length && s.itens.every((i, k) => { const l = linhas[k]; return l && l.id === i.linhaId && l.cargoId === i.cargoId && l.faixa === i.faixa && l.regime === i.regime && l.quantidade === i.quantidade && l.descontoPerc === i.descontoPerc && (l.horasLinha == null || l.horasLinha === i.horasLinha) && l.iaJustificativa === i.iaJustificativa && l.iaIndiceAderencia === i.iaIndiceAderencia; });
}
export function diferencasParametros(s: SnapshotBS, e: EntradaLinhaBS[], g: GlobaisBS, tiers: ComissaoTier[]) {
  const diffs: string[] = [];
  for (const k of Object.keys(g) as Array<keyof GlobaisBS>) if (s[k] !== g[k]) diffs.push(`${k}: ${s[k] ?? "escala"} → ${g[k] ?? "escala"}`);
  if (tiers.length !== s.tiers.length || tiers.some((t, k) => { const a = s.tiers[k]; return !a || a.minRent !== t.minRent || a.maxRent !== t.maxRent || a.comissao !== t.comissao; })) diffs.push("Escala de comissão alterada");
  const antigos = entradasDoSnapshot(s);
  const igual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== "object" || typeof b !== "object") return false;
    const aa = a as Record<string, unknown>, bb = b as Record<string, unknown>;
    const keys = Array.from(new Set([...Object.keys(aa), ...Object.keys(bb)]));
    return keys.every(k => igual(aa[k], bb[k]));
  };
  for (const linha of e) { const a = antigos.find(i => i.linhaId === linha.linhaId); if (!igual(a, linha)) diffs.push(`${linha.cargo} · ${linha.senioridade}: entradas alteradas`); }
  return diffs;
}
export function proximoCodigoBS(existentes: (string | null)[], hoje = new Date()): string {
  const d = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, "0")}${String(hoje.getDate()).padStart(2, "0")}`;
  const p = `ITS-BS-${d}-`;
  const max = existentes.reduce((m, c) => c?.startsWith(p) ? Math.max(m, Number(c.slice(p.length)) || 0) : m, 0);
  return `${p}${String(max + 1).padStart(3, "0")}`;
}