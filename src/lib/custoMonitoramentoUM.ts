// Custo de monitoramento por UM (Unidade de Medida).
// Modelo baseado em pesos por tipo de ativo + faixas marginais progressivas de CUSTO/UM.
// Substitui os campos legados `custoAtivoMonitorado`, `custoAtivoFlow`, `custoAtivoOperacao`.

export interface MonitorPesos {
  servidores: number;
  bancoDados: number;
  firewall: number;
  ativosRede: number;
}

export interface MonitorFaixa {
  de: number;         // limite inferior (exclusive) em UM
  ate: number;        // limite superior (inclusive) em UM
  custoPorUM: number; // R$/mês por UM dentro da faixa
}

export interface MonitorInventario {
  qtdServidores: number;
  qtdBancosDados: number;
  qtdSistemas: number;   // Firewall no domínio ITSM
  qtdAtivosRede: number;
}

export const DEFAULT_MONITOR_PESOS: MonitorPesos = {
  servidores: 1,
  bancoDados: 1.2,
  firewall: 0.7,
  ativosRede: 0.5,
};

export const DEFAULT_MONITOR_FAIXAS: MonitorFaixa[] = [
  { de: 0,   ate: 50,     custoPorUM: 25 },
  { de: 50,  ate: 150,    custoPorUM: 18 },
  { de: 150, ate: 300,    custoPorUM: 12 },
  { de: 300, ate: 600,    custoPorUM: 9 },
  { de: 600, ate: 100000, custoPorUM: 6.5 },
];

export const DEFAULT_MONITOR_PISO = 0;

export function computeUMTotal(inv: MonitorInventario, pesos: MonitorPesos): number {
  return (
    (inv.qtdServidores || 0) * (pesos.servidores || 0) +
    (inv.qtdBancosDados || 0) * (pesos.bancoDados || 0) +
    (inv.qtdSistemas || 0) * (pesos.firewall || 0) +
    (inv.qtdAtivosRede || 0) * (pesos.ativosRede || 0)
  );
}

export function computeCustoPorUMMarginal(umTotal: number, faixas: MonitorFaixa[]): number {
  // Retorna o custo/UM da faixa em que se encontra o UM total (usado para
  // preço marginal de novos ativos em itens adicionais).
  if (!faixas || faixas.length === 0) return 0;
  const um = Math.max(0, umTotal);
  // Inventário vazio (ou abaixo do início da primeira faixa): o próximo ativo
  // cai na faixa de entrada, não na última (mais barata).
  if (um <= faixas[0].de) return faixas[0].custoPorUM || 0;
  for (const f of faixas) {
    if (um > f.de && um <= f.ate) return f.custoPorUM || 0;
  }
  // Se acima da última faixa, usa a última.
  return faixas[faixas.length - 1].custoPorUM || 0;
}

export function computeCustoMonitoramentoTotal(
  inv: MonitorInventario,
  pesos: MonitorPesos,
  faixas: MonitorFaixa[],
  piso = 0,
): { umTotal: number; custoTotal: number; custoMedioPorUM: number; pisoAplicado: boolean } {
  const umTotal = computeUMTotal(inv, pesos);
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