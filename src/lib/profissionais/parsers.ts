import * as XLSX from "xlsx";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
// vite worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface CargoRow {
  cargo: string;
  area: string;
  nivel: string;
  salario_base: number;
  descricao?: string;
  competencias?: string[];
  /** Nível interno numérico (1..6). 1=Júnior, 2=Pleno, 3=Sênior, 4=Especialista... */
  nivel_num?: number;
  /** Nome de mercado correspondente ao nível (Júnior/Pleno/Sênior/...) */
  senioridade?: string;
  /** Faixas salariais C1..C6 dentro do mesmo nível */
  faixas?: Record<string, number>;
  ajuste_vertical_pct?: number;
  ajuste_horizontal_pct?: number;
}

function norm(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function pickKey(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const k of Object.keys(row)) {
    const nk = norm(k);
    if (candidates.some((c) => nk.includes(c))) return row[k];
  }
  return undefined;
}

function parseSalario(v: unknown): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

// Mapeamento Nível interno -> nome de mercado
export const NIVEL_SENIORIDADE: Record<number, string> = {
  1: "Júnior",
  2: "Pleno",
  3: "Sênior",
  4: "Especialista",
  5: "Coordenador",
  6: "Gerente",
};

export const FAIXAS_C = ["C1", "C2", "C3", "C4", "C5", "C6"] as const;

function parseNivelNum(v: unknown): number {
  if (v == null) return 0;
  const s = norm(String(v));
  const m = s.match(/(\d+)/);
  if (!m) {
    // Também aceita nome direto (junior/pleno/...)
    if (s.includes("junior")) return 1;
    if (s.includes("pleno")) return 2;
    if (s.includes("senior")) return 3;
    if (s.includes("especial")) return 4;
    if (s.includes("coord")) return 5;
    if (s.includes("gerent")) return 6;
    return 0;
  }
  return parseInt(m[1], 10);
}

function parsePct(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v < 1 ? v * 100 : v;
  const s = String(v).replace(/[^\d,.\-]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

export async function parseCargosFile(file: File): Promise<{ rows: CargoRow[]; texto: string }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const rows: CargoRow[] = json
    .map((r) => {
      const cargo = String(
        pickKey(r, ["nome do cargo", "cargo", "funcao", "função", "posicao", "posição"]) ?? "",
      ).trim();
      const area = String(pickKey(r, ["area", "área", "dominio", "domínio", "departamento"]) ?? "").trim();
      const nivelRaw = String(pickKey(r, ["nivel", "nível", "senioridade"]) ?? "").trim();
      const nivel_num = parseNivelNum(nivelRaw);
      const senioridade = NIVEL_SENIORIDADE[nivel_num] || nivelRaw;

      // Faixas C1..C6 (ou variantes "faixa N")
      const faixas: Record<string, number> = {};
      for (const k of Object.keys(r)) {
        const nk = norm(k).replace(/\s+/g, "");
        const m = nk.match(/^c(\d+)$/) || nk.match(/^faixa(\d+)$/);
        if (m) {
          const idx = parseInt(m[1], 10);
          if (idx >= 1 && idx <= 6) {
            const v = parseSalario(r[k]);
            if (v > 0) faixas[`C${idx}`] = v;
          }
        }
      }

      // Salário "base" padrão: faixa mediana (C3) ou primeira disponível
      let salario = parseSalario(
        pickKey(r, ["salario base", "salario", "salário", "remuneracao", "remuneração"]),
      );
      if (!salario) {
        salario = faixas.C3 ?? faixas.C2 ?? faixas.C1 ?? Object.values(faixas)[0] ?? 0;
      }

      const ajuste_vertical_pct = parsePct(pickKey(r, ["ajuste vertical", "vertical"]));
      const ajuste_horizontal_pct = parsePct(pickKey(r, ["ajuste horizontal", "horizontal"]));

      const descricao = String(pickKey(r, ["descricao", "descrição", "resumo"]) ?? "").trim() || undefined;
      const comp = String(pickKey(r, ["competencia", "competência", "skill", "habilidade"]) ?? "").trim();
      return {
        cargo,
        area,
        nivel: senioridade || nivelRaw,
        nivel_num: nivel_num || undefined,
        senioridade: senioridade || undefined,
        faixas: Object.keys(faixas).length > 0 ? faixas : undefined,
        ajuste_vertical_pct: ajuste_vertical_pct || undefined,
        ajuste_horizontal_pct: ajuste_horizontal_pct || undefined,
        salario_base: salario,
        descricao,
        competencias: comp ? comp.split(/[;,|]/).map((s) => s.trim()).filter(Boolean) : undefined,
      };
    })
    .filter((r) => r.cargo && r.salario_base > 0);

  const texto = rows
    .map((r) => {
      const faixasTxt = r.faixas
        ? Object.entries(r.faixas).map(([k, v]) => `${k}=${v}`).join(", ")
        : `Salário=${r.salario_base}`;
      const niv = r.nivel_num
        ? `Nível ${r.nivel_num} (${r.senioridade})`
        : r.nivel;
      return `Cargo: ${r.cargo}${r.area ? ` | Área: ${r.area}` : ""} | ${niv} | Faixas: ${faixasTxt}${r.descricao ? ` | ${r.descricao}` : ""}`;
    })
    .join("\n");

  return { rows, texto };
}

export async function parseDescritivosFile(file: File): Promise<{ texto: string; cargosIdentificados: string[] }> {
  const name = file.name.toLowerCase();
  let texto = "";

  if (name.endsWith(".txt")) {
    texto = await file.text();
  } else if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    texto = result.value;
  } else if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it: any) => it.str).join(" "));
    }
    texto = parts.join("\n\n");
  } else {
    throw new Error("Formato não suportado. Use PDF, DOCX ou TXT.");
  }

  // Heurística simples: linhas que parecem títulos de cargo (Maiúsculas Iniciais, sem ponto final)
  const lines = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cargosIdentificados = Array.from(
    new Set(
      lines.filter((l) => l.length < 80 && /^[A-ZÁÉÍÓÚÂÊÔÇÃÕ][\w\sÀ-ÿ\-/]+$/u.test(l) && !l.endsWith(".") && l.split(" ").length <= 8),
    ),
  ).slice(0, 200);

  return { texto, cargosIdentificados };
}