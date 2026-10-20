import type { CarrinhoBS } from './carrinho';

/** Uses the selected live/frozen result; rounding is presentation-only. */
export function resultadoOperacaoBS(res: CarrinhoBS, meses = 1) {
  const ok = res.linhas.filter(l => !l.erros.length && l.fixos);
  const soma = (f: (l: typeof ok[number]) => number) => ok.reduce((s, l) => s + f(l), 0) * meses;
  const venda = res.precoFinalTotalMensal * meses;
  const impostos = soma(l => l.precoFinal * ((l.fixos?.pisPerc ?? 0) + (l.fixos?.cofinsPerc ?? 0) + (l.fixos?.issPerc ?? 0)) / 100);
  const comissao = soma(l => l.precoFinal * l.comissaoPerc / 100);
  const retencao = soma(l => l.precoFinal * (l.fixos?.retencaoPerc ?? 0) / 100);
  const ir = soma(l => l.precoFinal * (l.fixos?.irpjCsllPerc ?? 0) / 100);
  const financeiro = soma(l => l.precoFinal * (l.fixos?.encFinancPerc ?? 0) / 100);
  const custo = res.custoTotal * meses, lucro = res.lucroTotalMensal * meses;
  const centavos = (n: number) => Math.round(n * 100);
  const ajusteCentavos = centavos(lucro) - (centavos(venda) - [impostos, comissao, retencao, ir, financeiro, custo].reduce((s, n) => s + centavos(n), 0));
  return { venda, impostos, comissao, retencao, ir, financeiro, custo, lucro, ajuste: ajusteCentavos / 100, rentabilidadePerc: res.rentabilidadePerc };
}
