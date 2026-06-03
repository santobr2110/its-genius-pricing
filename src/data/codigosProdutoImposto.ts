export type CidadeISS = "jlle" | "blum" | "barueri";

export const CIDADES_ISS: { value: CidadeISS; label: string; short: string }[] = [
  { value: "jlle", label: "Joinville", short: "JLLE" },
  { value: "blum", label: "Blumenau", short: "BLUM" },
  { value: "barueri", label: "Barueri", short: "BARUERI" },
];

export interface CodigoProdutoImposto {
  codigo: string;
  descricao: string;
  buDeb: string;
  ctaContabil: string;
  codServIss: string;
  pis: number;
  cofins: number;
  issJlle: number;
  issBlum: number;
  issBarueri: number;
}

export const CODIGOS_PRODUTO_IMPOSTO: CodigoProdutoImposto[] = [
  { codigo: "900-0173P", descricao: "SELB - IT SOLUTIONS - ANALISE E DESENVOLVIMENTO DE SISTEMAS", buDeb: "010304", ctaContabil: "3101030004", codServIss: "1.05", pis: 0.65, cofins: 3, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0434P", descricao: "SELB - IT SOLUTIONS - BILLING VIA SELBETTI + CLOUDABILITY BASIC", buDeb: "010304", ctaContabil: "3101030012", codServIss: "1.05", pis: 0.65, cofins: 3, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0463P", descricao: "SELB - IT SOLUTIONS - LICENCIAMENTO MIMIX", buDeb: "010304", ctaContabil: "3101030012", codServIss: "1.05", pis: 0.65, cofins: 3, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0179P", descricao: "SELB - IT SOLUTIONS - ASSESSORIA E CONSULTORIA", buDeb: "010304", ctaContabil: "3101030005", codServIss: "1.06", pis: 0.65, cofins: 3, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0321P", descricao: "SELB - IT SOLUTIONS - ITO FIELD SERVICE EITI", buDeb: "010304", ctaContabil: "3101030005", codServIss: "1.06", pis: 0.65, cofins: 3, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0322P", descricao: "SELB - IT SOLUTIONS - ITO EITI", buDeb: "010304", ctaContabil: "3101030005", codServIss: "1.06", pis: 0.65, cofins: 3, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0323P", descricao: "SELB - IT SOLUTIONS - LICENCAS CLOUDBERRY EITI", buDeb: "010304", ctaContabil: "3101030005", codServIss: "1.06", pis: 0.65, cofins: 3, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0184P", descricao: "SELB - IT SOLUTIONS - SUPORTE TECNICO EM INFORMATICA (INCLUSO INSTALACAO)", buDeb: "010304", ctaContabil: "3101030008", codServIss: "1.07", pis: 1.65, cofins: 7.6, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0427P", descricao: "SELB - IT SOLUTIONS - ITO FIELD SERVICE EITI SUPORTE TECNICO", buDeb: "010304", ctaContabil: "3101030008", codServIss: "1.07", pis: 1.65, cofins: 7.6, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0428P", descricao: "SELB - IT SOLUTIONS - ITO EITI SUPORTE TECNICO", buDeb: "010304", ctaContabil: "3101030008", codServIss: "1.07", pis: 1.65, cofins: 7.6, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0324P", descricao: "SELB - IT SOLUTIONS - ATIVIDADE DE INTERMEDIACAO E AGENCIAMENTO", buDeb: "010304", ctaContabil: "3101030010", codServIss: "10.05", pis: 1.65, cofins: 7.6, issJlle: 2, issBlum: 3, issBarueri: 2 },
  { codigo: "900-0201P", descricao: "SELB - IT SOLUTIONS - REPRESENTACAO COMERCIAL", buDeb: "010304", ctaContabil: "3101030010", codServIss: "10.09", pis: 1.65, cofins: 7.6, issJlle: 2, issBlum: 2, issBarueri: 2 },
  { codigo: "900-0376P", descricao: "SELB - MAO-DE-OBRA RESIDENTE - IT SOLUTIONS", buDeb: "010304", ctaContabil: "3101030003", codServIss: "17.05", pis: 1.65, cofins: 7.6, issJlle: 2.5, issBlum: 3, issBarueri: 2 },
  { codigo: "900-0202P", descricao: "SELB - IT SOLUTIONS - LOCACAO C/ FATURA", buDeb: "010304", ctaContabil: "3101030001", codServIss: ".", pis: 1.65, cofins: 7.6, issJlle: 0, issBlum: 0, issBarueri: 0 },
  { codigo: "900-0168P", descricao: "SELB - IT SOLUTIONS - MULTA CONTRATUAL", buDeb: "010304", ctaContabil: "5202010006", codServIss: ".", pis: 1.65, cofins: 7.6, issJlle: 0, issBlum: 0, issBarueri: 0 },
  { codigo: "900-0465P", descricao: "SELB - IT SOLUTIONS - INCENTIVO", buDeb: "010304", ctaContabil: "5202010012", codServIss: ".", pis: 1.65, cofins: 7.6, issJlle: 0, issBlum: 0, issBarueri: 0 },
];

export function getIssPercByCidade(p: CodigoProdutoImposto, c: CidadeISS): number {
  if (c === "jlle") return p.issJlle;
  if (c === "blum") return p.issBlum;
  return p.issBarueri;
}