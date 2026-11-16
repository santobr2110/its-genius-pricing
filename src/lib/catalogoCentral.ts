/** Regras puras do catálogo central de rotinas/GMUDs (testadas em catalogoCentral.test.ts). */

/** Conta itens adicionados, removidos ou alterados entre duas listas (por `id`). */
export function contarAlteracoesCatalogo<T extends { id: string }>(base: T[], rascunho: T[]): number {
  const mapaBase = new Map(base.map((x) => [x.id, JSON.stringify(x)]));
  const idsRascunho = new Set(rascunho.map((x) => x.id));
  let n = 0;
  for (const item of rascunho) {
    const anterior = mapaBase.get(item.id);
    if (anterior === undefined || anterior !== JSON.stringify(item)) n++;
  }
  for (const id of mapaBase.keys()) if (!idsRascunho.has(id)) n++;
  // Reordenação sem outras mudanças também é uma alteração publicável.
  if (n === 0 && base.map((x) => x.id).join("|") !== rascunho.map((x) => x.id).join("|")) n = 1;
  return n;
}
