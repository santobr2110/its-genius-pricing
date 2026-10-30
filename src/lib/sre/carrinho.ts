// Motor de cálculo dos Pacotes Consultivos Zabbix SRE (Fase 3). Funções puras — ver src/test/sreCalc.test.ts.
// Etapa 1 resolve as entradas (catálogo vivo ou snapshot congelado); etapa 2 calcula só sobre EntradaLinhaSre.
// Preço nasce do custo (horas × custo/hora) pela cascata, com a rentabilidade definida pelo vendedor na cotação (igual ao Smart ITO); decomporVenda só reavalia após desconto.
import { computeCascata } from "@/lib/pricing/cascata";
import { decomporVenda, type ChegadaFixos } from "@/lib/pricing/chegada";
import { comissaoFromRent, type ComissaoTier } from "@/lib/comissaoRentabilidade";
import type { SreCampanha, SrePacote, SreParams } from "./calc";

export type TaxPercs = { pisPerc: number; cofinsPerc: number; issPerc: number };
export type OrigemParam = "pacote" | "parametro";
type OrigemKey = "pctGestao" | "custoExec" | "custoGestao" | "produto";

/** Herança: valor do pacote quando não for null; caso contrário, o parâmetro geral. */
export function resolveParamsPacote(
  p: Pick<SrePacote, "pct_horas_gestao" | "custo_hora_execucao" | "custo_hora_gestao" | "codigo_produto">, g: SreParams,
): { pctHorasGestao: number; custoHoraExecucao: number; custoHoraGestao: number; codigoProduto: string; origem: Record<OrigemKey, OrigemParam> } {
  const num = (v: number | null, d: number): [number, OrigemParam] => (v == null ? [d, "parametro"] : [Number(v), "pacote"]);
  const [pct, o1] = num(p.pct_horas_gestao, g.pctHorasGestao);
  const [ce, o2] = num(p.custo_hora_execucao, g.custoHoraExecucao);
  const [cg, o3] = num(p.custo_hora_gestao, g.custoHoraGestao);
  const cod = p.codigo_produto?.trim() || null;
  return { pctHorasGestao: pct, custoHoraExecucao: ce, custoHoraGestao: cg, codigoProduto: cod ?? g.produtoPadrao,
    origem: { pctGestao: o1, custoExec: o2, custoGestao: o3, produto: cod ? "pacote" : "parametro" } };
}

export interface LinhaSre { id: string; pacoteId: string; quantidade: number; descontoPerc: number }

/** rentabilidadePerc null = padrão dos Parâmetros SRE. */
export interface ConfigSre { municipio: string; descontoTotalPerc: number; encFinancPerc: number | null; rentabilidadePerc: number | null }
export const CONFIG_SRE_PADRAO: ConfigSre = { municipio: "Joinville", descontoTotalPerc: 0, encFinancPerc: null, rentabilidadePerc: null };

export interface EntradaLinhaSre {
  linhaId: string; pacoteId: string;
  partNumber: string; nome: string;
  horasExecucao: number; pctHorasGestao: number;
  custoHoraExecucao: number; custoHoraGestao: number;
  rentabilidadeAlvoPerc: number;
  quantidade: number; descontoPerc: number;
  codigoProduto: string; tax: TaxPercs | null;
  origemParam: Record<string, OrigemParam>;
  /** Pacote não encontrado no catálogo (só no caminho vivo). */
  ausente?: boolean;
}

export interface CampanhaAplicada { id: string; nome: string; descontoPerc: number }

/** Parâmetros globais do cálculo (vivos ou congelados). */
export interface GlobaisSre {
  comissaoFixaPerc: number | null; retencaoPerc: number; irpjCsllPerc: number; irpjCsllConvencao: string;
  encFinancPerc: number; descontoTotalPerc: number; campanha: CampanhaAplicada | null;
}

/** Campanha ativa cuja vigência contém dataRef (fim nulo = aberta), ou null. */
export function campanhaVigente(campanhas: SreCampanha[], dataRef: string): CampanhaAplicada | null {
  const c = campanhas.find((x) => x.ativo && x.vigencia_inicio <= dataRef && (x.vigencia_fim == null || dataRef <= x.vigencia_fim));
  return c ? { id: c.id, nome: c.nome, descontoPerc: Number(c.desconto_perc) } : null;
}

export function montarEntradas(
  linhas: LinhaSre[], catalogo: SrePacote[], params: SreParams, taxPorProduto: (codigo: string) => TaxPercs | null,
  /** Rentabilidade da cotação, definida pelo vendedor — a mesma para todos os pacotes. */
  rentabilidadePerc: number,
): EntradaLinhaSre[] {
  const byId = new Map(catalogo.map((p) => [p.id, p]));
  return linhas.map((l) => {
    const p = byId.get(l.pacoteId);
    if (!p) {
      return { linhaId: l.id, pacoteId: l.pacoteId, partNumber: "—", nome: "Pacote não encontrado", horasExecucao: 0, pctHorasGestao: 0,
        custoHoraExecucao: 0, custoHoraGestao: 0, rentabilidadeAlvoPerc: 0, quantidade: l.quantidade, descontoPerc: l.descontoPerc,
        codigoProduto: "", tax: null, origemParam: {}, ausente: true };
    }
    const r = resolveParamsPacote(p, params);
    return {
      linhaId: l.id, pacoteId: p.id, partNumber: p.part_number, nome: p.nome,
      horasExecucao: Number(p.horas_execucao), pctHorasGestao: r.pctHorasGestao,
      custoHoraExecucao: r.custoHoraExecucao, custoHoraGestao: r.custoHoraGestao,
      rentabilidadeAlvoPerc: rentabilidadePerc,
      quantidade: l.quantidade, descontoPerc: l.descontoPerc,
      codigoProduto: r.codigoProduto, tax: taxPorProduto(r.codigoProduto), origemParam: { ...r.origem },
    };
  });
}

/** Horas de gestão do pacote. Não são faturadas — são custo interno. */
export function horasGestao(e: EntradaLinhaSre): number {
  return (e.horasExecucao * e.pctHorasGestao) / 100;
}

/** Custo de UM pacote. */
export function custoPacote(e: EntradaLinhaSre): number {
  return e.horasExecucao * e.custoHoraExecucao + horasGestao(e) * e.custoHoraGestao;
}

/** Desconto efetivo: campanha × linha × total, compostos multiplicativamente. */
export function descontoEfetivo(campanhaPerc: number, linhaPerc: number, totalPerc: number): number {
  return 100 * (1 - (1 - (campanhaPerc || 0) / 100) * (1 - (linhaPerc || 0) / 100) * (1 - (totalPerc || 0) / 100));
}

export interface LinhaResultadoSre {
  entrada: EntradaLinhaSre;
  horasGestaoLinha: number; custoLinha: number; comissaoCascataPerc: number;
  precoTabela: number; descontoEfetivoPerc: number; precoFinal: number;
  rentabilidadePerc: number; comissaoPerc: number; comissaoInstavel: boolean; lucro: number;
  valorHoraExecucao: number; fixos: ChegadaFixos | null; erros: string[];
}

export function computeLinhaSre(e: EntradaLinhaSre, g: GlobaisSre, tiers: ComissaoTier[]): LinhaResultadoSre {
  const erros: string[] = [];
  const q = e.quantidade;
  if (e.ausente) erros.push("Pacote não encontrado no catálogo.");
  if (!Number.isInteger(q) || q < 1) erros.push("Quantidade deve ser um inteiro maior ou igual a 1.");
  if (!e.ausente && !(e.horasExecucao > 0)) erros.push("Pacote sem horas de execução.");
  if (!e.ausente && !e.tax) erros.push(`Produto ${e.codigoProduto} sem alíquotas para o município.`);
  const descontoEfetivoPerc = descontoEfetivo(g.campanha?.descontoPerc ?? 0, e.descontoPerc, g.descontoTotalPerc);
  const comissaoCascataPerc = g.comissaoFixaPerc ?? comissaoFromRent(e.rentabilidadeAlvoPerc, tiers);
  const vazio = { entrada: e, horasGestaoLinha: 0, custoLinha: 0, comissaoCascataPerc, precoTabela: 0, descontoEfetivoPerc, precoFinal: 0,
    rentabilidadePerc: 0, comissaoPerc: 0, comissaoInstavel: false, lucro: 0, valorHoraExecucao: 0, fixos: null };
  if (erros.length) return { ...vazio, erros };
  const custoLinha = custoPacote(e) * q;
  const cas = computeCascata(custoLinha, { ...e.tax!, comissaoPerc: comissaoCascataPerc + g.retencaoPerc,
    irpjCsllPerc: g.irpjCsllPerc, encFinancPerc: g.encFinancPerc, lucroPerc: e.rentabilidadeAlvoPerc });
  if (cas.invalido) return { ...vazio, custoLinha, erros: ["Preço impossível: soma dos percentuais ≥ 100%."] };
  const fixos: ChegadaFixos = { ...e.tax!, irpjCsllPerc: g.irpjCsllPerc, encFinancPerc: g.encFinancPerc, retencaoPerc: g.retencaoPerc };
  const d = decomporVenda(custoLinha, cas.precoVenda, descontoEfetivoPerc, fixos, tiers, g.comissaoFixaPerc);
  return {
    entrada: e, horasGestaoLinha: horasGestao(e) * q, custoLinha, comissaoCascataPerc,
    precoTabela: cas.precoVenda, descontoEfetivoPerc, precoFinal: d.precoFinal,
    rentabilidadePerc: d.rentabilidadePerc, comissaoPerc: d.comissaoPerc, comissaoInstavel: d.comissaoInstavel, lucro: d.lucro,
    valorHoraExecucao: d.precoFinal / (e.horasExecucao * q), fixos, erros,
  };
}

export interface CarrinhoSre {
  linhas: LinhaResultadoSre[];
  cascataBase: { irpjCsllPerc: number; encFinancPerc: number; retencaoPerc: number; comissaoFixaPerc: number | null };
  campanha: CampanhaAplicada | null;
  custoTotal: number; horasExecucaoTotal: number; horasGestaoTotal: number;
  precoTabelaTotal: number; precoFinalTotal: number; lucroTotal: number;
  rentabilidadePerc: number; valorHoraMedio: number; temErros: boolean;
}

export function computeCarrinhoSre(entradas: EntradaLinhaSre[], g: GlobaisSre, tiers: ComissaoTier[]): CarrinhoSre {
  const linhas = entradas.map((e) => computeLinhaSre(e, g, tiers));
  const ok = linhas.filter((l) => l.erros.length === 0);
  const sum = (f: (l: LinhaResultadoSre) => number) => ok.reduce((s, l) => s + f(l), 0);
  const precoFinalTotal = sum((l) => l.precoFinal);
  const lucroTotal = sum((l) => l.lucro);
  const horasExecucaoTotal = sum((l) => l.entrada.horasExecucao * l.entrada.quantidade);
  return {
    linhas,
    cascataBase: { irpjCsllPerc: g.irpjCsllPerc, encFinancPerc: g.encFinancPerc, retencaoPerc: g.retencaoPerc, comissaoFixaPerc: g.comissaoFixaPerc },
    campanha: g.campanha,
    custoTotal: sum((l) => l.custoLinha), horasExecucaoTotal, horasGestaoTotal: sum((l) => l.horasGestaoLinha),
    precoTabelaTotal: sum((l) => l.precoTabela), precoFinalTotal, lucroTotal,
    rentabilidadePerc: precoFinalTotal > 0 ? (lucroTotal / precoFinalTotal) * 100 : 0,
    valorHoraMedio: horasExecucaoTotal > 0 ? precoFinalTotal / horasExecucaoTotal : 0,
    temErros: linhas.some((l) => l.erros.length > 0),
  };
}

// ---------- Snapshot (congelamento da cotação salva) ----------

export interface SnapshotItemSre {
  linhaId: string; pacoteId: string; partNumber: string; nome: string;
  horasExecucao: number; pctHorasGestao: number; custoHoraExecucao: number; custoHoraGestao: number;
  rentabilidadeAlvoPerc: number; quantidade: number; descontoPerc: number;
  codigoProduto: string; pisPerc: number | null; cofinsPerc: number | null; issPerc: number | null;
  origemParam: Record<string, OrigemParam>;
}
export interface SnapshotSre {
  versao: number; congeladoEm: string; congeladoPor: string; municipio: string;
  comissaoTiers: ComissaoTier[];
  comissaoFixaPerc: number | null; retencaoPerc: number; irpjCsllPerc: number; irpjCsllConvencao: string;
  encFinancPerc: number; descontoTotalPerc: number; campanha: CampanhaAplicada | null;
  itens: SnapshotItemSre[];
}

export function congelar(entradas: EntradaLinhaSre[], g: GlobaisSre, municipio: string, usuario: string, tiers: ComissaoTier[], versaoAnterior = 0, agora = new Date()): SnapshotSre {
  return {
    versao: versaoAnterior + 1, congeladoEm: agora.toISOString(), congeladoPor: usuario, municipio,
    comissaoTiers: tiers.map((t) => ({ ...t })),
    comissaoFixaPerc: g.comissaoFixaPerc, retencaoPerc: g.retencaoPerc, irpjCsllPerc: g.irpjCsllPerc, irpjCsllConvencao: g.irpjCsllConvencao,
    encFinancPerc: g.encFinancPerc, descontoTotalPerc: g.descontoTotalPerc, campanha: g.campanha ? { ...g.campanha } : null,
    itens: entradas.filter((e) => !e.ausente).map((e) => ({
      linhaId: e.linhaId, pacoteId: e.pacoteId, partNumber: e.partNumber, nome: e.nome,
      horasExecucao: e.horasExecucao, pctHorasGestao: e.pctHorasGestao, custoHoraExecucao: e.custoHoraExecucao, custoHoraGestao: e.custoHoraGestao,
      rentabilidadeAlvoPerc: e.rentabilidadeAlvoPerc, quantidade: e.quantidade, descontoPerc: e.descontoPerc,
      codigoProduto: e.codigoProduto, pisPerc: e.tax?.pisPerc ?? null, cofinsPerc: e.tax?.cofinsPerc ?? null, issPerc: e.tax?.issPerc ?? null,
      origemParam: { ...e.origemParam },
    })),
  };
}

export function entradasDoSnapshot(s: SnapshotSre): EntradaLinhaSre[] {
  return s.itens.map((i) => ({
    linhaId: i.linhaId, pacoteId: i.pacoteId, partNumber: i.partNumber, nome: i.nome,
    horasExecucao: i.horasExecucao, pctHorasGestao: i.pctHorasGestao, custoHoraExecucao: i.custoHoraExecucao, custoHoraGestao: i.custoHoraGestao,
    rentabilidadeAlvoPerc: i.rentabilidadeAlvoPerc, quantidade: i.quantidade, descontoPerc: i.descontoPerc,
    codigoProduto: i.codigoProduto, tax: i.pisPerc == null ? null : { pisPerc: i.pisPerc, cofinsPerc: i.cofinsPerc ?? 0, issPerc: i.issPerc ?? 0 },
    origemParam: { ...i.origemParam },
  }));
}

export function globaisDoSnapshot(s: SnapshotSre): GlobaisSre {
  return { comissaoFixaPerc: s.comissaoFixaPerc, retencaoPerc: s.retencaoPerc, irpjCsllPerc: s.irpjCsllPerc, irpjCsllConvencao: s.irpjCsllConvencao,
    encFinancPerc: s.encFinancPerc, descontoTotalPerc: s.descontoTotalPerc, campanha: s.campanha ? { ...s.campanha } : null };
}

export const linhasDoSnapshot = (s: SnapshotSre): LinhaSre[] => s.itens.map((i) => ({ id: i.linhaId, pacoteId: i.pacoteId, quantidade: i.quantidade, descontoPerc: i.descontoPerc }));

/** A cotação aberta ainda é exatamente a que foi congelada (mesmos itens e condições)? */
export function mesmasEntradasSre(s: SnapshotSre, linhas: LinhaSre[], c: ConfigSre): boolean {
  if (s.municipio !== c.municipio || (s.descontoTotalPerc ?? 0) !== (c.descontoTotalPerc || 0)) return false;
  if (c.encFinancPerc != null && c.encFinancPerc !== s.encFinancPerc) return false;
  if (c.rentabilidadePerc != null && s.itens.some((i) => i.rentabilidadeAlvoPerc !== c.rentabilidadePerc)) return false;
  if (s.itens.length !== linhas.length) return false;
  return s.itens.every((i, k) => {
    const l = linhas[k];
    return l && l.id === i.linhaId && l.pacoteId === i.pacoteId && l.quantidade === i.quantidade && (l.descontoPerc || 0) === (i.descontoPerc || 0);
  });
}

/** O que mudou entre o congelado e o vivo (para o aviso de reavaliação). */
export function diferencasParametrosSre(snap: SnapshotSre, vivo: EntradaLinhaSre[], g: GlobaisSre, tiers: ComissaoTier[]): string[] {
  const out: string[] = [];
  if (snap.comissaoFixaPerc !== g.comissaoFixaPerc) out.push(`Comissão ${snap.comissaoFixaPerc ?? "escala"} → ${g.comissaoFixaPerc ?? "escala"}`);
  if (snap.retencaoPerc !== g.retencaoPerc) out.push(`Retenção ${snap.retencaoPerc}% → ${g.retencaoPerc}%`);
  if (snap.irpjCsllPerc !== g.irpjCsllPerc || snap.irpjCsllConvencao !== g.irpjCsllConvencao) out.push(`IR/CSLL ${snap.irpjCsllPerc}% → ${g.irpjCsllPerc}%`);
  if (snap.encFinancPerc !== g.encFinancPerc) out.push(`Encargos ${snap.encFinancPerc}% → ${g.encFinancPerc}%`);
  if ((snap.campanha?.id ?? null) !== (g.campanha?.id ?? null) || (snap.campanha?.descontoPerc ?? 0) !== (g.campanha?.descontoPerc ?? 0))
    out.push(`Campanha ${snap.campanha ? `${snap.campanha.nome} (${snap.campanha.descontoPerc}%)` : "nenhuma"} → ${g.campanha ? `${g.campanha.nome} (${g.campanha.descontoPerc}%)` : "nenhuma"}`);
  if (JSON.stringify(snap.comissaoTiers) !== JSON.stringify(tiers)) out.push("Escala Selbetti alterada");
  for (const e of vivo) {
    const i = snap.itens.find((x) => x.linhaId === e.linhaId);
    if (!i) continue;
    if (i.horasExecucao !== e.horasExecucao || i.rentabilidadeAlvoPerc !== e.rentabilidadeAlvoPerc) out.push(`${e.partNumber}: horas ou rentabilidade alteradas`);
    if (i.custoHoraExecucao !== e.custoHoraExecucao || i.custoHoraGestao !== e.custoHoraGestao || i.pctHorasGestao !== e.pctHorasGestao) out.push(`${e.partNumber}: custos alterados`);
    if (i.pisPerc !== (e.tax?.pisPerc ?? null) || i.cofinsPerc !== (e.tax?.cofinsPerc ?? null) || i.issPerc !== (e.tax?.issPerc ?? null)) out.push(`${e.partNumber}: alíquotas alteradas`);
  }
  return out;
}

/** Próximo código ITS-SRE-AAAAMMDD-NNN. */
export function proximoCodigoSre(existentes: (string | null)[], hoje = new Date()): string {
  const d = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, "0")}${String(hoje.getDate()).padStart(2, "0")}`;
  const prefixo = `ITS-SRE-${d}-`;
  const max = existentes.reduce((m, c) => (c?.startsWith(prefixo) ? Math.max(m, Number(c.slice(prefixo.length)) || 0) : m), 0);
  return `${prefixo}${String(max + 1).padStart(3, "0")}`;
}
