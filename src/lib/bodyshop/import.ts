// Import da tabela salarial do BodyShop novo. Reaproveita o parser antigo (intacto) e
// planeja, de forma pura, o que muda no catálogo antes de gravar.
import type { CargoRow } from "@/lib/profissionais/parsers";
import { NIVEL_SENIORIDADE } from "@/lib/profissionais/parsers";
import { FAIXAS, type BodyshopCargo } from "./calc";

export { parseCargosFile } from "@/lib/profissionais/parsers";

export const chaveCargo = (cargo: string, nivel: number) =>
  `${cargo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-n${nivel}`;

type Salarios = Pick<BodyshopCargo, "salario_c1" | "salario_c2" | "salario_c3" | "salario_c4" | "salario_c5" | "salario_c6">;

export interface ItemImport {
  tipo: "novo" | "atualizado" | "igual";
  slug: string; cargo: string; area: string | null; nivel_num: number; senioridade: string;
  salarios: Salarios; semFaixa: boolean; descricao?: string; competencias?: string[];
  existenteId?: string;
}
export interface PlanoImport { itens: ItemImport[]; desativar: BodyshopCargo[] }

function salariosDe(r: CargoRow): Salarios {
  const out = {} as Salarios;
  for (const f of FAIXAS) {
    const v = r.faixas?.[f.toUpperCase()];
    out[`salario_${f}` as keyof Salarios] = v && v > 0 ? v : null;
  }
  return out;
}

export function planejarImport(rows: CargoRow[], existentes: BodyshopCargo[]): PlanoImport {
  const porChave = new Map(existentes.map((c) => [c.slug ?? chaveCargo(c.cargo, c.nivel_num), c]));
  const vistos = new Set<string>();
  const itens: ItemImport[] = [];
  for (const r of rows) {
    const nivel = r.nivel_num ?? 0;
    if (!r.cargo || nivel < 1) continue;
    const slug = chaveCargo(r.cargo, nivel);
    if (vistos.has(slug)) continue;
    vistos.add(slug);
    const salarios = salariosDe(r);
    const semFaixa = FAIXAS.every((f) => salarios[`salario_${f}` as keyof Salarios] == null);
    const ex = porChave.get(slug);
    const igual = ex && FAIXAS.every((f) => (ex[`salario_${f}` as keyof Salarios] ?? null) === salarios[`salario_${f}` as keyof Salarios]) && ex.ativo === !semFaixa;
    itens.push({
      tipo: !ex ? "novo" : igual ? "igual" : "atualizado",
      slug, cargo: r.cargo, area: r.area || null, nivel_num: nivel,
      senioridade: r.senioridade || NIVEL_SENIORIDADE[nivel] || String(nivel),
      salarios, semFaixa, descricao: r.descricao, competencias: r.competencias, existenteId: ex?.id,
    });
  }
  const desativar = existentes.filter((c) => c.ativo && !vistos.has(c.slug ?? chaveCargo(c.cargo, c.nivel_num)));
  return { itens, desativar };
}
