import type { CarrinhoResultado, ConfigCarrinho, LinhaCarrinho } from "./carrinho";

export function assinaturaTreinamento(linhas: LinhaCarrinho[], config: ConfigCarrinho): string {
  const { resultadoCongelado: _resultado, ...entradas } = config;
  const canonical = (v: unknown): string => v !== null && typeof v === "object"
    ? Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : `{${Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>`${JSON.stringify(k)}:${canonical(x)}`).join(",")}}`
    : JSON.stringify(v) ?? "null";
  return canonical({ linhas, config: entradas });
}
export function resultadoTreinamentoCongelado(linhas: LinhaCarrinho[], config: ConfigCarrinho): CarrinhoResultado | null {
  const salvo = config.resultadoCongelado;
  return salvo?.assinatura === assinaturaTreinamento(linhas, config) ? salvo.resultado : null;
}