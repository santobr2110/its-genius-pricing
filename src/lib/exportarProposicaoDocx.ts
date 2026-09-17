/**
 * Exporta o Relatório de Proposição para Word (.docx).
 *
 * Estratégia: clonar o bloco visível (#proposicao-printable), converter os
 * estilos computados relevantes em estilos inline (o Word não entende as
 * classes utilitárias), simplificar o que o Word não renderiza (SVG, flex,
 * grid) e gerar o arquivo com html-docx-js.
 */

const INLINE_PROPS = [
  "font-size",
  "font-weight",
  "font-style",
  "font-family",
  "color",
  "background-color",
  "text-align",
  "text-transform",
  "letter-spacing",
  "line-height",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "margin-top",
  "margin-bottom",
  "border-top-width",
  "border-bottom-width",
  "border-left-width",
  "border-right-width",
  "border-style",
  "border-color",
  "vertical-align",
] as const;

function isHidden(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0;
}

function inlineStyles(source: Element, clone: Element) {
  if (!(source instanceof HTMLElement) || !(clone instanceof HTMLElement)) return;
  const computed = window.getComputedStyle(source);
  const parts: string[] = [];
  for (const prop of INLINE_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    if (prop === "background-color" && (value === "rgba(0, 0, 0, 0)" || value === "transparent")) continue;
    parts.push(`${prop}:${value}`);
  }
  // Word não trabalha bem com flex/grid: transformamos tudo em blocos simples.
  const display = computed.display;
  if (display.includes("flex") || display.includes("grid")) parts.push("display:block");
  if (display === "inline-flex" || display === "inline-grid") parts.push("display:inline");
  clone.setAttribute("style", parts.join(";"));
  clone.removeAttribute("class");
}

function walk(source: Element, clone: Element) {
  inlineStyles(source, clone);
  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  cloneChildren.forEach((child, i) => {
    const src = sourceChildren[i];
    if (!src) {
      child.remove();
      return;
    }
    if (child.tagName.toLowerCase() === "svg" || isHidden(src)) {
      child.remove();
      return;
    }
    walk(src, child);
  });
}

export async function exportarProposicaoDocx(elementId = "proposicao-printable", filename?: string) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error("Relatório não encontrado na tela.");

  const clone = el.cloneNode(true) as HTMLElement;
  walk(el, clone);
  clone.setAttribute(
    "style",
    "font-family:Arial, Helvetica, sans-serif;font-size:10pt;color:#000000;background:#ffffff;",
  );

  // Tabelas precisam de bordas explícitas para o Word.
  clone.querySelectorAll("table").forEach((table) => {
    table.setAttribute("border", "1");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("cellpadding", "4");
    table.setAttribute("width", "100%");
    table.style.borderCollapse = "collapse";
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #999; padding: 4px; vertical-align: top; }
    h1, h2, h3 { font-family: Arial, Helvetica, sans-serif; }
  </style></head><body>${clone.innerHTML}</body></html>`;

  const { asBlob } = await import("html-docx-js-typescript");
  const result = await asBlob(html, {
    orientation: "portrait",
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
  });
  const blob = result instanceof Blob ? result : new Blob([result as unknown as BlobPart]);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `proposicao-smart-ito-${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
