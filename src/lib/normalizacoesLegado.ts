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

export const FLOW_TAGLINE = "Execução das tarefas N1 que o cliente já tem documentadas";
export const FLOW_DESCRICAO =
  "Execução, pelo COps, das tarefas N1 que o cliente já tem documentadas, em rotinas roteirizadas de até cerca de 15 minutos, disparadas pelos eventos do monitoramento ou sob demanda, com evidência registrada e apontamento de tempo por execução.";
export const FLOW_INCLUIDOS: readonly string[] = [
  "Execução de tarefas N1 documentadas pelo cliente, em rotinas roteirizadas de até cerca de 15 minutos",
  "Catálogo de rotinas construído e mantido a partir da documentação do cliente",
  "Rotinas disparadas pelos eventos do monitoramento ou sob demanda",
  "Monitoramento integrado ao ITSM do cliente",
  "Acesso de atendentes do COps ao ITSM do cliente para registro das execuções",
  "Horas de automação para tratamento e ajuste contínuo de eventos",
  "Horas N3 / Automação opcionais para acionamento técnico sob demanda",
  "Proxys de coleta dedicados à camada Flow",
  "Evidência registrada e apontamento de tempo por execução",
];
export const FLOW_RESTRICOES: readonly string[] = [
  "Executa apenas tarefas documentadas e homologadas; tarefa sem documentação não entra no catálogo",
  "Rotinas acima de cerca de 15 minutos, ou que exijam diagnóstico, são tratadas como horas N3 / Automação",
  "Não inclui o funil de atendimento N1, N2 e N3 a incidentes de infraestrutura (camada Smart Operation)",
  "Não é oferta de ferramenta de ITSM; a plataforma de ITSM para o cliente operar com time próprio é a oferta ITSM as a Service",
  "Horas N3 / Automação e acessos ao ITSM são absorvidos pela camada Smart Operation quando contratada",
  "Automações fora do catálogo demandam estudo técnico prévio",
  "Cobertura limitada aos ativos do inventário declarado",
];

const flowAntigo = (t: unknown) => typeof t === "string" && t.toLowerCase().includes("atendentes dedicados");

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
  const f = out.flow;
  if (isObj(f) && (flowAntigo(f.tagline) || flowAntigo(f.descricao))) {
    out = {
      ...out,
      flow: { ...f, tagline: FLOW_TAGLINE, descricao: FLOW_DESCRICAO, incluidos: [...FLOW_INCLUIDOS], restricoes: [...FLOW_RESTRICOES] },
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
