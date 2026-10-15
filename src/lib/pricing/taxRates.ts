// Resolução pura de alíquotas a partir do cadastro tributário (tabelas tax_product_codes / rates).

export interface TaxCode {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  lc116_item: string | null;
  ativo: boolean;
  a_confirmar: boolean;
  /** Ofertas que usam o código; vazio = geral. */
  ofertas?: string[];
  /** Código de serviço (LC 116) de onde vêm as alíquotas. */
  service_code_id?: string | null;
  /** true = ignora o código de serviço e usa as alíquotas próprias do produto. */
  usa_aliquota_propria?: boolean;
}

export interface TaxRate {
  id: string;
  tax_product_code_id: string;
  municipio: string;
  pis_perc: number;
  cofins_perc: number;
  iss_perc: number;
  vigencia_inicio: string; // YYYY-MM-DD
  vigencia_fim: string | null;
  a_confirmar: boolean;
}

export interface ResolvedTaxRates {
  pisPerc: number;
  cofinsPerc: number;
  issPerc: number;
  aConfirmar: boolean;
  rateId: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** Alíquotas vigentes de um código/município numa data (YYYY-MM-DD). Null se não houver. */
export function resolveTaxRates(
  codigo: string,
  municipio: string,
  dataRef: string,
  codes: TaxCode[],
  rates: TaxRate[],
): ResolvedTaxRates | null {
  const code = codes.find((c) => c.codigo === codigo && c.ativo);
  if (!code) return null;
  const vig = rates
    .filter((r) =>
      r.tax_product_code_id === code.id &&
      norm(r.municipio) === norm(municipio) &&
      r.vigencia_inicio <= dataRef &&
      (!r.vigencia_fim || r.vigencia_fim >= dataRef),
    )
    .sort((a, b) => (a.vigencia_inicio < b.vigencia_inicio ? 1 : -1));
  const r = vig[0];
  if (!r) return null;
  return {
    pisPerc: Number(r.pis_perc) || 0,
    cofinsPerc: Number(r.cofins_perc) || 0,
    issPerc: Number(r.iss_perc) || 0,
    aConfirmar: !!(r.a_confirmar || code.a_confirmar),
    rateId: r.id,
  };
}


export type OfertaFiscal = "smart-ito" | "bodyshop" | "treinamento" | "zabbix";
export const OFERTAS_FISCAIS: { value: OfertaFiscal; label: string }[] = [
  { value: "smart-ito", label: "Smart ITO" },
  { value: "bodyshop", label: "BodyShop" },
  { value: "treinamento", label: "Treinamento" },
  { value: "zabbix", label: "Subscrições Zabbix" },
];
/** Código disponível para a oferta: só os marcados com ela (um código pode servir a várias). */
export const codigoServeOferta = (c: TaxCode, oferta?: OfertaFiscal) =>
  !oferta || !!c.ofertas?.includes(oferta);

/** Fábrica: alíquotas por código de produto para um município/data (null se não houver). */
export function taxPorProdutoFactory(municipio: string, data: string, codes: TaxCode[], rates: TaxRate[]) {
  return (codigo: string) => {
    const r = resolveTaxRates(codigo, municipio, data, codes, rates);
    return r ? { pisPerc: r.pisPerc, cofinsPerc: r.cofinsPerc, issPerc: r.issPerc } : null;
  };
}

/** Código de serviço (item LC 116): PIS/COFINS únicos e ISS por município. */
export interface ServiceCode {
  id: string;
  lc116_item: string;
  descricao: string | null;
  pis_perc: number;
  cofins_perc: number;
  a_confirmar: boolean;
  ativo: boolean;
}
export interface ServiceCodeIss {
  id: string;
  service_code_id: string;
  municipio: string;
  iss_perc: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  a_confirmar: boolean;
}

/**
 * Alíquotas efetivas por produto: herda do código de serviço vinculado, salvo
 * quando o produto usa alíquota própria (linhas de tax_product_code_rates).
 */
export function aliquotasEfetivas(
  codes: TaxCode[],
  proprias: TaxRate[],
  servicos: ServiceCode[],
  iss: ServiceCodeIss[],
): TaxRate[] {
  const out: TaxRate[] = [];
  for (const c of codes) {
    const sc = c.service_code_id ? servicos.find((s) => s.id === c.service_code_id) : undefined;
    if (c.usa_aliquota_propria || !sc) {
      out.push(...proprias.filter((r) => r.tax_product_code_id === c.id));
      continue;
    }
    for (const i of iss.filter((x) => x.service_code_id === sc.id)) {
      out.push({
        id: `${c.id}:${i.id}`,
        tax_product_code_id: c.id,
        municipio: i.municipio,
        pis_perc: Number(sc.pis_perc),
        cofins_perc: Number(sc.cofins_perc),
        iss_perc: Number(i.iss_perc),
        vigencia_inicio: i.vigencia_inicio,
        vigencia_fim: i.vigencia_fim,
        a_confirmar: !!(sc.a_confirmar || i.a_confirmar),
      });
    }
  }
  return out;
}
