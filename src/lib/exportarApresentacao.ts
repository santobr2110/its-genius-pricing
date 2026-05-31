import pptxgen from "pptxgenjs";
import { formatBRL } from "@/hooks/useITSMCalculator";
import type { CamadaKey } from "@/data/escopoProposicao";

export interface CamadaSlideData {
  key: CamadaKey;
  titulo: string;
  tagline: string;
  descricao: string;
  incluidos: string[];
  restricoes: string[];
  valor: number;
  composicao: { label: string; value: number }[];
  metricas?: { label: string; value: string }[];
  recursos?: RecursoSlideItem[];
  horasN3?: HorasN3Slide;
  rotinasGrupos?: RotinaGrupoSlide[];
  field?: FieldSlideData;
}

export interface ItemAdicionalSlide {
  descricao: string;
  unidade: string;
  valor: number;
  observacao?: string;
}

export interface RecursoSlideItem {
  label: string;
  qtd: number;
  detalhe?: string;
  valor: number;
}

export interface HorasN3Bloco {
  titulo: string;
  horas: number;
  valor: number;
  descricao?: string;
}

export interface HorasN3Slide {
  total: number;
  valorHora: number;
  modo: "operation" | "performance" | "monitor" | "flow";
  blocos: HorasN3Bloco[];
}

export interface RotinaSlideItem {
  rotina: string;
  grupo: string;
  frequencia: string;
  demanda: number;
  custo: number;
}

export interface RotinaGrupoSlide {
  titulo: string;
  items: RotinaSlideItem[];
}

export interface FieldProfissionalSlide {
  nivel: string;
  qtd: number;
  valor: number;
}

export interface FieldSlideData {
  profissionais: FieldProfissionalSlide[];
  equipamentos: number;
  chamadosEscalados: number;
  overflowVolume?: number;
}

export interface ApresentacaoPayload {
  ofertaNome: string;
  ofertaTagline: string;
  componentes: string[];
  camadas: CamadaSlideData[];
  itensAdicionais: ItemAdicionalSlide[];
  restricoesGerais: string[];
  investimentoTotal: number;
  /** Nome da precificação salva (Smart ITO). Exibido no slide de fechamento. */
  presetName?: string;
  /** Timestamp (ms) da exportação. Exibido no slide de fechamento. */
  exportedAt?: number;
}

/* Paleta hightech verde */
const C = {
  bg: "0A1410",
  bgSoft: "102019",
  card: "13241B",
  cardLine: "1F3A2A",
  primary: "16A34A",
  primarySoft: "22C55E",
  accent: "84CC16",
  text: "E8F5E9",
  textMuted: "8AA89A",
  textDim: "5E7A6B",
  positive: "4ADE80",
  warn: "FCD34D",
};

const FONT_TITLE = "Calibri";
const FONT_BODY = "Calibri";

function addBackground(slide: pptxgen.Slide) {
  slide.background = { color: C.bg };
  // Faixa decorativa lateral esquerda (acento hightech)
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.18,
    h: 5.63,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });
  // Brilho sutil no canto sup. direito
  slide.addShape("ellipse", {
    x: 8.6,
    y: -1.3,
    w: 3.6,
    h: 3.6,
    fill: { color: C.primary, transparency: 88 },
    line: { color: C.primary, width: 0 },
  });
  slide.addShape("ellipse", {
    x: -1.4,
    y: 4.2,
    w: 3.2,
    h: 3.2,
    fill: { color: C.accent, transparency: 92 },
    line: { color: C.accent, width: 0 },
  });
}

function addHeader(slide: pptxgen.Slide, kicker: string, title: string) {
  slide.addText(kicker.toUpperCase(), {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 10,
    bold: true,
    color: C.accent,
    charSpacing: 6,
  });
  slide.addText(title, {
    x: 0.5,
    y: 0.65,
    w: 9,
    h: 0.7,
    fontFace: FONT_TITLE,
    fontSize: 30,
    bold: true,
    color: C.text,
  });
  // Linha sob o título
  slide.addShape("rect", {
    x: 0.5,
    y: 1.42,
    w: 0.9,
    h: 0.04,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });
}

function addFooter(slide: pptxgen.Slide, page: number, total: number, oferta: string) {
  slide.addText(oferta, {
    x: 0.5,
    y: 5.25,
    w: 6,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 9,
    color: C.textDim,
  });
  slide.addText(`${page} / ${total}`, {
    x: 8.7,
    y: 5.25,
    w: 0.8,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 9,
    color: C.textDim,
    align: "right",
  });
}

function slideCapa(pptx: pptxgen, data: ApresentacaoPayload) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  // Banda de gradiente simulada com 3 retângulos sobrepostos
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 10,
    h: 5.63,
    fill: { color: C.bgSoft },
    line: { color: C.bgSoft, width: 0 },
  });
  slide.addShape("ellipse", {
    x: -2,
    y: -2,
    w: 7,
    h: 7,
    fill: { color: C.primary, transparency: 82 },
    line: { color: C.primary, width: 0 },
  });
  slide.addShape("ellipse", {
    x: 6,
    y: 3,
    w: 6,
    h: 6,
    fill: { color: C.accent, transparency: 88 },
    line: { color: C.accent, width: 0 },
  });
  // Barra superior
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 10,
    h: 0.08,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });

  slide.addText("PROPOSTA COMERCIAL", {
    x: 0.7,
    y: 1.2,
    w: 8,
    h: 0.4,
    fontFace: FONT_BODY,
    fontSize: 12,
    bold: true,
    color: C.accent,
    charSpacing: 8,
  });
  slide.addText(data.ofertaNome, {
    x: 0.7,
    y: 1.7,
    w: 8.6,
    h: 1.2,
    fontFace: FONT_TITLE,
    fontSize: 44,
    bold: true,
    color: C.text,
  });
  slide.addText(data.ofertaTagline, {
    x: 0.7,
    y: 2.95,
    w: 8.6,
    h: 0.6,
    fontFace: FONT_BODY,
    fontSize: 18,
    color: C.primarySoft,
    italic: true,
  });
  if (data.componentes.length) {
    slide.addText("COMPOSTA POR", {
      x: 0.7,
      y: 3.85,
      w: 8,
      h: 0.3,
      fontFace: FONT_BODY,
      fontSize: 9,
      bold: true,
      color: C.textDim,
      charSpacing: 4,
    });
    // Pílulas em linha
    let x = 0.7;
    const y = 4.15;
    const h = 0.42;
    data.componentes.forEach((c) => {
      const w = Math.max(1.0, 0.28 + c.length * 0.12);
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h,
        rectRadius: 0.21,
        fill: { color: C.card },
        line: { color: C.primary, width: 1 },
      });
      slide.addText(c, {
        x,
        y,
        w,
        h,
        fontFace: FONT_BODY,
        fontSize: 11,
        bold: true,
        color: C.primarySoft,
        align: "center",
        valign: "middle",
      });
      x += w + 0.15;
    });
  }

  slide.addText(`Investimento mensal · ${formatBRL(data.investimentoTotal)}`, {
    x: 0.7,
    y: 4.95,
    w: 8.6,
    h: 0.4,
    fontFace: FONT_BODY,
    fontSize: 13,
    color: C.text,
    bold: true,
  });
  slide.addText(
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    {
      x: 0.7,
      y: 5.3,
      w: 8.6,
      h: 0.3,
      fontFace: FONT_BODY,
      fontSize: 10,
      color: C.textDim,
    },
  );
}

function slideVisaoGeral(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Visão geral", "Camadas que compõem a oferta");

  const camadas = data.camadas;
  if (camadas.length === 0) return;

  // Grid 2 colunas
  const cols = camadas.length > 3 ? 2 : 1;
  const rows = Math.ceil(camadas.length / cols);
  const cardW = cols === 2 ? 4.3 : 9;
  const cardH = Math.min(1.0, 3.4 / rows);
  const gap = 0.18;
  const startY = 1.7;

  camadas.forEach((cam, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    slide.addShape("roundRect", {
      x,
      y,
      w: cardW,
      h: cardH,
      rectRadius: 0.08,
      fill: { color: C.card },
      line: { color: C.cardLine, width: 1 },
    });
    // Acento lateral
    slide.addShape("rect", {
      x,
      y,
      w: 0.07,
      h: cardH,
      fill: { color: C.primary },
      line: { color: C.primary, width: 0 },
    });
    slide.addText(cam.titulo, {
      x: x + 0.2,
      y: y + 0.08,
      w: cardW - 0.4,
      h: 0.32,
      fontFace: FONT_TITLE,
      fontSize: 14,
      bold: true,
      color: C.text,
    });
    slide.addText(cam.tagline, {
      x: x + 0.2,
      y: y + 0.4,
      w: cardW - 2.0,
      h: 0.3,
      fontFace: FONT_BODY,
      fontSize: 10,
      color: C.textMuted,
      italic: true,
    });
    slide.addText(formatBRL(cam.valor) + " /mês", {
      x: x + cardW - 2.0,
      y: y + cardH - 0.4,
      w: 1.85,
      h: 0.32,
      fontFace: FONT_BODY,
      fontSize: 12,
      bold: true,
      color: C.primarySoft,
      align: "right",
    });
  });

  addFooter(slide, page, total, data.ofertaNome);
}

function slideCamada(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  cam: CamadaSlideData,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Camada da proposta", cam.titulo);

  // Tagline
  slide.addText(cam.tagline, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 11,
    italic: true,
    color: C.primarySoft,
  });

  // Descrição
  slide.addText(cam.descricao, {
    x: 0.5,
    y: 1.85,
    w: 9,
    h: 0.7,
    fontFace: FONT_BODY,
    fontSize: 10,
    color: C.textMuted,
  });

  // Coluna esquerda — Incluídos
  slide.addText("INCLUÍDOS", {
    x: 0.5,
    y: 2.7,
    w: 4.4,
    h: 0.25,
    fontFace: FONT_BODY,
    fontSize: 9,
    bold: true,
    color: C.accent,
    charSpacing: 5,
  });
  slide.addText(
    cam.incluidos.map((t) => ({
      text: t,
      options: { bullet: { code: "25B8" }, color: C.text, fontSize: 10 },
    })),
    {
      x: 0.5,
      y: 2.95,
      w: 4.4,
      h: 2.0,
      fontFace: FONT_BODY,
      fontSize: 10,
      color: C.text,
      paraSpaceAfter: 4,
      valign: "top",
    },
  );

  // Coluna direita — Restrições
  slide.addText("RESTRIÇÕES DE ATUAÇÃO", {
    x: 5.1,
    y: 2.7,
    w: 4.4,
    h: 0.25,
    fontFace: FONT_BODY,
    fontSize: 9,
    bold: true,
    color: C.warn,
    charSpacing: 5,
  });
  slide.addText(
    cam.restricoes.map((t) => ({
      text: t,
      options: { bullet: { code: "2022" }, color: C.textMuted, fontSize: 10 },
    })),
    {
      x: 5.1,
      y: 2.95,
      w: 4.4,
      h: 2.0,
      fontFace: FONT_BODY,
      fontSize: 10,
      color: C.textMuted,
      paraSpaceAfter: 4,
      valign: "top",
    },
  );

  // Valor da camada (faixa inferior)
  slide.addShape("roundRect", {
    x: 0.5,
    y: 4.85,
    w: 9,
    h: 0.35,
    rectRadius: 0.05,
    fill: { color: C.bgSoft },
    line: { color: C.primary, width: 1 },
  });
  slide.addText("VALOR DESTA CAMADA", {
    x: 0.7,
    y: 4.85,
    w: 5,
    h: 0.35,
    fontFace: FONT_BODY,
    fontSize: 9,
    bold: true,
    color: C.textMuted,
    valign: "middle",
    charSpacing: 4,
  });
  slide.addText(formatBRL(cam.valor) + " /mês", {
    x: 5.0,
    y: 4.85,
    w: 4.3,
    h: 0.35,
    fontFace: FONT_BODY,
    fontSize: 14,
    bold: true,
    color: C.primarySoft,
    align: "right",
    valign: "middle",
  });

  addFooter(slide, page, total, data.ofertaNome);
}

function slideComposicao(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Composição financeira", "Detalhamento dos valores");

  // Monta tabela
  const headerStyle = {
    fill: { color: C.bgSoft },
    color: C.accent,
    bold: true,
    fontSize: 10,
    fontFace: FONT_BODY,
  } as const;
  const rowStyle = {
    color: C.text,
    fontSize: 10,
    fontFace: FONT_BODY,
  } as const;

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Camada", options: headerStyle },
      { text: "Item", options: headerStyle },
      { text: "Valor mensal", options: { ...headerStyle, align: "right" } },
    ],
  ];

  data.camadas.forEach((cam) => {
    cam.composicao.forEach((p, idx) => {
      rows.push([
        {
          text: idx === 0 ? cam.titulo : "",
          options: { ...rowStyle, bold: true, color: C.primarySoft },
        },
        { text: p.label, options: rowStyle },
        {
          text: formatBRL(p.value),
          options: { ...rowStyle, align: "right" },
        },
      ]);
    });
    rows.push([
      { text: "", options: rowStyle },
      {
        text: "Subtotal",
        options: { ...rowStyle, italic: true, color: C.textMuted, align: "right" },
      },
      {
        text: formatBRL(cam.valor),
        options: { ...rowStyle, bold: true, align: "right", color: C.primarySoft },
      },
    ]);
  });
  rows.push([
    { text: "INVESTIMENTO TOTAL", options: { ...headerStyle, color: C.text } },
    { text: "", options: headerStyle },
    {
      text: formatBRL(data.investimentoTotal) + " /mês",
      options: { ...headerStyle, color: C.primarySoft, align: "right", fontSize: 12 },
    },
  ]);

  slide.addTable(rows, {
    x: 0.5,
    y: 1.7,
    w: 9,
    colW: [2.4, 4.6, 2.0],
    border: { type: "solid", pt: 0.5, color: C.cardLine },
    rowH: 0.28,
    fontSize: 10,
    fontFace: FONT_BODY,
  });

  addFooter(slide, page, total, data.ofertaNome);
}

/* ===========================================================
 * Slides adicionais — Detalhamento operacional, Rotinas, Field
 * (Modelo 1 · paleta verde hightech)
 * =========================================================== */

function camadaTemDetalhe(cam: CamadaSlideData): boolean {
  return !!(
    (cam.metricas && cam.metricas.length) ||
    (cam.recursos && cam.recursos.length) ||
    (cam.horasN3 && cam.horasN3.blocos.length) ||
    cam.field
  );
}

function slideCamadaDetalhe(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  cam: CamadaSlideData,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, cam.titulo, "Recursos dimensionados e operação");

  let y = 1.6;

  // Métricas (linha de chips)
  if (cam.metricas && cam.metricas.length) {
    let x = 0.5;
    cam.metricas.forEach((m) => {
      const w = 2.9;
      slide.addShape("roundRect", {
        x, y, w, h: 0.7, rectRadius: 0.08,
        fill: { color: C.card }, line: { color: C.cardLine, width: 1 },
      });
      slide.addText(m.label.toUpperCase(), {
        x: x + 0.15, y: y + 0.06, w: w - 0.3, h: 0.25,
        fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.accent, charSpacing: 3,
      });
      slide.addText(m.value, {
        x: x + 0.15, y: y + 0.3, w: w - 0.3, h: 0.4,
        fontFace: FONT_TITLE, fontSize: 14, bold: true, color: C.text,
      });
      x += w + 0.1;
    });
    y += 0.85;
  }

  // Recursos
  if (cam.recursos && cam.recursos.length) {
    slide.addText("RECURSOS DIMENSIONADOS", {
      x: 0.5, y, w: 9, h: 0.25, fontFace: FONT_BODY, fontSize: 9, bold: true,
      color: C.accent, charSpacing: 4,
    });
    y += 0.28;
    cam.recursos.slice(0, 4).forEach((r, i) => {
      const cardW = 4.4;
      const x = 0.5 + (i % 2) * (cardW + 0.2);
      const yy = y + Math.floor(i / 2) * 0.55;
      slide.addShape("roundRect", {
        x, y: yy, w: cardW, h: 0.5, rectRadius: 0.06,
        fill: { color: C.card }, line: { color: C.cardLine, width: 1 },
      });
      slide.addText(`${r.label} · ${r.qtd}${r.detalhe ? `  (${r.detalhe})` : ""}`, {
        x: x + 0.15, y: yy + 0.05, w: cardW - 1.7, h: 0.4,
        fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.text, valign: "middle",
      });
      slide.addText(formatBRL(r.valor) + "/mês", {
        x: x + cardW - 1.65, y: yy + 0.05, w: 1.5, h: 0.4,
        fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.primarySoft,
        align: "right", valign: "middle",
      });
    });
    y += Math.ceil(cam.recursos.length / 2) * 0.55 + 0.1;
  }

  // Horas N3 / Automação
  if (cam.horasN3 && cam.horasN3.blocos.length) {
    const h = cam.horasN3;
    slide.addText(
      `HORAS N3 · ${formatNumber(h.total)}h/mês × ${formatBRL(h.valorHora)}/h = ${formatBRL(h.total * h.valorHora)}`,
      {
        x: 0.5, y, w: 9, h: 0.28, fontFace: FONT_BODY, fontSize: 9, bold: true,
        color: C.accent, charSpacing: 3,
      },
    );
    y += 0.3;
    const blocos = h.blocos;
    const cols = blocos.length;
    const totalW = 9;
    const gap = 0.12;
    const cardW = (totalW - gap * (cols - 1)) / cols;
    blocos.forEach((b, i) => {
      const x = 0.5 + i * (cardW + gap);
      slide.addShape("roundRect", {
        x, y, w: cardW, h: 1.45, rectRadius: 0.08,
        fill: { color: C.card }, line: { color: C.primary, width: 1 },
      });
      slide.addText(b.titulo.toUpperCase(), {
        x: x + 0.15, y: y + 0.1, w: cardW - 0.3, h: 0.3,
        fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.primarySoft, charSpacing: 3,
      });
      slide.addText(`${formatNumber(b.horas, 1)}h`, {
        x: x + 0.15, y: y + 0.4, w: cardW - 0.3, h: 0.45,
        fontFace: FONT_TITLE, fontSize: 22, bold: true, color: C.text,
      });
      slide.addText(formatBRL(b.valor) + "/mês", {
        x: x + 0.15, y: y + 0.85, w: cardW - 0.3, h: 0.25,
        fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.accent,
      });
      if (b.descricao) {
        slide.addText(b.descricao, {
          x: x + 0.15, y: y + 1.1, w: cardW - 0.3, h: 0.32,
          fontFace: FONT_BODY, fontSize: 8, color: C.textMuted, italic: true,
        });
      }
    });
    y += 1.55;
  }

  // Field service
  if (cam.field) {
    const fld = cam.field;
    slide.addText("EQUIPE FIELD SERVICE DE MICROINFORMÁTICA", {
      x: 0.5, y, w: 9, h: 0.28, fontFace: FONT_BODY, fontSize: 9, bold: true,
      color: C.warn, charSpacing: 3,
    });
    y += 0.3;
    const profs = fld.profissionais;
    const cardW = 9 / Math.max(1, profs.length) - 0.1;
    profs.forEach((p, i) => {
      const x = 0.5 + i * (cardW + 0.1);
      slide.addShape("roundRect", {
        x, y, w: cardW, h: 0.7, rectRadius: 0.08,
        fill: { color: C.card }, line: { color: C.warn, width: 1 },
      });
      slide.addText(p.nivel, {
        x: x + 0.15, y: y + 0.05, w: cardW - 0.3, h: 0.3,
        fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.warn, charSpacing: 3,
      });
      slide.addText(`${p.qtd} prof.`, {
        x: x + 0.15, y: y + 0.32, w: cardW - 0.3, h: 0.25,
        fontFace: FONT_TITLE, fontSize: 14, bold: true, color: C.text,
      });
      slide.addText(formatBRL(p.valor) + "/mês", {
        x: x + 0.15, y: y + 0.5, w: cardW - 0.3, h: 0.2,
        fontFace: FONT_BODY, fontSize: 9, color: C.primarySoft,
      });
    });
    y += 0.8;
    const info: string[] = [];
    info.push(`Equipamentos cobertos: ${formatNumber(fld.equipamentos)}`);
    info.push(`Chamados escalados ao Field: ${formatNumber(fld.chamadosEscalados, 1)}/mês`);
    if (fld.overflowVolume && fld.overflowVolume > 0)
      info.push(`Transbordo remoto: ${formatNumber(fld.overflowVolume, 1)} ch/mês via N1 remoto + N2F`);
    slide.addText(info.join("   ·   "), {
      x: 0.5, y, w: 9, h: 0.3, fontFace: FONT_BODY, fontSize: 9,
      color: C.textMuted, italic: true,
    });
  }

  addFooter(slide, page, total, data.ofertaNome);
}

function slideRotinasGrupo(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  cam: CamadaSlideData,
  grupo: RotinaGrupoSlide,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, cam.titulo, grupo.titulo);

  const headerStyle = {
    fill: { color: C.bgSoft }, color: C.accent, bold: true,
    fontSize: 10, fontFace: FONT_BODY,
  } as const;
  const rowStyle = { color: C.text, fontSize: 9, fontFace: FONT_BODY } as const;

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Grupo", options: headerStyle },
      { text: "Rotina", options: headerStyle },
      { text: "Frequência", options: headerStyle },
      { text: "Demanda/mês", options: { ...headerStyle, align: "right" } },
      { text: "Custo mensal", options: { ...headerStyle, align: "right" } },
    ],
  ];
  let somaCusto = 0;
  let somaDemanda = 0;
  grupo.items.forEach((r) => {
    somaCusto += r.custo;
    somaDemanda += r.demanda;
    rows.push([
      { text: r.grupo, options: { ...rowStyle, color: C.textMuted } },
      { text: r.rotina, options: { ...rowStyle, bold: true } },
      { text: r.frequencia, options: { ...rowStyle, color: C.textMuted } },
      { text: r.demanda.toFixed(1), options: { ...rowStyle, align: "right" } },
      { text: formatBRL(r.custo), options: { ...rowStyle, align: "right", color: C.primarySoft, bold: true } },
    ]);
  });
  rows.push([
    { text: "TOTAL", options: { ...headerStyle, color: C.text } },
    { text: "", options: headerStyle },
    { text: "", options: headerStyle },
    { text: somaDemanda.toFixed(1), options: { ...headerStyle, align: "right" } },
    { text: formatBRL(somaCusto), options: { ...headerStyle, color: C.primarySoft, align: "right" } },
  ]);

  slide.addTable(rows, {
    x: 0.5, y: 1.7, w: 9, colW: [1.8, 3.8, 1.3, 1.1, 1.0],
    border: { type: "solid", pt: 0.5, color: C.cardLine },
    rowH: 0.28, fontSize: 9, fontFace: FONT_BODY,
  });

  slide.addText(
    "Rotinas absorvidas pelo pool de horas N3 / Automação contratado (não geram cobrança separada).",
    {
      x: 0.5, y: 5.0, w: 9, h: 0.25, fontFace: FONT_BODY, fontSize: 9,
      color: C.textMuted, italic: true,
    },
  );

  addFooter(slide, page, total, data.ofertaNome);
}

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function slideItensAdicionais(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Itens adicionais", "Valores unitários sob demanda");

  slide.addText(
    "Itens cobrados como adicionais ao escopo contratado. Para ativos monitorados, o valor unitário considera monitoramento + chamados previstos no funil N1/N2/N3, com markup de margem e impostos.",
    {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 0.5,
      fontFace: FONT_BODY,
      fontSize: 9,
      color: C.textMuted,
      italic: true,
    },
  );

  const headerStyle = {
    fill: { color: C.bgSoft },
    color: C.accent,
    bold: true,
    fontSize: 10,
    fontFace: FONT_BODY,
  } as const;
  const rowStyle = {
    color: C.text,
    fontSize: 9,
    fontFace: FONT_BODY,
  } as const;

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Item", options: headerStyle },
      { text: "Unidade", options: headerStyle },
      { text: "Valor unit.", options: { ...headerStyle, align: "right" } },
      { text: "Observação", options: headerStyle },
    ],
  ];
  data.itensAdicionais.forEach((it) => {
    rows.push([
      { text: it.descricao, options: { ...rowStyle, bold: true } },
      { text: it.unidade, options: { ...rowStyle, color: C.textMuted } },
      { text: formatBRL(it.valor), options: { ...rowStyle, align: "right", color: C.primarySoft, bold: true } },
      { text: it.observacao ?? "", options: { ...rowStyle, color: C.textMuted, fontSize: 8 } },
    ]);
  });

  slide.addTable(rows, {
    x: 0.5,
    y: 2.05,
    w: 9,
    colW: [2.6, 1.7, 1.4, 3.3],
    border: { type: "solid", pt: 0.5, color: C.cardLine },
    rowH: 0.3,
    fontSize: 9,
    fontFace: FONT_BODY,
  });

  addFooter(slide, page, total, data.ofertaNome);
}

function slideRestricoes(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  addBackground(slide);
  addHeader(slide, "Termos contratuais", "Restrições gerais de atuação");

  slide.addText(
    data.restricoesGerais.map((t) => ({
      text: t,
      options: { bullet: { code: "2022" }, color: C.text, fontSize: 11 },
    })),
    {
      x: 0.5,
      y: 1.7,
      w: 9,
      h: 3.4,
      fontFace: FONT_BODY,
      fontSize: 11,
      color: C.text,
      paraSpaceAfter: 8,
      valign: "top",
    },
  );

  addFooter(slide, page, total, data.ofertaNome);
}

function slideFechamento(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 10,
    h: 5.63,
    fill: { color: C.bgSoft },
    line: { color: C.bgSoft, width: 0 },
  });
  slide.addShape("ellipse", {
    x: 5,
    y: -2,
    w: 8,
    h: 8,
    fill: { color: C.primary, transparency: 80 },
    line: { color: C.primary, width: 0 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 10,
    h: 0.08,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });

  slide.addText("INVESTIMENTO MENSAL", {
    x: 0.7,
    y: 1.5,
    w: 8.6,
    h: 0.4,
    fontFace: FONT_BODY,
    fontSize: 13,
    bold: true,
    color: C.accent,
    charSpacing: 8,
  });
  slide.addText(formatBRL(data.investimentoTotal), {
    x: 0.7,
    y: 2.0,
    w: 8.6,
    h: 1.5,
    fontFace: FONT_TITLE,
    fontSize: 64,
    bold: true,
    color: C.text,
  });
  slide.addText(`${data.ofertaNome} · pacote mensal`, {
    x: 0.7,
    y: 3.6,
    w: 8.6,
    h: 0.4,
    fontFace: FONT_BODY,
    fontSize: 14,
    color: C.primarySoft,
    italic: true,
  });

  slide.addText("Próximos passos", {
    x: 0.7,
    y: 4.3,
    w: 8.6,
    h: 0.35,
    fontFace: FONT_BODY,
    fontSize: 11,
    bold: true,
    color: C.accent,
    charSpacing: 4,
  });
  slide.addText(
    [
      { text: "Alinhamento técnico e validação do inventário", options: { bullet: { code: "25B8" }, color: C.text, fontSize: 11 } },
      { text: "Aprovação comercial e assinatura do contrato", options: { bullet: { code: "25B8" }, color: C.text, fontSize: 11 } },
      { text: "Kick-off e onboarding da operação", options: { bullet: { code: "25B8" }, color: C.text, fontSize: 11 } },
    ],
    {
      x: 0.7,
      y: 4.6,
      w: 8.6,
      h: 0.9,
      fontFace: FONT_BODY,
      fontSize: 11,
      color: C.text,
      paraSpaceAfter: 2,
    },
  );

  addFooter(slide, page, total, data.ofertaNome);
}

export async function exportarApresentacao(data: ApresentacaoPayload) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  // Mas usaremos 10x5.63 (LAYOUT_16x9) para layout consistente
  pptx.layout = "LAYOUT_16x9"; // 10 x 5.63
  pptx.title = data.ofertaNome;
  pptx.company = "Smart ITO";

  let extraSlides = 0;
  data.camadas.forEach((c) => {
    if (camadaTemDetalhe(c)) extraSlides += 1;
    if (c.rotinasGrupos) extraSlides += c.rotinasGrupos.length;
  });
  const totalSlides =
    1 /* capa */ +
    (data.camadas.length > 0 ? 1 : 0) /* visão geral */ +
    data.camadas.length /* uma por camada */ +
    extraSlides +
    (data.camadas.length > 0 ? 1 : 0) /* composição */ +
    (data.itensAdicionais.length > 0 ? 1 : 0) +
    (data.restricoesGerais.length > 0 ? 1 : 0) +
    1; /* fechamento */

  let page = 1;
  slideCapa(pptx, data);
  page++;

  if (data.camadas.length > 0) {
    slideVisaoGeral(pptx, data, page, totalSlides);
    page++;
    data.camadas.forEach((cam) => {
      slideCamada(pptx, data, cam, page, totalSlides);
      page++;
      if (camadaTemDetalhe(cam)) {
        slideCamadaDetalhe(pptx, data, cam, page, totalSlides);
        page++;
      }
      if (cam.rotinasGrupos) {
        cam.rotinasGrupos.forEach((g) => {
          slideRotinasGrupo(pptx, data, cam, g, page, totalSlides);
          page++;
        });
      }
    });
    slideComposicao(pptx, data, page, totalSlides);
    page++;
  }
  if (data.itensAdicionais.length > 0) {
    slideItensAdicionais(pptx, data, page, totalSlides);
    page++;
  }
  if (data.restricoesGerais.length > 0) {
    slideRestricoes(pptx, data, page, totalSlides);
    page++;
  }
  slideFechamento(pptx, data, page, totalSlides);

  const fileName = `apresentacao-${data.ofertaNome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${new Date().toISOString().slice(0, 10)}.pptx`;
  await pptx.writeFile({ fileName });
}