/**
 * Regra única das horas N3 consumidas por uma rotina do pacote contratado:
 * só rotinas com `horasExecucao > 0` e não gerenciais; horas = demanda ×
 * horasExecucao, sem fator de automação (a automação reduz só o custo).
 */
export function horasN3DaRotina(
  rotina: { horasExecucao?: number; gerencial?: boolean },
  demanda: number,
): number {
  if (rotina.gerencial) return 0;
  const h = rotina.horasExecucao ?? 0;
  if (!(h > 0) || !(demanda > 0)) return 0;
  return demanda * h;
}
