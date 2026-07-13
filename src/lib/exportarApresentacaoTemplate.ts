import JSZip from "jszip";
import { formatBRL } from "@/hooks/useITSMCalculator";
import type { ApresentacaoPayload } from "@/lib/exportarApresentacao";
import masterAsset from "@/assets/apresentacao-master.pptx.asset.json";

/**
 * Exportação de apresentação a partir do arquivo mestre corporativo.
 *
 * Regras (inegociáveis):
 *  - Slides 1..9 = imutáveis (byte a byte).
 *  - Slide 10 = TEMPLATE visual. Clonado 1x por bloco de conteúdo; o clone
 *    preserva a arte original (fundo, imagem, título "Proposição") e recebe
 *    novos shapes com o conteúdo transportado do Relatório de Proposição.
 *    O slide 10 original NÃO aparece na apresentação final.
 *  - Slide 11 = fechamento fixo.
 *
 * A manipulação é feita direto no OOXML via JSZip; nada é gerado por pptxgenjs.
 */

const TEMPLATE_SLIDE_INDEX = 10; // slide10.xml = template
const CLOSING_SLIDE_INDEX = 11; // slide11.xml = fechamento
const CHARS_PER_SLIDE = 900;

/* Área útil do slide 16:9 = 12192000 x 6858000 EMU */
const SLIDE_W = 12192000;
const SLIDE_H = 6858000;

/* Paleta corporativa (herdada do master) */
const COLOR_ACCENT = "EF8944"; // laranja
const COLOR_DARK = "17392F"; // verde escuro (card)
const COLOR_PRIMARY = "01764B"; // verde primário
const COLOR_TEXT = "FFFFFF";
const FONT_HEAD = "Segoe UI Black";
const FONT_BODY = "Segoe UI";

interface Block {
  titulo: string;
  conteudo: string;
  metrica1?: string;
  metrica2?: string;
  kicker?: string;
}

/* ------------------------------------------------------------------ */
/* Parser: converte o payload da Proposição em blocos de slide.        */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return formatBRL(Number.isFinite(n) ? n : 0);
}

function buildBlocks(data: ApresentacaoPayload): Block[] {
  const blocks: Block[] = [];

  // Capa da oferta
  blocks.push({
    kicker: "Proposta Comercial",
    titulo: data.ofertaNome || "Proposição",
    conteudo: [
      data.ofertaTagline,
      data.componentes?.length ? `Composta por: ${data.componentes.join(" · ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    metrica1: "Investimento mensal",
    metrica2: fmt(data.investimentoTotal),
  });

  // Camadas
  for (const c of data.camadas ?? []) {
    const linhas: string[] = [];
    if (c.tagline) linhas.push(c.tagline);
    if (c.descricao) linhas.push(c.descricao);
    if (c.incluidos?.length) {
      linhas.push("Incluído:");
      for (const item of c.incluidos) linhas.push(`• ${item}`);
    }
    if (c.restricoes?.length) {
      linhas.push("Restrições:");
      for (const item of c.restricoes) linhas.push(`• ${item}`);
    }
    if (c.horasN3?.blocos?.length) {
      linhas.push("Distribuição de horas N3:");
      for (const b of c.horasN3.blocos) {
        linhas.push(`• ${b.titulo}: ${b.horas.toFixed(1)}h`);
      }
    }
    if (c.rotinasGrupos?.length) {
      linhas.push("Rotinas:");
      for (const g of c.rotinasGrupos) {
        linhas.push(`• ${g.titulo}: ${g.items.length} rotina(s)`);
      }
    }
    const conteudo = linhas.join("\n");
    const chunks = splitContent(conteudo, CHARS_PER_SLIDE);
    chunks.forEach((chunk, i) => {
      blocks.push({
        kicker: "Camada da Oferta",
        titulo: chunks.length > 1 ? `${c.titulo} (continuação ${i + 1})` : c.titulo,
        conteudo: chunk,
        metrica1: i === 0 ? "Investimento mensal" : undefined,
        metrica2: i === 0 ? fmt(c.valor) : undefined,
      });
    });
  }

  // Itens adicionais
  if (data.itensAdicionais?.length) {
    const linhas = data.itensAdicionais.map(
      (i) => `• ${i.descricao} (${i.unidade}) — ${fmt(i.valor)}${i.observacao ? ` — ${i.observacao}` : ""}`,
    );
    const conteudo = linhas.join("\n");
    const chunks = splitContent(conteudo, CHARS_PER_SLIDE);
    chunks.forEach((chunk, i) => {
      blocks.push({
        kicker: "Escopo",
        titulo: chunks.length > 1 ? `Itens Adicionais (continuação ${i + 1})` : "Itens Adicionais",
        conteudo: chunk,
      });
    });
  }

  // Restrições gerais
  if (data.restricoesGerais?.length) {
    const conteudo = data.restricoesGerais.map((r) => `• ${r}`).join("\n");
    const chunks = splitContent(conteudo, CHARS_PER_SLIDE);
    chunks.forEach((chunk, i) => {
      blocks.push({
        kicker: "Escopo",
        titulo: chunks.length > 1 ? `Restrições Gerais (continuação ${i + 1})` : "Restrições Gerais",
        conteudo: chunk,
      });
    });
  }

  // Consolidado financeiro
  blocks.push({
    kicker: "Investimento",
    titulo: "Investimento Consolidado",
    conteudo: (data.camadas ?? [])
      .map((c) => `• ${c.titulo}: ${fmt(c.valor)}`)
      .join("\n") || "Investimento mensal total da proposição.",
    metrica1: "Total mensal",
    metrica2: fmt(data.investimentoTotal),
  });

  return blocks;
}

function splitContent(text: string, limit: number): string[] {
  if (!text) return [""];
  if (text.length <= limit) return [text];
  const lines = text.split("\n");
  const chunks: string[] = [];
  let cur = "";
  for (const line of lines) {
    if ((cur + "\n" + line).length > limit && cur) {
      chunks.push(cur);
      cur = line;
    } else {
      cur = cur ? `${cur}\n${line}` : line;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/* ------------------------------------------------------------------ */
/* Manipulação de OOXML                                                */
/* ------------------------------------------------------------------ */

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Substitui um placeholder em um XML de slide.
 *
 * O PowerPoint pode fragmentar o placeholder em múltiplos <a:r>. Para lidar
 * com isso, consolidamos os runs de cada parágrafo <a:p> antes de procurar
 * o placeholder; se encontrado, escrevemos o resultado no primeiro <a:r>
 * (mantendo o <a:rPr>) e removemos os demais.
 */
function replacePlaceholder(xml: string, placeholder: string, value: string): string {
  const escapedValue = xmlEscape(value ?? "");
  const paragraphs = xml.split(/(<a:p[ >][\s\S]*?<\/a:p>)/g);
  let changed = false;
  const out = paragraphs.map((seg) => {
    if (!seg.startsWith("<a:p")) return seg;
    // Coleta texto agregado dos runs
    const runs = [...seg.matchAll(/<a:r\b[\s\S]*?<\/a:r>/g)].map((m) => m[0]);
    if (!runs.length) return seg;
    const texts = runs.map((r) => {
      const m = r.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/);
      return m ? m[1] : "";
    });
    const joined = texts.join("");
    if (!joined.includes(placeholder)) return seg;

    const replaced = joined.split(placeholder).join(escapedValue);
    // Suporte a quebra de linha: transformar \n em múltiplos <a:br/> dentro do primeiro run
    const linhas = replaced.split("\n");
    const firstRun = runs[0];
    const rPrMatch = firstRun.match(/<a:rPr\b[\s\S]*?(\/>|<\/a:rPr>)/);
    const rPr = rPrMatch ? rPrMatch[0] : "";
    const newRun = linhas
      .map((linha, i) => {
        const t = `<a:r>${rPr}<a:t>${linha}</a:t></a:r>`;
        return i < linhas.length - 1 ? `${t}<a:br>${rPr}</a:br>` : t;
      })
      .join("");
    let newSeg = seg;
    // remove os runs originais (mantendo pPr e outros filhos), depois adiciona o novo antes de </a:p>
    for (const r of runs) newSeg = newSeg.replace(r, "");
    newSeg = newSeg.replace(/<\/a:p>$/, `${newRun}</a:p>`);
    changed = true;
    return newSeg;
  });
  return changed ? out.join("") : xml;
}

function applyPlaceholders(xml: string, block: Block): string {
  let out = xml;
  out = replacePlaceholder(out, "{{TITULO_SECAO}}", block.titulo ?? "");
  out = replacePlaceholder(out, "{{CONTEUDO}}", block.conteudo ?? "");
  out = replacePlaceholder(out, "{{METRICA_1}}", block.metrica1 ?? "");
  out = replacePlaceholder(out, "{{METRICA_2}}", block.metrica2 ?? "");
  return out;
}

/* ------------------------------------------------------------------ */
/* Núcleo: clonar slide10 N vezes e atualizar referências.             */
/* ------------------------------------------------------------------ */

async function loadMaster(): Promise<JSZip> {
  const url = (masterAsset as { url: string }).url;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao carregar template mestre (${resp.status})`);
  const buf = await resp.arrayBuffer();
  return JSZip.loadAsync(buf);
}

function nextSlideFileIndex(zip: JSZip): number {
  let max = 0;
  zip.folder("ppt/slides")?.forEach((rel) => {
    const m = rel.match(/^slide(\d+)\.xml$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max + 1;
}

function nextRid(relsXml: string): string {
  const matches = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10));
  const max = matches.length ? Math.max(...matches) : 0;
  return `rId${max + 1}`;
}

export async function exportarApresentacaoTemplate(data: ApresentacaoPayload): Promise<void> {
  const zip = await loadMaster();
  const blocks = buildBlocks(data);

  // Carregar template
  const tplPath = `ppt/slides/slide${TEMPLATE_SLIDE_INDEX}.xml`;
  const tplRelsPath = `ppt/slides/_rels/slide${TEMPLATE_SLIDE_INDEX}.xml.rels`;
  const tplXml = await zip.file(tplPath)!.async("string");
  const tplRelsXml = await zip.file(tplRelsPath)!.async("string");

  // Carregar arquivos globais mutáveis
  const contentTypesPath = "[Content_Types].xml";
  const presRelsPath = "ppt/_rels/presentation.xml.rels";
  const presPath = "ppt/presentation.xml";
  let contentTypes = await zip.file(contentTypesPath)!.async("string");
  let presRels = await zip.file(presRelsPath)!.async("string");
  let pres = await zip.file(presPath)!.async("string");

  // Gerar clones
  let fileIdx = nextSlideFileIndex(zip); // ex: 12
  const newSlideNumbers: number[] = [];
  for (const block of blocks) {
    const n = fileIdx++;
    const slidePath = `ppt/slides/slide${n}.xml`;
    const relsPath = `ppt/slides/_rels/slide${n}.xml.rels`;
    const slideXml = applyPlaceholders(tplXml, block);
    zip.file(slidePath, slideXml);
    zip.file(relsPath, tplRelsXml);
    newSlideNumbers.push(n);

    // Content_Types: registrar override
    const overrideTag = `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    if (!contentTypes.includes(overrideTag)) {
      contentTypes = contentTypes.replace("</Types>", `${overrideTag}</Types>`);
    }
  }

  // Adicionar relacionamentos em presentation.xml.rels para cada novo slide
  const newRids: Record<number, string> = {};
  for (const n of newSlideNumbers) {
    const rid = nextRid(presRels);
    newRids[n] = rid;
    const relTag = `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n}.xml"/>`;
    presRels = presRels.replace("</Relationships>", `${relTag}</Relationships>`);
  }

  // Descobrir rId do slide10 (template) e do slide11 (fechamento) em presentation.xml.rels
  const relMap = new Map<string, string>(); // rId -> target
  for (const m of presRels.matchAll(/Id="(rId\d+)"[^>]*Target="slides\/slide(\d+)\.xml"/g)) {
    relMap.set(m[1], m[2]);
  }
  let templateRid: string | null = null;
  let closingRid: string | null = null;
  for (const [rid, target] of relMap.entries()) {
    if (target === String(TEMPLATE_SLIDE_INDEX)) templateRid = rid;
    if (target === String(CLOSING_SLIDE_INDEX)) closingRid = rid;
  }

  // Atualizar <p:sldIdLst>: remover o entry do slide10 (template não aparece),
  // inserir novos slides antes do slide de fechamento (slide11).
  const sldIdLstMatch = pres.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/);
  if (!sldIdLstMatch) throw new Error("sldIdLst não encontrado em presentation.xml");
  const originalList = sldIdLstMatch[1];
  const entries = [...originalList.matchAll(/<p:sldId[^/]*\/>/g)].map((m) => m[0]);

  // extrair IDs numéricos existentes para gerar novos > 256 sem colisão
  const usedIds = new Set<number>();
  for (const e of entries) {
    const m = e.match(/id="(\d+)"/);
    if (m) usedIds.add(parseInt(m[1], 10));
  }
  let nextId = 256;
  const genId = () => {
    while (usedIds.has(nextId)) nextId++;
    const v = nextId++;
    usedIds.add(v);
    return v;
  };

  const newEntries: string[] = [];
  for (const e of entries) {
    const ridMatch = e.match(/r:id="(rId\d+)"/);
    const rid = ridMatch?.[1];
    if (rid === templateRid) continue; // remove template
    if (rid === closingRid) {
      // inserir todos os novos ANTES do fechamento
      for (const n of newSlideNumbers) {
        newEntries.push(`<p:sldId id="${genId()}" r:id="${newRids[n]}"/>`);
      }
      newEntries.push(e);
      continue;
    }
    newEntries.push(e);
  }
  // Fallback: se fechamento não achado, joga no final
  if (closingRid && !entries.some((e) => e.includes(`r:id="${closingRid}"`))) {
    for (const n of newSlideNumbers) {
      newEntries.push(`<p:sldId id="${genId()}" r:id="${newRids[n]}"/>`);
    }
  }

  pres = pres.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${newEntries.join("")}</p:sldIdLst>`,
  );

  // Persistir alterações
  zip.file(contentTypesPath, contentTypes);
  zip.file(presRelsPath, presRels);
  zip.file(presPath, pres);

  // Gerar arquivo e disparar download
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  const nome = (data.presetName || data.ofertaNome || "Proposicao").replace(/[^a-zA-Z0-9-_]+/g, "_");
  a.href = url;
  a.download = `${nome}_${stamp}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}