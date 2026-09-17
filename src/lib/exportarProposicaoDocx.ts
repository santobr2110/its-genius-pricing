/**
 * Exporta o Relatório de Proposição para Word (.docx) em layout formal.
 *
 * Em vez de clonar os cartões visuais da tela, o conteúdo é reinterpretado
 * semanticamente: cada bloco vira um capítulo numerado, subtítulos viram
 * seções, pares rótulo/valor viram tabelas simples e as listas viram
 * marcadores. O resultado é um documento limpo, sem molduras nem cores.
 */


const MAX_HEADING_LEN = 80;

function textOf(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isHidden(el: Element): boolean {
  const s = window.getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return true;
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (r && r.height === 0 && r.width === 0) return true;
  return false;
}

function isHeadingLike(el: Element): boolean {
  const t = textOf(el);
  if (!t || t.length > MAX_HEADING_LEN) return false;
  const s = window.getComputedStyle(el);
  const weight = Number(s.fontWeight) || 400;
  return s.textTransform === "uppercase" && weight >= 600;
}

function blockChildren(el: Element): Element[] {
  return Array.from(el.children).filter((c) => {
    const tag = c.tagName.toLowerCase();
    if (tag === "svg" || tag === "script" || tag === "style" || tag === "button") return false;
    if (isHidden(c)) return false;
    return textOf(c).length > 0 || tag === "table";
  });
}

/** Elemento "folha": não possui filhos estruturais (div/section/ul/table...). */
function isLeaf(el: Element): boolean {
  return !Array.from(el.children).some((c) =>
    ["div", "section", "ul", "ol", "table", "dl", "article", "li"].includes(c.tagName.toLowerCase()),
  );
}

/** Partes de texto diretas de um elemento folha. */
function leafParts(el: Element): string[] {
  const parts: string[] = [];
  const kids = Array.from(el.children).filter((c) => c.tagName.toLowerCase() !== "svg" && !isHidden(c));
  if (kids.length === 0) {
    const t = textOf(el);
    return t ? [t] : [];
  }
  for (const k of kids) {
    const t = textOf(k);
    if (t) parts.push(t);
  }
  const own = Array.from(el.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return [...own, ...parts];
}

function renderTable(table: Element): string {
  const rows = Array.from(table.querySelectorAll("tr")).filter((r) => !isHidden(r));
  if (rows.length === 0) return "";
  const out: string[] = [];
  rows.forEach((tr, i) => {
    const cells = Array.from(tr.children).filter((c) => !isHidden(c));
    if (cells.length === 0) return;
    const isHead = tr.closest("thead") !== null || (i === 0 && cells[0].tagName.toLowerCase() === "th");
    const tag = isHead ? "th" : "td";
    const tds = cells
      .map((c) => {
        const align = window.getComputedStyle(c).textAlign;
        const a = align === "right" || align === "center" ? ` align="${align}"` : "";
        return `<${tag}${a}>${esc(textOf(c))}</${tag}>`;
      })
      .join("");
    out.push(`<tr class="${isHead ? "hdr" : ""}">${tds}</tr>`);
  });
  return `<table class="data">${out.join("")}</table>`;
}

function renderList(list: Element): string {
  const items = Array.from(list.children)
    .filter((li) => !isHidden(li))
    .map((li) => textOf(li))
    .filter(Boolean);
  if (items.length === 0) return "";
  const tag = list.tagName.toLowerCase() === "ol" ? "ol" : "ul";
  return `<${tag}>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`;
}

type KV = { label: string; value: string };

class Emitter {
  out: string[] = [];
  private kv: KV[] = [];
  constructor(private chapter: number) {}
  private flushKV() {
    if (this.kv.length === 0) return;
    const rows = this.kv
      .map((p) => `<tr><td class="kv-l">${esc(p.label)}</td><td class="kv-v">${esc(p.value)}</td></tr>`)
      .join("");
    this.out.push(`<table class="kv">${rows}</table>`);
    this.kv = [];
  }
  pushKV(label: string, value: string) {
    this.kv.push({ label, value });
  }
  push(html: string) {
    if (!html) return;
    this.flushKV();
    this.out.push(html);
  }
  subsection(n: number, title: string) {
    this.flushKV();
    this.out.push(`<h2>${this.chapter}.${n} ${esc(title)}</h2>`);
  }
  finish(): string {
    this.flushKV();
    return this.out.join("\n");
  }
}

function renderBlock(el: Element, em: Emitter, sub: { n: number }) {
  for (const child of blockChildren(el)) {
    const tag = child.tagName.toLowerCase();

    if (tag === "table") {
      em.push(renderTable(child));
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      em.push(renderList(child));
      continue;
    }
    if (tag === "dl") {
      const kids = Array.from(child.children);
      for (let i = 0; i < kids.length; i++) {
        if (kids[i].tagName.toLowerCase() === "dt") {
          const label = textOf(kids[i]);
          const value = kids[i + 1] && kids[i + 1].tagName.toLowerCase() === "dd" ? textOf(kids[i + 1]) : "";
          if (label) em.pushKV(label, value);
        }
      }
      continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      sub.n += 1;
      em.subsection(sub.n, textOf(child));
      continue;
    }
    if (isHeadingLike(child) && isLeaf(child)) {
      sub.n += 1;
      em.subsection(sub.n, textOf(child));
      continue;
    }
    if (isLeaf(child)) {
      const parts = leafParts(child).filter(Boolean);
      const uniq = parts.filter((p, i) => parts.indexOf(p) === i);
      if (uniq.length === 0) continue;
      if (uniq.length === 1) {
        em.push(`<p>${esc(uniq[0])}</p>`);
      } else if (uniq.length === 2) {
        em.pushKV(uniq[0], uniq[1]);
      } else {
        em.pushKV(uniq[0], uniq.slice(1).join(" — "));
      }
      continue;
    }
    renderBlock(child, em, sub);
  }
}

/** Título do capítulo: primeiro heading real ou primeiro texto em destaque. */
function chapterTitle(section: Element): { title: string; node: Element | null } {
  const h = section.querySelector("h1, h2, h3");
  if (h && !isHidden(h) && textOf(h)) return { title: textOf(h), node: h };
  const candidates = Array.from(section.querySelectorAll("p, span, div")).filter(
    (e) => !isHidden(e) && isLeaf(e) && textOf(e) && textOf(e).length <= MAX_HEADING_LEN,
  );
  for (const c of candidates) {
    const s = window.getComputedStyle(c);
    if ((Number(s.fontWeight) || 400) >= 700 && parseFloat(s.fontSize) >= 13) {
      return { title: textOf(c), node: c };
    }
  }
  return { title: "", node: null };
}

function buildDocumentHtml(root: HTMLElement): string {
  const sections = Array.from(root.children).filter(
    (c) => !isHidden(c) && textOf(c).length > 0,
  ) as HTMLElement[];

  // Capa: primeira seção (título da oferta).
  let coverTitle = "Proposição de Smart ITO";
  let coverSubtitle = "";
  let composta = "";
  const body: string[] = [];
  let chapter = 0;

  sections.forEach((section, idx) => {
    if (idx === 0) {
      const h1 = section.querySelector("h1");
      if (h1) coverTitle = textOf(h1);
      const desc = section.querySelector(".report-description");
      if (desc) coverSubtitle = textOf(desc);
      const list = section.querySelector(".composta-list");
      if (list) composta = textOf(list).replace(/^Composta por\s*/i, "");
      return;
    }
    const { title, node } = chapterTitle(section);
    chapter += 1;
    const heading = title || `Seção ${chapter}`;
    body.push(`<h1>${chapter}. ${esc(heading)}</h1>`);
    if (node) node.setAttribute("data-docx-skip", "1");
    const em = new Emitter(chapter);
    renderBlock(section, em, { n: 0 });
    if (node) node.removeAttribute("data-docx-skip");
    // remove eventual repetição do título como primeiro parágrafo
    const html = em.finish().replace(new RegExp(`^<p>${escapeRe(esc(heading))}</p>\\n?`), "");
    body.push(html);
  });

  const cover = `
    <div class="cover">
      <p class="eyebrow">Proposta Comercial</p>
      <h1 class="cover-title">${esc(coverTitle)}</h1>
      ${coverSubtitle ? `<p class="cover-sub">${esc(coverSubtitle)}</p>` : ""}
      ${composta ? `<p class="cover-sub">Composta por: ${esc(composta)}</p>` : ""}
      <p class="cover-date">Emitido em ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
    body { font-family: "Calibri", Arial, sans-serif; font-size: 11pt; color: #000; line-height: 1.35; }
    p { margin: 0 0 8pt 0; text-align: justify; }
    h1 { font-family: "Calibri", Arial, sans-serif; font-size: 15pt; font-weight: bold; color: #1F3864;
         margin: 18pt 0 8pt 0; border-bottom: 1px solid #1F3864; padding-bottom: 3pt; }
    h2 { font-size: 12pt; font-weight: bold; color: #2E5F8A; margin: 12pt 0 5pt 0; }
    ul, ol { margin: 0 0 8pt 18pt; padding: 0; }
    li { margin: 0 0 3pt 0; }
    table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt 0; font-size: 10pt; }
    table.kv td { border: none; border-bottom: 0.5pt solid #D0D7E2; padding: 3pt 4pt; vertical-align: top; }
    table.kv td.kv-l { width: 45%; color: #444; }
    table.kv td.kv-v { font-weight: bold; }
    table.data th { border-bottom: 1pt solid #1F3864; padding: 4pt; text-align: left;
                    font-size: 9.5pt; font-weight: bold; color: #1F3864; }
    table.data td { border-bottom: 0.5pt solid #D0D7E2; padding: 4pt; vertical-align: top; }
    .cover { text-align: center; margin-bottom: 24pt; }
    .cover .eyebrow { font-size: 9pt; letter-spacing: 2pt; text-transform: uppercase; color: #2E5F8A; }
    .cover-title { font-size: 24pt; font-weight: bold; color: #1F3864; border: none; margin: 8pt 0; }
    .cover-sub { font-size: 11pt; color: #444; text-align: center; }
    .cover-date { font-size: 9.5pt; color: #666; text-align: center; margin-top: 12pt; }
  </style></head><body>${cover}${body.join("\n")}</body></html>`;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function exportarProposicaoDocx(elementId = "proposicao-printable", filename?: string) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error("Relatório não encontrado na tela.");

  const html = buildDocumentHtml(el);

  const { asBlob } = await import("html-docx-js-typescript");
  const result = await asBlob(html, {
    orientation: "portrait",
    margins: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
  });
  const blob = result instanceof Blob ? result : new Blob([result as unknown as BlobPart]);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `proposicao-smart-ito-${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
