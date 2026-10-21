// Import da tabela salarial do BodyShop novo. Reaproveita o parser antigo (intacto) e
// planeja, de forma pura, o que muda no catálogo antes de gravar.
import type { CargoRow } from "@/lib/profissionais/parsers";
import { FAIXAS, type BodyshopCargo } from "./calc";

// Carregado sob demanda: o parser antigo puxa leitores de PDF/Word que só existem no navegador.
export const parseCargosFile = async (f: File) => (await import("@/lib/profissionais/parsers")).parseCargosFile(f);
const SENIORIDADE: Record<number, string> = { 1: "Júnior", 2: "Pleno", 3: "Sênior", 4: "Especialista", 5: "Coordenador", 6: "Gerente" };

export const chaveCargo = (cargo: string, nivel: number) =>
  `${cargo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-n${nivel}`;

type Salarios = Pick<BodyshopCargo, "salario_c1" | "salario_c2" | "salario_c3" | "salario_c4" | "salario_c5" | "salario_c6">;

export interface ItemImport {
  tipo: "novo" | "atualizado" | "igual";
  slug: string; cargo: string; area: string | null; nivel_num: number; senioridade: string;
  salarios: Salarios; semFaixa: boolean; descricao?: string; competencias?: string[];
  existenteId?: string; conteudo?: ConteudoImport;
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
      senioridade: r.senioridade || SENIORIDADE[nivel] || String(nivel),
      salarios, semFaixa, descricao: r.descricao, competencias: r.competencias, existenteId: ex?.id,
    });
  }
  const desativar = existentes.filter((c) => c.ativo && !vistos.has(c.slug ?? chaveCargo(c.cargo, c.nivel_num)));
  return { itens, desativar };
}

// ---- Conteúdo do cargo (descrição, atividades, competências...) lido de qualquer aba ----
export const CAMPOS_CONTEUDO = ["descricao", "atividades", "competencias", "formacao", "certificacoes", "pre_requisitos", "entregaveis", "observacoes"] as const;
export type CampoConteudo = typeof CAMPOS_CONTEUDO[number];
export type ConteudoImport = Partial<Record<CampoConteudo, string>>;
export const ROTULO_CONTEUDO: Record<CampoConteudo, string> = {
  descricao: "Descrição", atividades: "Atividades", competencias: "Competências", formacao: "Formação",
  certificacoes: "Certificações", pre_requisitos: "Pré-requisitos", entregaveis: "Entregáveis", observacoes: "Observações",
};
// Ordem importa: o primeiro campo cujo termo aparece no cabeçalho vence.
const TERMOS: [CampoConteudo, string[]][] = [
  ["pre_requisitos", ["pre-requisito", "pre requisito", "prerequisito", "requisito", "experiencia"]],
  ["certificacoes", ["certifica"]],
  ["entregaveis", ["entregave", "entregas"]],
  ["formacao", ["formacao", "escolaridade", "graduacao"]],
  ["competencias", ["competenc", "habilidade", "conhecimento", "skill"]],
  ["atividades", ["atividade", "responsabilidade", "atribuic"]],
  ["observacoes", ["observ"]],
  ["descricao", ["descricao", "descritivo", "resumo", "missao", "objetivo"]],
];
const n = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const nomeCargo = (s: string) => n(s).replace(/^an\s/, "analista ").replace(/[^a-z0-9]+/g, " ").trim();

export function campoDoCabecalho(h: string): CampoConteudo | null {
  const k = n(h);
  // Colunas de referência/rastreio não são conteúdo de proposta.
  if (/(codigo|^nome|original|fonte|revisao|salario|^area|senioridade)/.test(k)) return null;
  for (const [c, ts] of TERMOS) if (ts.some((t) => k.includes(t))) return c;
  return null;
}

/** Indexa por "cargo|nível" e por "cargo" (nome normalizado). */
export function indexarConteudo(linhas: Record<string, unknown>[]): Map<string, ConteudoImport> {
  const idx = new Map<string, ConteudoImport>();
  for (const r of linhas) {
    let cargo = "", nivel = 0;
    const c: ConteudoImport = {};
    for (const [h, v] of Object.entries(r)) {
      const k = n(h), val = String(v ?? "").trim();
      if (!val) continue;
      if (!cargo && /(cargo|funcao|posicao|^nome)/.test(k) && !k.includes("descri")) { cargo = val; continue; }
      if (!nivel && /(nivel|senioridade)/.test(k)) { const m = val.match(/\d+/); nivel = m ? +m[0] : /junior/.test(n(val)) ? 1 : /pleno/.test(n(val)) ? 2 : /senior/.test(n(val)) ? 3 : 0; continue; }
      const campo = campoDoCabecalho(h);
      if (campo) c[campo] = c[campo] ? `${c[campo]}\n${val}` : val;
    }
    if (!cargo || !Object.keys(c).length) continue;
    const base = nomeCargo(cargo);
    for (const key of nivel ? [`${base}|${nivel}`] : [base]) idx.set(key, { ...idx.get(key), ...c });
  }
  return idx;
}

export function conteudoDoCargo(idx: Map<string, ConteudoImport>, cargo: string, nivel: number, senioridade: string): ConteudoImport | undefined {
  const b = nomeCargo(cargo);
  return idx.get(`${b}|${nivel}`) ?? idx.get(nomeCargo(`${cargo} ${senioridade}`)) ?? idx.get(b);
}

export async function lerConteudoArquivo(f: File): Promise<Map<string, ConteudoImport>> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
  const linhas = wb.SheetNames.flatMap((s) => XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[s], { defval: "" }));
  return indexarConteudo(linhas);
}

/** Junta ao plano o conteúdo encontrado no arquivo (com o descritivo do parser antigo como reserva). */
export function anexarConteudo(plano: PlanoImport, idx: Map<string, ConteudoImport>): PlanoImport {
  return {
    ...plano,
    itens: plano.itens.map((it) => {
      const c: ConteudoImport = { ...conteudoDoCargo(idx, it.cargo, it.nivel_num, it.senioridade) };
      if (!c.descricao && it.descricao) c.descricao = it.descricao;
      if (!c.competencias && it.competencias?.length) c.competencias = it.competencias.join("\n");
      return Object.keys(c).length ? { ...it, conteudo: c } : it;
    }),
  };
}
