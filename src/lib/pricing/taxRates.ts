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


export type OfertaFiscal = "smart-ito" | "bodyshop" | "treinamento";
export const OFERTAS_FISCAIS: { value: OfertaFiscal; label: string }[] = [
  { value: "smart-ito", label: "Smart ITO" },
  { value: "bodyshop", label: "BodyShop" },
  { value: "treinamento", label: "Treinamento" },
];
/** Código disponível para a oferta: só os marcados com ela (um código pode servir a várias). */
export const codigoServeOferta = (c: TaxCode, oferta?: OfertaFiscal) =>
  !oferta || !!c.ofertas?.includes(oferta);
