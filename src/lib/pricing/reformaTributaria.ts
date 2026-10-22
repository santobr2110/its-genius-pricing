/**
 * Preço de venda pós-reforma tributária (vigente a partir de 01/01/2027).
 * Informativo: NÃO altera o preço atual, rentabilidade, comissão nem aprovação.
 *
 *  Preço líquido sem impostos = Preço atual − PIS − COFINS − ISS
 *  CBS                        = Preço líquido × alíquota CBS
 *  Preço pós-reforma          = Preço atual − PIS − COFINS + CBS   (ISS permanece)
 *
 * Alíquota CBS vem de um parâmetro central único (app_defaults); null = ainda não definida,
 * e o preço é apresentado como "R$ (Preço atual − PIS − COFINS) + CBS".
 */
export const REFORMA_CBS_KEY = "reforma_cbs";
export const REFORMA_VIGENCIA = "01/01/2027";

export interface ParcelaReforma { preco: number; pisPerc: number; cofinsPerc: number; issPerc: number }

export interface PrecoReforma {
  precoAtual: number; pis: number; cofins: number; iss: number;
  liquidoSemImpostos: number;
  /** Preço atual − PIS − COFINS (base antes de somar a CBS). */
  semPisCofins: number;
  cbsPerc: number | null;
  cbs: number | null;
  precoReforma: number | null;
}

const n = (x: number) => (Number.isFinite(x) ? x : 0);

export function calcPrecoReforma(parcelas: ParcelaReforma[], cbsPerc: number | null): PrecoReforma {
  let precoAtual = 0, pis = 0, cofins = 0, iss = 0;
  for (const p of parcelas) {
    const v = n(p.preco);
    precoAtual += v;
    pis += (v * n(p.pisPerc)) / 100;
    cofins += (v * n(p.cofinsPerc)) / 100;
    iss += (v * n(p.issPerc)) / 100;
  }
  const liquidoSemImpostos = precoAtual - pis - cofins - iss;
  const semPisCofins = precoAtual - pis - cofins;
  const temAliquota = cbsPerc != null && Number.isFinite(cbsPerc);
  const cbs = temAliquota ? (liquidoSemImpostos * (cbsPerc as number)) / 100 : null;
  return { precoAtual, pis, cofins, iss, liquidoSemImpostos, semPisCofins, cbsPerc: temAliquota ? cbsPerc : null, cbs, precoReforma: cbs == null ? null : semPisCofins + cbs };
}

/** Escala o resultado (ex.: mensal → contrato, turma → aluno). */
export function escalarReforma(r: PrecoReforma, f: number): PrecoReforma {
  const m = (x: number | null) => (x == null ? null : x * f);
  return { ...r, precoAtual: r.precoAtual * f, pis: r.pis * f, cofins: r.cofins * f, iss: r.iss * f,
    liquidoSemImpostos: r.liquidoSemImpostos * f, semPisCofins: r.semPisCofins * f, cbs: m(r.cbs), precoReforma: m(r.precoReforma) };
}

export const brlReforma = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.234,56" quando há alíquota; "R$ 1.150,00 + CBS" quando não há. */
export function textoPrecoReforma(r: PrecoReforma, fmt: (v: number) => string = brlReforma): string {
  return r.precoReforma != null ? fmt(r.precoReforma) : `${fmt(r.semPisCofins)} + CBS`;
}

/** Frase para propostas/observações. */
export function fraseReforma(r: PrecoReforma, fmt: (v: number) => string = brlReforma, sufixo = ""): string {
  return `A partir de ${REFORMA_VIGENCIA}, com a entrada em vigência da reforma tributária (substituição de PIS/COFINS pela CBS), o valor passa a ser ${textoPrecoReforma(r, fmt)}${sufixo}.`;
}
