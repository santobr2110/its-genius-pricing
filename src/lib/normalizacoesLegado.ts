/**
 * Normalizações de valores legados persistidos (localStorage, nuvem, cotações).
 * Replicam exatamente a migração "Correção global: termo Service Desk e
 * caracteres invisíveis". Idempotentes: valor já correto volta idêntico.
 */
export const TEXTO_OPERATION_TAGLINE = 'TI gerenciada com prevenção como eixo, operada pelos níveis N1, N2 e N3';
export const TEXTO_OPERATION_DESCRICAO = 'Gestão de TI gerenciada com prevenção como eixo: o funil de atendimento N1, N2 e N3 trata os incidentes de infraestrutura e executa as rotinas preventivas na periodicidade estabelecida, com triagem técnica e SLA controlado. Não inclui atendimento ao usuário final, que pertence à oferta Smart Service Desk.';
export const TEXTO_FLOW_RESTRICAO = 'Não inclui o funil de atendimento N1, N2 e N3 a incidentes de infraestrutura (camada Smart Operation)';

export function textoServiceDeskLegado(t: unknown): boolean {
  if (typeof t !== "string") return false;
  const l = t.toLowerCase();
  return l.includes("service desk") && !l.includes("smart service desk");
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function corrigirEscopoLegado<T>(valor: T): T {
  if (!isObj(valor)) return valor;
  let out: Record<string, unknown> = valor;
  const op = valor.operation;
  if (isObj(op)) {
    const novo = { ...op };
    let mud = false;
    if (textoServiceDeskLegado(op.tagline)) { novo.tagline = TEXTO_OPERATION_TAGLINE; mud = true; }
    if (textoServiceDeskLegado(op.descricao)) { novo.descricao = TEXTO_OPERATION_DESCRICAO; mud = true; }
    if (mud) out = { ...out, operation: novo };
  }
  const flow = valor.flow;
  if (isObj(flow) && Array.isArray(flow.restricoes) && flow.restricoes.some(textoServiceDeskLegado)) {
    out = {
      ...out,
      flow: { ...flow, restricoes: flow.restricoes.map((r) => (textoServiceDeskLegado(r) ? TEXTO_FLOW_RESTRICAO : r)) },
    };
  }
  return out as T;
}

const INVISIVEIS = /[\u2060\u200B\u200C\u200D\uFEFF]/g;
/** Remove invisíveis e aplica trim de espaços (equivalente ao btrim). */
function limparTexto(t: string): string {
  return t.replace(INVISIVEIS, "").replace(/^ +| +$/g, "");
}

export function limparCatalogoLegado<T>(lista: T, campo: string): T {
  if (!Array.isArray(lista)) return lista;
  let mud = false;
  const out = lista.map((it) => {
    if (!isObj(it) || typeof it[campo] !== "string") return it;
    const novo = limparTexto(it[campo] as string);
    if (novo === it[campo]) return it;
    mud = true;
    return { ...it, [campo]: novo };
  });
  return (mud ? out : lista) as T;
}

const NORMALIZADORES: Array<[string, (v: unknown) => unknown]> = [
  ["escopo:proposicao", corrigirEscopoLegado],
  ["gestao-ti:gmuds", (v) => limparCatalogoLegado(v, "descricao")],
  ["gestao-ti:rotinas", (v) => limparCatalogoLegado(v, "rotina")],
];

/** Normaliza o valor conforme a chave (crua ou namespeada/prefixada). */
export function normalizarValorLegado<T>(chave: string, valor: T): T {
  for (const [suf, fn] of NORMALIZADORES) {
    if (chave === suf || chave.endsWith("." + suf)) return fn(valor) as T;
  }
  return valor;
}
