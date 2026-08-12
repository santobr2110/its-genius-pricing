import pptxgen from "pptxgenjs";
import { formatBRL } from "@/hooks/useITSMCalculator";
import type {
  ApresentacaoPayload,
  CamadaSlideData,
  RotinaGrupoSlide,
} from "./exportarApresentacao";

/**
 * Modelo 2 — Estilo "Selbetti ITO".
 * Inspiração visual: deck oficial Selbetti (preto profundo, glow verde radial,
 * faixa fina de topo, logo "selbetti." canto superior direito, cards com borda
 * verde/laranja, numeração 01/02/03, tipografia bold display).
 */

const C = {
  // Fundo verde escuro (alto contraste com texto claro)
  black: "062818",
  bgSoft: "0B3624",
  green: "10B981",
  greenDeep: "0E7C4F",
  greenSoft: "34D399",
  orange: "F97316",
  orangeDeep: "EA580C",
  white: "FFFFFF",
  text: "F8FAF7",
  textMuted: "C7D8CD",
  textDim: "8AA697",
  cardBorder: "1F6E4A",
  cardFill: "0C2E1F",
  topLine: "34D399",
};

const FONT = "Calibri";

/* ---------- helpers de fundo ---------- */

function baseBackground(slide: pptxgen.Slide, _bgData: string) {
  // Fundo verde escuro sólido + glows discretos (sem imagem) para melhor contraste.
  slide.background = { color: C.black };
  slide.addShape("rect", {
    x: 0, y: 0, w: 13.333, h: 7.5,
    fill: { color: C.black }, line: { color: C.black, width: 0 },
  });
  // Glow verde sup. esquerdo
  slide.addShape("ellipse", {
    x: -2.5, y: -2.5, w: 7, h: 7,
    fill: { color: C.greenDeep, transparency: 80 },
    line: { color: C.greenDeep, width: 0 },
  });
  // Glow verde inf. direito
  slide.addShape("ellipse", {
    x: 9, y: 4, w: 6.5, h: 6.5,
    fill: { color: C.green, transparency: 88 },
    line: { color: C.green, width: 0 },
  });
  // Linha fina de topo
  slide.addShape("rect", {
    x: 0, y: 0.04, w: 13.333, h: 0.025,
    fill: { color: C.topLine }, line: { color: C.topLine, width: 0 },
  });
}

function addLogo(slide: pptxgen.Slide) {
  // Reprodução textual da assinatura "selbetti." + "it solutions"
  slide.addText("selbetti.", {
    x: 11.4,
    y: 0.25,
    w: 1.7,
    h: 0.35,
    fontFace: FONT,
    fontSize: 18,
    bold: true,
    color: C.white,
    align: "right",
    italic: true,
  });
  slide.addText("it solutions", {
    x: 11.4,
    y: 0.58,
    w: 1.7,
    h: 0.22,
    fontFace: FONT,
    fontSize: 9,
    color: C.white,
    align: "right",
  });
}

function addKickerTag(slide: pptxgen.Slide, text: string) {
  // Pílula com borda fina contendo o nome da seção (canto sup. esquerdo)
  const w = Math.max(2.4, 0.6 + text.length * 0.13);
  slide.addShape("roundRect", {
    x: 0.55,
    y: 0.32,
    w,
    h: 0.5,
    rectRadius: 0.25,
    fill: { type: "solid", color: C.black, transparency: 30 },
    line: { color: C.greenDeep, width: 1 },
  });
  slide.addText(text, {
    x: 0.55,
    y: 0.32,
    w,
    h: 0.5,
    fontFace: FONT,
    fontSize: 14,
    color: C.white,
    align: "center",
    valign: "middle",
  });
}

function addPageFooter(
  slide: pptxgen.Slide,
  page: number,
  total: number,
  oferta: string,
) {
  slide.addText(oferta, {
    x: 0.55,
    y: 7.08,
    w: 8,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9,
    color: C.textDim,
  });
  slide.addText(`${page} / ${total}`, {
    x: 12.2,
    y: 7.08,
    w: 0.9,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9,
    color: C.textDim,
    align: "right",
  });
}

/* ---------- slides ---------- */

function slideCapa(pptx: pptxgen, data: ApresentacaoPayload, bgData: string) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);

  // Kicker
  slide.addText("— APRESENTAÇÃO · ITO", {
    x: 0.7,
    y: 0.95,
    w: 7,
    h: 0.35,
    fontFace: FONT,
    fontSize: 12,
    bold: true,
    color: C.orange,
    charSpacing: 4,
  });

  // Display headline
  slide.addText(data.ofertaNome.replace(/^ITO\s+/i, ""), {
    x: 0.7,
    y: 1.55,
    w: 11.5,
    h: 2.8,
    fontFace: FONT,
    fontSize: 92,
    bold: true,
    color: C.green,
    italic: false,
  });

  // Sub
  slide.addText(`Selbetti.`, {
    x: 0.7,
    y: 3.3,
    w: 11.5,
    h: 1.6,
    fontFace: FONT,
    fontSize: 76,
    bold: true,
    color: C.white,
  });

  slide.addText(data.ofertaTagline, {
    x: 0.7,
    y: 5.05,
    w: 11,
    h: 0.5,
    fontFace: FONT,
    fontSize: 18,
    color: C.text,
  });

  // Pílulas dos componentes (canto direito, estilo cards do template)
  if (data.componentes.length > 0) {
    let cy = 1.4;
    data.componentes.forEach((c, i) => {
      const color = i % 2 === 0 ? C.greenDeep : C.orangeDeep;
      slide.addShape("roundRect", {
        x: 9.2,
        y: cy,
        w: 3.5,
        h: 0.85,
        rectRadius: 0.12,
        fill: { color: C.cardFill },
        line: { color, width: 1.25 },
        rotate: i % 2 === 0 ? -4 : 3,
      });
      slide.addShape("roundRect", {
        x: 9.32,
        y: cy + 0.13,
        w: 0.7,
        h: 0.42,
        rectRadius: 0.06,
        fill: { color },
        line: { color, width: 0 },
        rotate: i % 2 === 0 ? -4 : 3,
      });
      slide.addText("ITO", {
        x: 9.32,
        y: cy + 0.13,
        w: 0.7,
        h: 0.42,
        fontFace: FONT,
        fontSize: 11,
        bold: true,
        color: C.white,
        align: "center",
        valign: "middle",
        rotate: i % 2 === 0 ? -4 : 3,
      });
      slide.addText(`Smart ${c}`, {
        x: 10.1,
        y: cy + 0.08,
        w: 2.55,
        h: 0.45,
        fontFace: FONT,
        fontSize: 14,
        bold: true,
        color: C.white,
        rotate: i % 2 === 0 ? -4 : 3,
      });
      slide.addText("Service Desk · NOC 24×7", {
        x: 10.1,
        y: cy + 0.45,
        w: 2.55,
        h: 0.3,
        fontFace: FONT,
        fontSize: 9,
        color: C.textMuted,
        rotate: i % 2 === 0 ? -4 : 3,
      });
      cy += 1.05;
    });
  }

  // Etiqueta selbetti.com.br no canto inferior direito
  slide.addShape("roundRect", {
    x: 11.3,
    y: 6.85,
    w: 1.85,
    h: 0.45,
    rectRadius: 0.22,
    fill: { color: C.cardFill },
    line: { color: C.greenDeep, width: 1 },
  });
  slide.addText("selbetti.com.br", {
    x: 11.3,
    y: 6.85,
    w: 1.85,
    h: 0.45,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: C.white,
    align: "center",
    valign: "middle",
  });
}

function slideDivisorSecao(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  bgData: string,
  linha1: string,
  linha2: string,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);

  // Barra vertical verde
  slide.addShape("rect", {
    x: 1.1,
    y: 2.4,
    w: 0.05,
    h: 2.6,
    fill: { color: C.green },
    line: { color: C.green, width: 0 },
  });

  slide.addText(linha1, {
    x: 1.4,
    y: 2.5,
    w: 10,
    h: 1.3,
    fontFace: FONT,
    fontSize: 74,
    bold: true,
    color: C.text,
  });
  slide.addText(linha2, {
    x: 1.4,
    y: 3.75,
    w: 10,
    h: 1.3,
    fontFace: FONT,
    fontSize: 74,
    bold: true,
    color: C.white,
  });
}

function slideVisaoGeral(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);
  addKickerTag(slide, "Visão geral");

  slide.addText("Camadas que compõem a oferta", {
    x: 0.55,
    y: 1.2,
    w: 11,
    h: 0.7,
    fontFace: FONT,
    fontSize: 32,
    bold: true,
    color: C.white,
  });

  const camadas = data.camadas;
  const cols = camadas.length > 3 ? 2 : Math.max(1, camadas.length);
  const rows = Math.ceil(camadas.length / cols);
  const startY = 2.2;
  const gap = 0.25;
  const cardW = (12.0 - gap * (cols - 1)) / cols;
  const cardH = Math.min(2.0, (4.6 - gap * (rows - 1)) / rows);

  camadas.forEach((cam, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.55 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    slide.addShape("roundRect", {
      x,
      y,
      w: cardW,
      h: cardH,
      rectRadius: 0.12,
      fill: { color: C.cardFill },
      line: { color: C.cardBorder, width: 1.25 },
    });
    // Linha fina verde topo
    slide.addShape("rect", {
      x: x + 0.2,
      y: y + 0.18,
      w: 0.55,
      h: 0.025,
      fill: { color: C.green },
      line: { color: C.green, width: 0 },
    });
    slide.addText(String(i + 1).padStart(2, "0"), {
      x: x + 0.2,
      y: y + 0.22,
      w: 1.0,
      h: 0.35,
      fontFace: FONT,
      fontSize: 11,
      bold: true,
      color: C.greenSoft,
      charSpacing: 2,
    });
    slide.addText(cam.titulo, {
      x: x + 0.2,
      y: y + 0.6,
      w: cardW - 0.4,
      h: 0.5,
      fontFace: FONT,
      fontSize: 17,
      bold: true,
      color: C.white,
    });
    slide.addText(cam.tagline, {
      x: x + 0.2,
      y: y + 1.1,
      w: cardW - 2.3,
      h: 0.6,
      fontFace: FONT,
      fontSize: 10.5,
      color: C.textMuted,
    });
    slide.addText(formatBRL(cam.valor) + " /mês", {
      x: x + cardW - 2.4,
      y: y + cardH - 0.55,
      w: 2.2,
      h: 0.4,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: C.greenSoft,
      align: "right",
    });
  });

  addPageFooter(slide, page, total, data.ofertaNome);
}

function slideCamada(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  cam: CamadaSlideData,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);
  addKickerTag(slide, cam.titulo);

  // Headline (tagline em destaque)
  slide.addText(cam.tagline, {
    x: 0.55,
    y: 1.2,
    w: 12,
    h: 0.85,
    fontFace: FONT,
    fontSize: 30,
    bold: true,
    color: C.white,
  });

  // Descrição
  slide.addText(cam.descricao, {
    x: 0.55,
    y: 2.15,
    w: 12,
    h: 0.9,
    fontFace: FONT,
    fontSize: 12,
    color: C.textMuted,
    italic: true,
  });

  // Dois cards lado a lado: Incluídos + Restrições
  const cardY = 3.2;
  const cardH = 3.05;
  // Card 1
  slide.addShape("roundRect", {
    x: 0.55,
    y: cardY,
    w: 6.1,
    h: cardH,
    rectRadius: 0.15,
    fill: { color: C.cardFill },
    line: { color: C.cardBorder, width: 1.25 },
  });
  slide.addShape("rect", {
    x: 0.75,
    y: cardY + 0.2,
    w: 0.55,
    h: 0.025,
    fill: { color: C.green },
    line: { color: C.green, width: 0 },
  });
  slide.addText("01  INCLUÍDOS", {
    x: 0.75,
    y: cardY + 0.25,
    w: 5.6,
    h: 0.4,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: C.greenSoft,
    charSpacing: 3,
  });
  slide.addText(
    cam.incluidos.map((t) => ({
      text: t,
      options: { bullet: { code: "25B8" }, color: C.text, fontSize: 12 },
    })),
    {
      x: 0.85,
      y: cardY + 0.75,
      w: 5.65,
      h: cardH - 0.85,
      fontFace: FONT,
      fontSize: 12,
      color: C.text,
      paraSpaceAfter: 6,
      valign: "top",
    },
  );

  // Card 2
  slide.addShape("roundRect", {
    x: 6.85,
    y: cardY,
    w: 6.1,
    h: cardH,
    rectRadius: 0.15,
    fill: { color: C.cardFill },
    line: { color: C.orangeDeep, width: 1.25 },
  });
  slide.addShape("rect", {
    x: 7.05,
    y: cardY + 0.2,
    w: 0.55,
    h: 0.025,
    fill: { color: C.orange },
    line: { color: C.orange, width: 0 },
  });
  slide.addText("02  RESTRIÇÕES DE ATUAÇÃO", {
    x: 7.05,
    y: cardY + 0.25,
    w: 5.7,
    h: 0.4,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: C.orange,
    charSpacing: 3,
  });
  slide.addText(
    cam.restricoes.map((t) => ({
      text: t,
      options: { bullet: { code: "2022" }, color: C.textMuted, fontSize: 12 },
    })),
    {
      x: 7.15,
      y: cardY + 0.75,
      w: 5.65,
      h: cardH - 0.85,
      fontFace: FONT,
      fontSize: 12,
      color: C.textMuted,
      paraSpaceAfter: 6,
      valign: "top",
    },
  );

  // Faixa inferior valor
  slide.addShape("roundRect", {
    x: 0.55,
    y: 6.45,
    w: 12.4,
    h: 0.5,
    rectRadius: 0.08,
    fill: { color: C.bgSoft },
    line: { color: C.green, width: 1 },
  });
  slide.addText("INVESTIMENTO DESTA CAMADA", {
    x: 0.85,
    y: 6.45,
    w: 7,
    h: 0.5,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: C.textMuted,
    valign: "middle",
    charSpacing: 3,
  });
  slide.addText(formatBRL(cam.valor) + " /mês", {
    x: 7.5,
    y: 6.45,
    w: 5.2,
    h: 0.5,
    fontFace: FONT,
    fontSize: 17,
    bold: true,
    color: C.greenSoft,
    align: "right",
    valign: "middle",
  });

  addPageFooter(slide, page, total, data.ofertaNome);
}

function slideComposicao(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);
  addKickerTag(slide, "Composição financeira");

  slide.addText("Detalhamento dos valores", {
    x: 0.55,
    y: 1.2,
    w: 11,
    h: 0.6,
    fontFace: FONT,
    fontSize: 28,
    bold: true,
    color: C.white,
  });

  const headerStyle = {
    fill: { color: C.bgSoft },
    color: C.greenSoft,
    bold: true,
    fontSize: 11,
    fontFace: FONT,
  } as const;
  const rowStyle = { color: C.text, fontSize: 11, fontFace: FONT } as const;

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
          options: { ...rowStyle, bold: true, color: C.greenSoft },
        },
        { text: p.label, options: rowStyle },
        { text: formatBRL(p.value), options: { ...rowStyle, align: "right" } },
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
        options: { ...rowStyle, bold: true, align: "right", color: C.greenSoft },
      },
    ]);
  });
  rows.push([
    { text: "INVESTIMENTO TOTAL", options: { ...headerStyle, color: C.white } },
    { text: "", options: headerStyle },
    {
      text: formatBRL(data.investimentoTotal) + " /mês",
      options: { ...headerStyle, color: C.orange, align: "right", fontSize: 13 },
    },
  ]);

  slide.addTable(rows, {
    x: 0.55,
    y: 2.05,
    w: 12.3,
    colW: [3.2, 6.3, 2.8],
    border: { type: "solid", pt: 0.5, color: C.cardBorder },
    rowH: 0.32,
    fontSize: 11,
    fontFace: FONT,
  });

  addPageFooter(slide, page, total, data.ofertaNome);
}

function camadaTemDetalhe(cam: CamadaSlideData): boolean {
  return !!(
    (cam.metricas && cam.metricas.length) ||
    (cam.recursos && cam.recursos.length) ||
    (cam.horasN3 && cam.horasN3.blocos.length)
  );
}

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function slideCamadaDetalhe(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  cam: CamadaSlideData,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);
  addKickerTag(slide, cam.titulo);

  slide.addText("Recursos dimensionados e operação", {
    x: 0.55, y: 1.2, w: 12, h: 0.6,
    fontFace: FONT, fontSize: 26, bold: true, color: C.white,
  });

  let y = 1.95;

  // Métricas (chips)
  if (cam.metricas && cam.metricas.length) {
    const totalW = 12.3;
    const gap = 0.15;
    const cols = cam.metricas.length;
    const cardW = (totalW - gap * (cols - 1)) / cols;
    cam.metricas.forEach((m, i) => {
      const x = 0.55 + i * (cardW + gap);
      slide.addShape("roundRect", {
        x, y, w: cardW, h: 0.85, rectRadius: 0.12,
        fill: { color: C.cardFill }, line: { color: C.cardBorder, width: 1.25 },
      });
      slide.addText(m.label.toUpperCase(), {
        x: x + 0.18, y: y + 0.08, w: cardW - 0.36, h: 0.3,
        fontFace: FONT, fontSize: 9, bold: true, color: C.greenSoft, charSpacing: 3,
      });
      slide.addText(m.value, {
        x: x + 0.18, y: y + 0.36, w: cardW - 0.36, h: 0.5,
        fontFace: FONT, fontSize: 18, bold: true, color: C.white,
      });
    });
    y += 1.05;
  }

  // Recursos
  if (cam.recursos && cam.recursos.length) {
    slide.addText("RECURSOS DIMENSIONADOS", {
      x: 0.55, y, w: 12, h: 0.3, fontFace: FONT, fontSize: 10, bold: true,
      color: C.greenSoft, charSpacing: 3,
    });
    y += 0.34;
    cam.recursos.slice(0, 4).forEach((r, i) => {
      const cardW = 6.0;
      const x = 0.55 + (i % 2) * (cardW + 0.3);
      const yy = y + Math.floor(i / 2) * 0.65;
      slide.addShape("roundRect", {
        x, y: yy, w: cardW, h: 0.55, rectRadius: 0.1,
        fill: { color: C.cardFill }, line: { color: C.cardBorder, width: 1 },
      });
      slide.addText(`${r.label} · ${r.qtd}${r.detalhe ? `  (${r.detalhe})` : ""}`, {
        x: x + 0.2, y: yy + 0.06, w: cardW - 2.1, h: 0.45,
        fontFace: FONT, fontSize: 12, bold: true, color: C.text, valign: "middle",
      });
      slide.addText(formatBRL(r.valor) + "/mês", {
        x: x + cardW - 2.05, y: yy + 0.06, w: 1.9, h: 0.45,
        fontFace: FONT, fontSize: 12, bold: true, color: C.greenSoft,
        align: "right", valign: "middle",
      });
    });
    y += Math.ceil(cam.recursos.length / 2) * 0.65 + 0.15;
  }

  // Horas N3 / Automação
  if (cam.horasN3 && cam.horasN3.blocos.length) {
    const h = cam.horasN3;
    slide.addText(
      `HORAS N3 · ${formatNumber(h.total)}h/mês × ${formatBRL(h.valorHora)}/h = ${formatBRL(h.total * h.valorHora)}`,
      {
        x: 0.55, y, w: 12.3, h: 0.32, fontFace: FONT, fontSize: 10, bold: true,
        color: C.greenSoft, charSpacing: 3,
      },
    );
    y += 0.36;
    const blocos = h.blocos;
    const cols = blocos.length;
    const totalW = 12.3;
    const gap = 0.18;
    const cardW = (totalW - gap * (cols - 1)) / cols;
    blocos.forEach((b, i) => {
      const x = 0.55 + i * (cardW + gap);
      slide.addShape("roundRect", {
        x, y, w: cardW, h: 1.7, rectRadius: 0.12,
        fill: { color: C.cardFill }, line: { color: C.green, width: 1.25 },
      });
      slide.addText(b.titulo.toUpperCase(), {
        x: x + 0.18, y: y + 0.12, w: cardW - 0.36, h: 0.32,
        fontFace: FONT, fontSize: 10, bold: true, color: C.greenSoft, charSpacing: 3,
      });
      slide.addText(`${formatNumber(b.horas, 1)}h`, {
        x: x + 0.18, y: y + 0.44, w: cardW - 0.36, h: 0.55,
        fontFace: FONT, fontSize: 28, bold: true, color: C.white,
      });
      slide.addText(formatBRL(b.valor) + "/mês", {
        x: x + 0.18, y: y + 1.0, w: cardW - 0.36, h: 0.3,
        fontFace: FONT, fontSize: 12, bold: true, color: C.orange,
      });
      if (b.descricao) {
        slide.addText(b.descricao, {
          x: x + 0.18, y: y + 1.3, w: cardW - 0.36, h: 0.38,
          fontFace: FONT, fontSize: 9, color: C.textMuted, italic: true,
        });
      }
    });
    y += 1.8;
  }


  addPageFooter(slide, page, total, data.ofertaNome);
}

function slideRotinasGrupoM2(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  cam: CamadaSlideData,
  grupo: RotinaGrupoSlide,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);
  addKickerTag(slide, cam.titulo);

  slide.addText(grupo.titulo, {
    x: 0.55, y: 1.2, w: 12, h: 0.6,
    fontFace: FONT, fontSize: 26, bold: true, color: C.white,
  });

  const headerStyle = {
    fill: { color: C.bgSoft }, color: C.greenSoft, bold: true,
    fontSize: 10, fontFace: FONT,
  } as const;
  const rowStyle = { color: C.text, fontSize: 10, fontFace: FONT } as const;

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
      { text: formatBRL(r.custo), options: { ...rowStyle, align: "right", color: C.greenSoft, bold: true } },
    ]);
  });
  rows.push([
    { text: "TOTAL", options: { ...headerStyle, color: C.white } },
    { text: "", options: headerStyle },
    { text: "", options: headerStyle },
    { text: somaDemanda.toFixed(1), options: { ...headerStyle, align: "right" } },
    { text: formatBRL(somaCusto), options: { ...headerStyle, color: C.orange, align: "right" } },
  ]);

  slide.addTable(rows, {
    x: 0.55, y: 1.95, w: 12.3, colW: [2.4, 5.0, 1.7, 1.6, 1.6],
    border: { type: "solid", pt: 0.5, color: C.cardBorder },
    rowH: 0.32, fontSize: 10, fontFace: FONT,
  });

  slide.addText(
    "Rotinas absorvidas pelo pool de horas N3 / Automação contratado (não geram cobrança separada).",
    {
      x: 0.55, y: 6.7, w: 12.3, h: 0.3, fontFace: FONT, fontSize: 10,
      color: C.textMuted, italic: true,
    },
  );

  addPageFooter(slide, page, total, data.ofertaNome);
}

function slideItensAdicionais(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);
  addKickerTag(slide, "Itens adicionais");

  slide.addText("Valores unitários sob demanda", {
    x: 0.55,
    y: 1.2,
    w: 11,
    h: 0.55,
    fontFace: FONT,
    fontSize: 28,
    bold: true,
    color: C.white,
  });

  slide.addText(
    "Itens cobrados como adicionais ao escopo contratado. Para ativos monitorados, o valor unitário considera monitoramento + chamados previstos no funil N1/N2/N3, com markup de margem e impostos.",
    {
      x: 0.55,
      y: 1.78,
      w: 12.3,
      h: 0.5,
      fontFace: FONT,
      fontSize: 10,
      color: C.textMuted,
      italic: true,
    },
  );

  const headerStyle = {
    fill: { color: C.bgSoft },
    color: C.greenSoft,
    bold: true,
    fontSize: 10,
    fontFace: FONT,
  } as const;
  const rowStyle = { color: C.text, fontSize: 10, fontFace: FONT } as const;

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
      {
        text: formatBRL(it.valor),
        options: { ...rowStyle, align: "right", color: C.greenSoft, bold: true },
      },
      {
        text: it.observacao ?? "",
        options: { ...rowStyle, color: C.textMuted, fontSize: 9 },
      },
    ]);
  });

  slide.addTable(rows, {
    x: 0.55,
    y: 2.4,
    w: 12.3,
    colW: [3.4, 2.2, 1.9, 4.8],
    border: { type: "solid", pt: 0.5, color: C.cardBorder },
    rowH: 0.32,
    fontSize: 10,
    fontFace: FONT,
  });

  addPageFooter(slide, page, total, data.ofertaNome);
}

function slideRestricoes(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);
  addKickerTag(slide, "Termos contratuais");

  slide.addText("Restrições gerais de atuação", {
    x: 0.55,
    y: 1.2,
    w: 11,
    h: 0.6,
    fontFace: FONT,
    fontSize: 28,
    bold: true,
    color: C.white,
  });

  // Grid 3 colunas estilo "Por que precisam de ITO?"
  const cols = 3;
  const startY = 2.2;
  const gap = 0.25;
  const colW = (12.4 - gap * (cols - 1)) / cols;
  const rowH = 1.45;

  data.restricoesGerais.slice(0, 9).forEach((r, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.55 + col * (colW + gap);
    const y = startY + row * (rowH + 0.2);
    slide.addShape("rect", {
      x,
      y,
      w: colW,
      h: 0.03,
      fill: { color: C.green },
      line: { color: C.green, width: 0 },
    });
    slide.addText(String(i + 1).padStart(2, "0"), {
      x,
      y: y + 0.12,
      w: 0.6,
      h: 0.35,
      fontFace: FONT,
      fontSize: 11,
      bold: true,
      color: C.greenSoft,
    });
    slide.addText(r, {
      x: x + 0.55,
      y: y + 0.1,
      w: colW - 0.6,
      h: rowH - 0.15,
      fontFace: FONT,
      fontSize: 11,
      color: C.text,
    });
  });

  addPageFooter(slide, page, total, data.ofertaNome);
}

function slideFechamento(
  pptx: pptxgen,
  data: ApresentacaoPayload,
  bgData: string,
  page: number,
  total: number,
) {
  const slide = pptx.addSlide();
  baseBackground(slide, bgData);
  addLogo(slide);

  // Faixa central horizontal estilo slide DEMO
  slide.addShape("rect", {
    x: 0,
    y: 2.4,
    w: 13.333,
    h: 0.03,
    fill: { color: C.topLine },
    line: { color: C.topLine, width: 0 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 4.5,
    w: 13.333,
    h: 0.03,
    fill: { color: C.topLine },
    line: { color: C.topLine, width: 0 },
  });

  slide.addText("INVESTIMENTO", {
    x: 0.7,
    y: 2.55,
    w: 6,
    h: 0.4,
    fontFace: FONT,
    fontSize: 14,
    bold: true,
    color: C.orange,
    charSpacing: 5,
  });
  slide.addText(formatBRL(data.investimentoTotal), {
    x: 0.7,
    y: 2.85,
    w: 8,
    h: 1.5,
    fontFace: FONT,
    fontSize: 64,
    bold: true,
    color: C.white,
  });
  slide.addText("/ mês", {
    x: 9.5,
    y: 3.55,
    w: 3,
    h: 0.7,
    fontFace: FONT,
    fontSize: 26,
    color: C.greenSoft,
    italic: true,
  });

  slide.addText(`${data.ofertaNome} · pacote mensal`, {
    x: 0.7,
    y: 4.7,
    w: 12,
    h: 0.5,
    fontFace: FONT,
    fontSize: 16,
    color: C.text,
    italic: true,
  });

  slide.addText("Próximos passos", {
    x: 0.7,
    y: 5.35,
    w: 8,
    h: 0.4,
    fontFace: FONT,
    fontSize: 12,
    bold: true,
    color: C.greenSoft,
    charSpacing: 3,
  });
  slide.addText(
    [
      {
        text: "Alinhamento técnico e validação do inventário",
        options: { bullet: { code: "25B8" }, color: C.text, fontSize: 13 },
      },
      {
        text: "Aprovação comercial e assinatura do contrato",
        options: { bullet: { code: "25B8" }, color: C.text, fontSize: 13 },
      },
      {
        text: "Kick-off e onboarding da operação",
        options: { bullet: { code: "25B8" }, color: C.text, fontSize: 13 },
      },
    ],
    {
      x: 0.7,
      y: 5.7,
      w: 12,
      h: 1.3,
      fontFace: FONT,
      fontSize: 13,
      color: C.text,
      paraSpaceAfter: 4,
    },
  );

  // selo "obrigado." canto direito
  slide.addText("obrigado.", {
    x: 9.5,
    y: 5.85,
    w: 3.5,
    h: 1.0,
    fontFace: FONT,
    fontSize: 44,
    bold: true,
    color: C.white,
    align: "right",
    italic: true,
  });

  if (data.presetName || data.exportedAt) {
    const when = data.exportedAt
      ? new Date(data.exportedAt).toLocaleString("pt-BR")
      : new Date().toLocaleString("pt-BR");
    const label = data.presetName
      ? `Precificação: ${data.presetName} · Exportado em ${when}`
      : `Exportado em ${when}`;
    slide.addText(label, {
      x: 0.7,
      y: 7.15,
      w: 12,
      h: 0.22,
      fontFace: FONT,
      fontSize: 9,
      color: C.text,
      italic: true,
    });
  }
}

export async function exportarApresentacaoModelo2(data: ApresentacaoPayload) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
  pptx.title = data.ofertaNome;
  pptx.company = "Selbetti";

  const bgData = "";

  let extraSlides = 0;
  data.camadas.forEach((c) => {
    if (camadaTemDetalhe(c)) extraSlides += 1;
    if (c.rotinasGrupos) extraSlides += c.rotinasGrupos.length;
  });
  const totalSlides =
    1 /* capa */ +
    1 /* divisor "Nossas Ofertas" */ +
    (data.camadas.length > 0 ? 1 : 0) /* visão geral */ +
    data.camadas.length /* uma por camada */ +
    extraSlides +
    (data.camadas.length > 0 ? 1 : 0) /* composição */ +
    (data.itensAdicionais.length > 0 ? 1 : 0) +
    (data.restricoesGerais.length > 0 ? 1 : 0) +
    1; /* fechamento */

  let page = 1;
  slideCapa(pptx, data, bgData);
  page++;
  slideDivisorSecao(pptx, data, bgData, "Nossas", "Ofertas");
  page++;
  if (data.camadas.length > 0) {
    slideVisaoGeral(pptx, data, bgData, page, totalSlides);
    page++;
    data.camadas.forEach((cam) => {
      slideCamada(pptx, data, cam, bgData, page, totalSlides);
      page++;
      if (camadaTemDetalhe(cam)) {
        slideCamadaDetalhe(pptx, data, cam, bgData, page, totalSlides);
        page++;
      }
      if (cam.rotinasGrupos) {
        cam.rotinasGrupos.forEach((g) => {
          slideRotinasGrupoM2(pptx, data, cam, g, bgData, page, totalSlides);
          page++;
        });
      }
    });
    slideComposicao(pptx, data, bgData, page, totalSlides);
    page++;
  }
  if (data.itensAdicionais.length > 0) {
    slideItensAdicionais(pptx, data, bgData, page, totalSlides);
    page++;
  }
  if (data.restricoesGerais.length > 0) {
    slideRestricoes(pptx, data, bgData, page, totalSlides);
    page++;
  }
  slideFechamento(pptx, data, bgData, page, totalSlides);

  const fileName = `apresentacao-selbetti-${data.ofertaNome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${new Date().toISOString().slice(0, 10)}.pptx`;
  if (data.watermark) {
    const slides: any[] = (pptx as any).slides ?? [];
    slides.forEach((slide) => {
      slide.addText(data.watermark!, {
        x: 0, y: 2.5, w: 13.333, h: 2.5,
        align: "center", valign: "middle",
        fontFace: FONT, fontSize: 100, bold: true,
        color: "F87171", transparency: 65,
        rotate: -30,
      });
    });
  }
  await pptx.writeFile({ fileName });
}