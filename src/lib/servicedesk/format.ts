export const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

/** Volumes calculados: sempre no máximo 1 casa decimal. */
export const vol = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export const pct = (v: number) =>
  `${(Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;