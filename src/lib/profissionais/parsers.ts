import * as XLSX from "xlsx";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error - vite worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface CargoRow {
  cargo: string;
  area: string;
  nivel: string;
  salario_base: number;
  descricao?: string;
  competencias?: string[];
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

export async function parseCargosFile(file: File): Promise<{ rows: CargoRow[]; texto: string }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const rows: CargoRow[] = json
    .map((r) => {
      const cargo = String(pickKey(r, ["cargo", "funcao", "função", "posicao", "posição"]) ?? "").trim();
      const area = String(pickKey(r, ["area", "área", "dominio", "domínio", "departamento"]) ?? "").trim();
      const nivel = String(pickKey(r, ["nivel", "nível", "senioridade"]) ?? "").trim();
      const salario = parseSalario(pickKey(r, ["salario", "salário", "remuneracao", "remuneração", "valor"]));
      const descricao = String(pickKey(r, ["descricao", "descrição", "resumo"]) ?? "").trim() || undefined;
      const comp = String(pickKey(r, ["competencia", "competência", "skill", "habilidade"]) ?? "").trim();
      return {
        cargo,
        area,
        nivel,
        salario_base: salario,
        descricao,
        competencias: comp ? comp.split(/[;,|]/).map((s) => s.trim()).filter(Boolean) : undefined,
      };
    })
    .filter((r) => r.cargo && r.salario_base > 0);

  const texto = rows
    .map((r) => `Cargo: ${r.cargo} | Área: ${r.area} | Nível: ${r.nivel} | Salário: ${r.salario_base}${r.descricao ? ` | ${r.descricao}` : ""}`)
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