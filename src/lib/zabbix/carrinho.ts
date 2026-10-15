// Motor de cálculo das Subscrições Zabbix (Fase 3). Funções puras — ver src/test/zabbixCalc.test.ts.
// Etapa 1 resolve as entradas (catálogo vivo ou snapshot congelado); etapa 2 calcula só sobre EntradaLinha.
import { decomporVenda, type ChegadaFixos } from "@/lib/pricing/chegada";
import type { ComissaoTier } from "@/lib/comissaoRentabilidade";
import { resolveDescontos, type CategoriaZbx, type Descontos, type OrigemDesconto, type ZabbixParams, type ZabbixSubscription } from "./calc";

export type TaxPercs = { pisPerc: number; cofinsPerc: number; issPerc: number };
export type OrigemDescontos = Record<keyof Descontos, OrigemDesconto>;

export interface LinhaZbx { id: string; subscriptionId: string; quantidade: number; descontoPerc: number }

export interface ConfigZbx {
  municipio: string; temRO: boolean; pagamento30d: boolean;
  descontoTotalPerc: number; encFinancPerc: number | null; convencao: "padrao_site" | "roi_ito";
}
export const CONFIG_ZBX_PADRAO: ConfigZbx = { municipio: "Joinville", temRO: true, pagamento30d: true, descontoTotalPerc: 0, encFinancPerc: null, convencao: "padrao_site" };

export interface CenarioCusto { temRO: boolean; pagamento30d: boolean }

/** Tudo o que o cálculo precisa, já resolvido e livre de acesso a banco. */
export interface EntradaLinha {
  linhaId: string; subscriptionId: string; partNumber: string; nome: string;
  categoria: CategoriaZbx; unidade: string;
  vendaUnitaria: number; listaUsd: number | null; listaBrl: number | null;
  cambio: number; descontos: Descontos; origemDesconto: OrigemDescontos;
  codigoProduto: string; tax: TaxPercs | null;
  quantidade: number; descontoPerc: number;
  permiteQuantidade: boolean; quantidadeMaxima: number | null;
  pisoRentabilidadePerc: number | null;
  /** SKU não encontrado no catálogo (só no caminho vivo). */
  ausente?: boolean;
}

/** Parâmetros globais do cálculo (vivos ou congelados). */
export interface GlobaisZbx {
  cenario: CenarioCusto; comissaoFixaPerc: number | null;
  retencaoPerc: number; irpjCsllPerc: number; encFinancPerc: number; descontoTotalPerc: number;
}

export function montarEntradas(
  linhas: LinhaZbx[], catalogo: ZabbixSubscription[], params: ZabbixParams,
  taxPorProduto: (codigo: string) => TaxPercs | null,
): EntradaLinha[] {
  const byId = new Map(catalogo.map((s) => [s.id, s]));
  return linhas.map((l) => {
    const s = byId.get(l.subscriptionId);
    if (!s) {
      const d = { ro: 0, semRo: 0, pgto30Ro: 0, pgto30SemRo: 0 };
      return { linhaId: l.id, subscriptionId: l.subscriptionId, partNumber: "—", nome: "Subscrição não encontrada", categoria: "suporte", unidade: "",
        vendaUnitaria: 0, listaUsd: null, listaBrl: null, cambio: params.cambioUsd, descontos: d,
        origemDesconto: { ro: "categoria", semRo: "categoria", pgto30Ro: "categoria", pgto30SemRo: "categoria" },
        codigoProduto: "", tax: null, quantidade: l.quantidade, descontoPerc: l.descontoPerc, permiteQuantidade: true, quantidadeMaxima: null,
        pisoRentabilidadePerc: null, ausente: true };
    }
    const r = resolveDescontos(s, params.descontos);
    const codigo = params.produtos[s.categoria];
    return {
      linhaId: l.id, subscriptionId: s.id, partNumber: s.part_number, nome: s.nome, categoria: s.categoria, unidade: s.unidade,
      vendaUnitaria: Number(s.venda_brl), listaUsd: s.lista_usd == null ? null : Number(s.lista_usd), listaBrl: s.lista_brl == null ? null : Number(s.lista_brl),
      cambio: params.cambioUsd, descontos: { ro: r.ro, semRo: r.semRo, pgto30Ro: r.pgto30Ro, pgto30SemRo: r.pgto30SemRo }, origemDesconto: r.origem,
      codigoProduto: codigo, tax: taxPorProduto(codigo),
      quantidade: l.quantidade, descontoPerc: l.descontoPerc,
      permiteQuantidade: s.permite_quantidade, quantidadeMaxima: s.quantidade_maxima,
      pisoRentabilidadePerc: s.piso_rentabilidade_perc ?? params.piso[s.categoria],
    };
  });
}

/** Custo unitário em R$ a partir da lista Zabbix. */
export function custoUnitario(e: EntradaLinha, cen: CenarioCusto): number {
  const lista = e.listaUsd != null ? e.listaUsd * e.cambio : (e.listaBrl ?? 0);
  const base = cen.temRO ? e.descontos.ro : e.descontos.semRo;
  const pgto = cen.pagamento30d ? (cen.temRO ? e.descontos.pgto30Ro : e.descontos.pgto30SemRo) : 0;
  return lista * (1 - base / 100) * (1 - pgto / 100);
}

export interface LinhaResultadoZbx {
  entrada: EntradaLinha;
  listaUnitariaBrl: number; descBasePerc: number; descPgtoPerc: number;
  custoUnitario: number; custoLinha: number; vendaTabela: number;
  descontoEfetivoPerc: number; precoFinal: number;
  rentabilidadePerc: number; comissaoPerc: number; comissaoInstavel: boolean; lucro: number;
  fixos: ChegadaFixos | null;
  erros: string[]; abaixoPiso: boolean;
}

export function computeLinha(e: EntradaLinha, g: GlobaisZbx, tiers: ComissaoTier[]): LinhaResultadoZbx {
  const cen = g.cenario;
  const erros: string[] = [];
  const q = e.quantidade;
  if (e.ausente) erros.push("Subscrição não encontrada no catálogo.");
  if (!Number.isInteger(q) || q < 1) erros.push("Quantidade deve ser um inteiro maior ou igual a 1.");
  else if (!e.permiteQuantidade && q > 1) erros.push("Esta subscrição não permite quantidade maior que 1.");
  else if (e.quantidadeMaxima != null && q > e.quantidadeMaxima) erros.push(`Quantidade acima do limite de ${e.quantidadeMaxima}.`);
  if (!e.ausente && !e.tax) erros.push(`Produto ${e.codigoProduto} sem alíquotas para o município.`);
  const listaUnitariaBrl = e.listaUsd != null ? e.listaUsd * e.cambio : (e.listaBrl ?? 0);
  const descBasePerc = cen.temRO ? e.descontos.ro : e.descontos.semRo;
  const descPgtoPerc = cen.pagamento30d ? (cen.temRO ? e.descontos.pgto30Ro : e.descontos.pgto30SemRo) : 0;
  const cu = custoUnitario(e, cen);
  const descontoEfetivoPerc = 100 * (1 - (1 - (e.descontoPerc || 0) / 100) * (1 - (g.descontoTotalPerc || 0) / 100));
  const base = { entrada: e, listaUnitariaBrl, descBasePerc, descPgtoPerc, custoUnitario: cu, descontoEfetivoPerc };
  if (erros.length) {
    return { ...base, custoLinha: 0, vendaTabela: 0, precoFinal: 0, rentabilidadePerc: 0, comissaoPerc: 0, comissaoInstavel: false, lucro: 0, fixos: null, erros, abaixoPiso: false };
  }
  const custoLinha = cu * q;
  const vendaTabela = e.vendaUnitaria * q;
  const fixos: ChegadaFixos = { ...e.tax!, irpjCsllPerc: g.irpjCsllPerc, encFinancPerc: g.encFinancPerc, retencaoPerc: g.retencaoPerc };
  const d = decomporVenda(custoLinha, vendaTabela, descontoEfetivoPerc, fixos, tiers, g.comissaoFixaPerc);
  const abaixoPiso = e.pisoRentabilidadePerc != null && d.rentabilidadePerc < e.pisoRentabilidadePerc;
  return { ...base, custoLinha, vendaTabela, precoFinal: d.precoFinal, rentabilidadePerc: d.rentabilidadePerc, comissaoPerc: d.comissaoPerc,
    comissaoInstavel: d.comissaoInstavel, lucro: d.lucro, fixos, erros, abaixoPiso };
}

export interface CarrinhoZbx {
  linhas: LinhaResultadoZbx[];
  cascataBase: { irpjCsllPerc: number; encFinancPerc: number; retencaoPerc: number; comissaoFixaPerc: number | null };
  custoTotal: number; precoTabelaTotal: number; precoFinalTotal: number; lucroTotal: number;
  rentabilidadePerc: number; temErros: boolean; abaixoPiso: boolean;
}

export function computeCarrinhoZbx(entradas: EntradaLinha[], g: GlobaisZbx, tiers: ComissaoTier[]): CarrinhoZbx {
  const linhas = entradas.map((e) => computeLinha(e, g, tiers));
  const ok = linhas.filter((l) => l.erros.length === 0);
  const sum = (f: (l: LinhaResultadoZbx) => number) => ok.reduce((s, l) => s + f(l), 0);
  const precoFinalTotal = sum((l) => l.precoFinal);
  const lucroTotal = sum((l) => l.lucro);
  return {
    linhas,
    cascataBase: { irpjCsllPerc: g.irpjCsllPerc, encFinancPerc: g.encFinancPerc, retencaoPerc: g.retencaoPerc, comissaoFixaPerc: g.comissaoFixaPerc },
    custoTotal: sum((l) => l.custoLinha), precoTabelaTotal: sum((l) => l.vendaTabela), precoFinalTotal, lucroTotal,
    rentabilidadePerc: precoFinalTotal > 0 ? (lucroTotal / precoFinalTotal) * 100 : 0,
    temErros: linhas.some((l) => l.erros.length > 0), abaixoPiso: ok.some((l) => l.abaixoPiso),
  };
}

// ---------- Snapshot (congelamento da cotação salva) ----------

export interface SnapshotItem {
  linhaId: string; subscriptionId: string; partNumber: string; nome: string; categoria: CategoriaZbx; unidade: string;
  vendaUnitaria: number; listaUsd: number | null; listaBrl: number | null;
  descontos: Descontos; origemDesconto: OrigemDescontos;
  codigoProduto: string; pisPerc: number | null; cofinsPerc: number | null; issPerc: number | null;
  quantidade: number; descontoPerc: number; permiteQuantidade: boolean; quantidadeMaxima: number | null; pisoRentabilidadePerc: number | null;
}
export interface SnapshotZbx {
  versao: number; congeladoEm: string; congeladoPor: string;
  cambio: number; cenario: CenarioCusto; municipio: string;
  comissaoFixaPerc: number | null; retencaoPerc: number; irpjCsllPerc: number; encFinancPerc: number; descontoTotalPerc: number;
  itens: SnapshotItem[];
}

export function congelar(entradas: EntradaLinha[], g: GlobaisZbx, municipio: string, cambio: number, usuario: string, versaoAnterior = 0, agora = new Date()): SnapshotZbx {
  return {
    versao: versaoAnterior + 1, congeladoEm: agora.toISOString(), congeladoPor: usuario,
    cambio, cenario: { ...g.cenario }, municipio,
    comissaoFixaPerc: g.comissaoFixaPerc, retencaoPerc: g.retencaoPerc, irpjCsllPerc: g.irpjCsllPerc, encFinancPerc: g.encFinancPerc, descontoTotalPerc: g.descontoTotalPerc,
    itens: entradas.filter((e) => !e.ausente).map((e) => ({
      linhaId: e.linhaId, subscriptionId: e.subscriptionId, partNumber: e.partNumber, nome: e.nome, categoria: e.categoria, unidade: e.unidade,
      vendaUnitaria: e.vendaUnitaria, listaUsd: e.listaUsd, listaBrl: e.listaBrl, descontos: { ...e.descontos }, origemDesconto: { ...e.origemDesconto },
      codigoProduto: e.codigoProduto, pisPerc: e.tax?.pisPerc ?? null, cofinsPerc: e.tax?.cofinsPerc ?? null, issPerc: e.tax?.issPerc ?? null,
      quantidade: e.quantidade, descontoPerc: e.descontoPerc, permiteQuantidade: e.permiteQuantidade, quantidadeMaxima: e.quantidadeMaxima, pisoRentabilidadePerc: e.pisoRentabilidadePerc,
    })),
  };
}

export function entradasDoSnapshot(s: SnapshotZbx): EntradaLinha[] {
  return s.itens.map((i) => ({
    linhaId: i.linhaId, subscriptionId: i.subscriptionId, partNumber: i.partNumber, nome: i.nome, categoria: i.categoria, unidade: i.unidade,
    vendaUnitaria: i.vendaUnitaria, listaUsd: i.listaUsd, listaBrl: i.listaBrl, cambio: s.cambio,
    descontos: { ...i.descontos }, origemDesconto: { ...i.origemDesconto },
    codigoProduto: i.codigoProduto, tax: i.pisPerc == null ? null : { pisPerc: i.pisPerc, cofinsPerc: i.cofinsPerc ?? 0, issPerc: i.issPerc ?? 0 },
    quantidade: i.quantidade, descontoPerc: i.descontoPerc, permiteQuantidade: i.permiteQuantidade, quantidadeMaxima: i.quantidadeMaxima, pisoRentabilidadePerc: i.pisoRentabilidadePerc,
  }));
}

export function globaisDoSnapshot(s: SnapshotZbx): GlobaisZbx {
  return { cenario: { ...s.cenario }, comissaoFixaPerc: s.comissaoFixaPerc, retencaoPerc: s.retencaoPerc, irpjCsllPerc: s.irpjCsllPerc, encFinancPerc: s.encFinancPerc, descontoTotalPerc: s.descontoTotalPerc };
}

/** Linhas do carrinho equivalentes ao snapshot (para reabrir a cotação na tela). */
export const linhasDoSnapshot = (s: SnapshotZbx): LinhaZbx[] => s.itens.map((i) => ({ id: i.linhaId, subscriptionId: i.subscriptionId, quantidade: i.quantidade, descontoPerc: i.descontoPerc }));

/** O que mudou entre o congelado e o vivo (para o diálogo de reavaliação). */
export function diferencasParametros(snap: SnapshotZbx, vivo: EntradaLinha[], g: GlobaisZbx): string[] {
  const out: string[] = [];
  const cambioVivo = vivo[0]?.cambio;
  if (cambioVivo != null && cambioVivo !== snap.cambio) out.push(`Câmbio ${snap.cambio} → ${cambioVivo}`);
  if (snap.comissaoFixaPerc !== g.comissaoFixaPerc) out.push(`Comissão ${snap.comissaoFixaPerc ?? "escala"} → ${g.comissaoFixaPerc ?? "escala"}`);
  if (snap.retencaoPerc !== g.retencaoPerc) out.push(`Retenção ${snap.retencaoPerc}% → ${g.retencaoPerc}%`);
  if (snap.irpjCsllPerc !== g.irpjCsllPerc) out.push(`IR/CSLL ${snap.irpjCsllPerc}% → ${g.irpjCsllPerc}%`);
  if (snap.encFinancPerc !== g.encFinancPerc) out.push(`Encargos ${snap.encFinancPerc}% → ${g.encFinancPerc}%`);
  for (const e of vivo) {
    const i = snap.itens.find((x) => x.linhaId === e.linhaId);
    if (!i) continue;
    if (JSON.stringify(i.descontos) !== JSON.stringify(e.descontos)) out.push(`${e.partNumber}: descontos alterados`);
    if (i.vendaUnitaria !== e.vendaUnitaria) out.push(`${e.partNumber}: venda alterada`);
    if (i.listaUsd !== e.listaUsd || i.listaBrl !== e.listaBrl) out.push(`${e.partNumber}: lista alterada`);
    if (i.pisPerc !== (e.tax?.pisPerc ?? null) || i.cofinsPerc !== (e.tax?.cofinsPerc ?? null) || i.issPerc !== (e.tax?.issPerc ?? null)) out.push(`${e.partNumber}: alíquotas alteradas`);
  }
  return out;
}

/** Próximo código ITS-ZBX-AAAAMMDD-NNN. */
export function proximoCodigoZBX(existentes: (string | null)[], hoje = new Date()): string {
  const d = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, "0")}${String(hoje.getDate()).padStart(2, "0")}`;
  const prefixo = `ITS-ZBX-${d}-`;
  const max = existentes.reduce((m, c) => (c?.startsWith(prefixo) ? Math.max(m, Number(c.slice(prefixo.length)) || 0) : m), 0);
  return `${prefixo}${String(max + 1).padStart(3, "0")}`;
}
