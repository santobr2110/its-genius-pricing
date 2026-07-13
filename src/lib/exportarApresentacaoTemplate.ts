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
const CHARS_PER_SLIDE = 520;
const LINES_PER_COLUMN = 12;

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

/* ------------------------------------------------------------------ */
/* Construção de shapes OOXML para conteúdo transportado.              */
/* ------------------------------------------------------------------ */

interface Para {
  text: string;
  bullet?: boolean;
  header?: boolean;
  sz?: number;
  color?: string;
  bold?: boolean;
}

function parseParagraphs(content: string): Para[] {
  const out: Para[] = [];
  const lines = (content ?? "").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      out.push({ text: "" });
      continue;
    }
    if (line.startsWith("• ")) {
      out.push({ text: line.slice(2).trim(), bullet: true });
    } else if (/^[A-Za-zÀ-ÿ][^:]{0,60}:$/.test(line)) {
      // "Incluído:", "Restrições:", etc.
      out.push({ text: line, header: true, bold: true, color: COLOR_ACCENT });
    } else {
      out.push({ text: line });
    }
  }
  return out;
}

function runXml(text: string, opts: { sz?: number; bold?: boolean; color?: string; font?: string } = {}) {
  const sz = opts.sz ?? 1600;
  const bold = opts.bold ? ' b="1"' : "";
  const color = opts.color ?? COLOR_TEXT;
  const font = opts.font ?? FONT_BODY;
  return (
    `<a:r><a:rPr lang="pt-BR" sz="${sz}"${bold} dirty="0">` +
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/>` +
    `</a:rPr><a:t>${xmlEscape(text)}</a:t></a:r>`
  );
}

function paragraphXml(p: Para, defaults: { sz: number; color: string; font: string }): string {
  if (!p.text) {
    return `<a:p><a:pPr algn="l"/><a:endParaRPr lang="pt-BR" sz="${defaults.sz}"/></a:p>`;
  }
  const sz = p.sz ?? (p.header ? defaults.sz + 200 : defaults.sz);
  const color = p.color ?? defaults.color;
  const bold = !!p.bold || !!p.header;
  if (p.bullet) {
    return (
      `<a:p><a:pPr marL="285750" indent="-285750" algn="l">` +
      `<a:buClr><a:srgbClr val="${COLOR_ACCENT}"/></a:buClr>` +
      `<a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr>` +
      runXml(p.text, { sz, color, font: defaults.font }) +
      `</a:p>`
    );
  }
  return (
    `<a:p><a:pPr algn="l"><a:buNone/></a:pPr>` +
    runXml(p.text, { sz, color, bold, font: p.header ? FONT_HEAD : defaults.font }) +
    `</a:p>`
  );
}

function textShape(opts: {
  id: number;
  name: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  paragraphs: string; // XML pronto de <a:p>...
  anchor?: "t" | "ctr" | "b";
  autofit?: "norm" | "spAuto" | "none";
}): string {
  const anchor = opts.anchor ?? "t";
  const autofit =
    opts.autofit === "spAuto"
      ? "<a:spAutoFit/>"
      : opts.autofit === "none"
        ? ""
        : '<a:normAutofit fontScale="100000" lnSpcReduction="0"/>';
  return (
    `<p:sp><p:nvSpPr>` +
    `<p:cNvPr id="${opts.id}" name="${opts.name}"/>` +
    `<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${opts.x}" y="${opts.y}"/>` +
    `<a:ext cx="${opts.cx}" cy="${opts.cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="${anchor}">${autofit}</a:bodyPr>` +
    `<a:lstStyle/>${opts.paragraphs}</p:txBody></p:sp>`
  );
}

function rectShape(opts: {
  id: number;
  name: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  fill: string;
  alpha?: number; // 0..100000
  lineColor?: string;
}): string {
  const fill = opts.alpha
    ? `<a:solidFill><a:srgbClr val="${opts.fill}"><a:alpha val="${opts.alpha}"/></a:srgbClr></a:solidFill>`
    : `<a:solidFill><a:srgbClr val="${opts.fill}"/></a:solidFill>`;
  const line = opts.lineColor
    ? `<a:ln w="12700"><a:solidFill><a:srgbClr val="${opts.lineColor}"/></a:solidFill></a:ln>`
    : `<a:ln><a:noFill/></a:ln>`;
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${opts.id}" name="${opts.name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${opts.x}" y="${opts.y}"/><a:ext cx="${opts.cx}" cy="${opts.cy}"/></a:xfrm>` +
    `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 8000"/></a:avLst></a:prstGeom>` +
    fill + line + `</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="pt-BR"/></a:p></p:txBody></p:sp>`
  );
}

function accentBarShape(id: number, x: number, y: number, cy: number): string {
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Accent${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="80000" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `<a:solidFill><a:srgbClr val="${COLOR_ACCENT}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="pt-BR"/></a:p></p:txBody></p:sp>`
  );
}

/**
 * Injeta shapes de conteúdo dentro do <p:spTree> preservando toda a arte
 * original do slide 10 (fundo, imagem, título "Proposição").
 */
function buildContentSlide(templateXml: string, block: Block, seed: number): string {
  const idBase = 5000 + seed * 20;

  // Layout (EMU)
  const marginX = 650000;
  const contentW = SLIDE_W - marginX * 2; // ~10.9M
  const kickerY = 1500000;
  const kickerH = 320000;
  const titleY = 1830000;
  const titleH = 900000;
  const bodyY = 2820000;
  const bodyH = 3400000;
  const metricW = 3400000;
  const metricH = 620000;
  const metricX = SLIDE_W - marginX - metricW;
  const metricY = SLIDE_H - 780000;

  const kickerText = (block.kicker || "Proposição").toUpperCase();
  const titleText = (block.titulo || "").toUpperCase();
  const paras = parseParagraphs(block.conteudo || "");

  const parasXml = paras
    .map((p) => paragraphXml(p, { sz: 1500, color: COLOR_TEXT, font: FONT_BODY }))
    .join("");

  const shapes: string[] = [];

  // Barra de acento vertical
  shapes.push(accentBarShape(idBase + 1, marginX, kickerY, titleY + titleH - kickerY));

  // Kicker (etiqueta de seção)
  shapes.push(
    textShape({
      id: idBase + 2,
      name: `Kicker${idBase}`,
      x: marginX + 180000,
      y: kickerY,
      cx: contentW - 180000,
      cy: kickerH,
      autofit: "none",
      paragraphs:
        `<a:p><a:pPr algn="l"><a:buNone/></a:pPr>` +
        runXml(kickerText, { sz: 1400, bold: true, color: COLOR_ACCENT, font: FONT_HEAD }) +
        `</a:p>`,
    }),
  );

  // Título grande
  shapes.push(
    textShape({
      id: idBase + 3,
      name: `Titulo${idBase}`,
      x: marginX + 180000,
      y: titleY,
      cx: contentW - 180000,
      cy: titleH,
      autofit: "norm",
      paragraphs:
        `<a:p><a:pPr algn="l"><a:buNone/></a:pPr>` +
        runXml(titleText, { sz: 4000, bold: true, color: COLOR_TEXT, font: FONT_HEAD }) +
        `</a:p>`,
    }),
  );

  // Card de fundo do corpo (verde escuro translúcido)
  shapes.push(
    rectShape({
      id: idBase + 4,
      name: `Card${idBase}`,
      x: marginX,
      y: bodyY,
      cx: contentW,
      cy: bodyH,
      fill: COLOR_DARK,
      alpha: 78000,
      lineColor: COLOR_PRIMARY,
    }),
  );

  // Corpo de texto
  shapes.push(
    textShape({
      id: idBase + 5,
      name: `Body${idBase}`,
      x: marginX + 260000,
      y: bodyY + 180000,
      cx: contentW - 520000,
      cy: bodyH - 360000,
      autofit: "norm",
      paragraphs: parasXml || `<a:p><a:endParaRPr lang="pt-BR"/></a:p>`,
    }),
  );

  // Card de métrica (canto inferior direito)
  if (block.metrica1 && block.metrica2) {
    shapes.push(
      rectShape({
        id: idBase + 6,
        name: `MetricBg${idBase}`,
        x: metricX,
        y: metricY,
        cx: metricW,
        cy: metricH,
        fill: COLOR_ACCENT,
      }),
    );
    shapes.push(
      textShape({
        id: idBase + 7,
        name: `MetricLabel${idBase}`,
        x: metricX + 120000,
        y: metricY + 60000,
        cx: metricW - 240000,
        cy: 220000,
        autofit: "none",
        paragraphs:
          `<a:p><a:pPr algn="l"><a:buNone/></a:pPr>` +
          runXml(block.metrica1, { sz: 1000, bold: true, color: COLOR_DARK, font: FONT_HEAD }) +
          `</a:p>`,
      }),
    );
    shapes.push(
      textShape({
        id: idBase + 8,
        name: `MetricValue${idBase}`,
        x: metricX + 120000,
        y: metricY + 260000,
        cx: metricW - 240000,
        cy: metricH - 300000,
        autofit: "norm",
        paragraphs:
          `<a:p><a:pPr algn="l"><a:buNone/></a:pPr>` +
          runXml(block.metrica2, { sz: 2400, bold: true, color: COLOR_TEXT, font: FONT_HEAD }) +
          `</a:p>`,
      }),
    );
  }

  const injection = shapes.join("");
  return templateXml.replace(/<\/p:spTree>/, `${injection}</p:spTree>`);
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
  let seed = 0;
  for (const block of blocks) {
    const n = fileIdx++;
    const slidePath = `ppt/slides/slide${n}.xml`;
    const relsPath = `ppt/slides/_rels/slide${n}.xml.rels`;
    const slideXml = buildContentSlide(tplXml, block, seed++);
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