// Custo de plataforma/atendimento por UM (Unidade de Medida) do Smart Service Desk.
// Mesma mecânica de faixas marginais progressivas usada no Smart ITO, porém com
// pesos de usuário/estação em vez de ativos de infraestrutura.

export interface AtendimentoPesos {
  usuarioPadrao: number;
  usuarioVIP: number;
  estacaoTrabalho: number;
}

export interface AtendimentoFaixa {
  de: number;
  ate: number;
  custoPorUM: number;
}

export interface AtendimentoInventario {
  qtdUsuariosPadrao: number;
  qtdUsuariosVIP: number;
  qtdEstacoes: number;
}

export const DEFAULT_ATENDIMENTO_PESOS: AtendimentoPesos = {
  usuarioPadrao: 1,
  usuarioVIP: 2.5,
  estacaoTrabalho: 0.4,
};

export const DEFAULT_ATENDIMENTO_FAIXAS: AtendimentoFaixa[] = [
  { de: 0, ate: 100, custoPorUM: 12 },
  { de: 100, ate: 300, custoPorUM: 9 },
  { de: 300, ate: 800, custoPorUM: 6.5 },
  { de: 800, ate: 2000, custoPorUM: 4.5 },
  { de: 2000, ate: 100000, custoPorUM: 3 },
];

export const DEFAULT_ATENDIMENTO_PISO = 0;

export function computeUMAtendimento(
  inv: AtendimentoInventario,
  pesos: AtendimentoPesos,
): number {
  return (
    (inv.qtdUsuariosPadrao || 0) * (pesos.usuarioPadrao || 0) +
    (inv.qtdUsuariosVIP || 0) * (pesos.usuarioVIP || 0) +
    (inv.qtdEstacoes || 0) * (pesos.estacaoTrabalho || 0)
  );
}

/** Custo/UM marginal (faixa em que o próximo UM cai) — usado em itens adicionais. */
export function computeCustoPorUMAtendimentoMarginal(
  umTotal: number,
  faixas: AtendimentoFaixa[],
): number {
  if (!faixas || faixas.length === 0) return 0;
  const um = Math.max(0, umTotal);
  if (um <= faixas[0].de) return faixas[0].custoPorUM || 0;
  for (const f of faixas) {
    if (um > f.de && um <= f.ate) return f.custoPorUM || 0;
  }
  return faixas[faixas.length - 1].custoPorUM || 0;
}

export function computeCustoAtendimentoTotal(
  inv: AtendimentoInventario,
  pesos: AtendimentoPesos,
  faixas: AtendimentoFaixa[],
  piso = 0,
): { umTotal: number; custoTotal: number; custoMedioPorUM: number; pisoAplicado: boolean } {
  const umTotal = computeUMAtendimento(inv, pesos);
  let custo = 0;
  for (const f of faixas) {
    const parcela = Math.max(0, Math.min(umTotal, f.ate) - f.de);
    custo += parcela * (f.custoPorUM || 0);
  }
  const pisoAplicado = piso > 0 && custo < piso;
  const custoTotal = pisoAplicado ? piso : custo;
  const custoMedioPorUM = umTotal > 0 ? custoTotal / umTotal : 0;
  return { umTotal, custoTotal, custoMedioPorUM, pisoAplicado };
}