function norm(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length > 2);
}

const STOP = new Set(["de", "da", "do", "das", "dos", "para", "com", "sem", "the", "and"]);

function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 100) return false;
  if (t.endsWith(":")) return false;
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 5) return false;
  const upper = letters.replace(/[^A-ZÀ-Ý]/g, "").length;
  const ratio = upper / letters.length;
  // Cargo title: starts with "Cód." / "Cod." / "Código"
  if (/^c[oó]d(igo)?\.?\s/i.test(t)) return true;
  // Or mostly uppercase with at least 3 words (avoids "Propósito do cargo")
  const words = t.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]/.test(w)).length;
  return ratio >= 0.8 && words >= 3 && words <= 12;
}

interface Section { title: string; body: string; }

function splitSections(texto: string): Section[] {
  const lines = texto.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (isHeading(line)) {
      if (current && current.body.trim()) sections.push(current);
      current = { title: line.trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + raw;
    }
  }
  if (current && current.body.trim()) sections.push(current);
  return sections;
}

function score(queryTokens: string[], titleTokens: string[]): number {
  if (queryTokens.length === 0 || titleTokens.length === 0) return 0;
  const qSet = new Set(queryTokens.filter((t) => !STOP.has(t)));
  const tSet = new Set(titleTokens.filter((t) => !STOP.has(t)));
  let hits = 0;
  for (const t of qSet) if (tSet.has(t)) hits++;
  // Jaccard-like
  const union = new Set([...qSet, ...tSet]).size;
  return union === 0 ? 0 : hits / union + hits * 0.1;
}

export interface DescritivoMatch {
  titulo: string;
  conteudo: string;
  origem: string;
  score: number;
}

export function buscarDescritivoCargo(
  cargo: string,
  senioridade: string | undefined,
  docs: Array<{ nome_arquivo: string; conteudo_texto: string | null }>,
): DescritivoMatch | null {
  if (!cargo) return null;
  const query = [cargo, senioridade ?? ""].join(" ");
  const qTokens = tokens(query);
  let best: DescritivoMatch | null = null;
  for (const doc of docs) {
    if (!doc.conteudo_texto) continue;
    const sections = splitSections(doc.conteudo_texto);
    for (const sec of sections) {
      const s = score(qTokens, tokens(sec.title));
      if (s > 0 && (!best || s > best.score)) {
        best = { titulo: sec.title, conteudo: sec.body.trim(), origem: doc.nome_arquivo, score: s };
      }
    }
    // Fallback: try matching against the whole text by locating the cargo as a heading-like line
    if (!best || best.score < 0.3) {
      const lines = doc.conteudo_texto.split(/\r?\n/);
      const cargoNorm = norm(cargo);
      for (let i = 0; i < lines.length; i++) {
        if (norm(lines[i]).includes(cargoNorm) && lines[i].trim().length < 120) {
          const body = lines.slice(i + 1, i + 60).join("\n").trim();
          const s = 0.35;
          if (body && (!best || s > best.score)) {
            best = { titulo: lines[i].trim(), conteudo: body, origem: doc.nome_arquivo, score: s };
          }
          break;
        }
      }
    }
  }
  return best && best.score >= 0.15 ? best : null;
}