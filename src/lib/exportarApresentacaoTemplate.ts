import JSZip from "jszip";
import { formatBRL } from "@/hooks/useITSMCalculator";
import type {
  ApresentacaoPayload,
  CamadaSlideData,
  HorasN3Slide,
  ItemAdicionalSlide,
  RotinaGrupoSlide,
  RotinaSlideItem,
} from "@/lib/exportarApresentacao";
import masterAsset from "@/assets/apresentacao-master.pptx.asset.json";

/**
 * Exportação de apresentação a partir do arquivo mestre corporativo.
 *  Slides 1..9 = imutáveis. Slide 10 = template visual (clonado). Slide 11 =
 *  fechamento fixo. Slide 10 original NÃO aparece na apresentação final.
 *  A manipulação é feita direto no OOXML via JSZip.
 */

const TEMPLATE_SLIDE_INDEX = 10; // slide10.xml = template
const CLOSING_SLIDE_INDEX = 11; // slide11.xml = fechamento

/* Área útil do slide 16:9 = 12192000 x 6858000 EMU */
const SLIDE_W = 12192000;
const SLIDE_H = 6858000;
const EMU_IN = 914400;
const inch = (n: number) => Math.round(n * EMU_IN);

/* Paleta clara — texto preto/verde sobre fundo branco (referência: slide 6) */
const COLOR_ACCENT = "01764B"; // verde primário (kickers, títulos de seção)
const COLOR_DARK = "F1F6F3"; // fundo dos cards (verde-claro quase branco)
const COLOR_PRIMARY = "01764B"; // verde primário (bordas, badges)
const COLOR_LINE = "01764B";
const COLOR_TEXT = "0B1E15"; // preto esverdeado (corpo)
const COLOR_MUTED = "51665A"; // cinza esverdeado (secundário)
const COLOR_ON_DARK = "FFFFFF"; // texto sobre gradient/cards escuros
const COLOR_SURFACE = "FFFFFF"; // fundo branco geral do slide clonado
const FONT_HEAD = "Segoe UI Black";
const FONT_BODY = "Segoe UI";

/* Mapeamento de tier por camada (badge + tag no descritivo) */
const TIER_META: Record<
  string,
  { tag: string; number: number; tagColor: string }
> = {
  // Cores das tags calibradas para fundo branco (alto contraste)
  monitor: { tag: "STEEL", number: 1, tagColor: "3E5A54" },
  flow: { tag: "STEEL", number: 2, tagColor: "3E5A54" },
  operation: { tag: "SILVER", number: 3, tagColor: "5A6773" },
  performance: { tag: "GOLD", number: 4, tagColor: "A67A00" },
  enterprise: { tag: "PLATINUM", number: 5, tagColor: "3E5A54" },
  fieldService: { tag: "FIELD", number: 6, tagColor: "0B4A32" },
};

/* ------------------------------------------------------------------ */
/* Tipagem dos blocos                                                   */
/* ------------------------------------------------------------------ */

type Block =
  | { kind: "capa"; data: ApresentacaoPayload }
  | { kind: "camada"; cam: CamadaSlideData; idx: number }
  | { kind: "horas-n3"; cam: CamadaSlideData; n3: HorasN3Slide }
  | { kind: "rotinas"; cam: CamadaSlideData; grupo: RotinaGrupoSlide }
  | { kind: "restricoes-camadas"; camadas: CamadaSlideData[] }
  | {
      kind: "itens-adicionais";
      items: ItemAdicionalSlide[];
      page: number;
      totalPages: number;
    }
  | { kind: "restricoes-gerais"; items: string[] }
  | { kind: "investimento"; data: ApresentacaoPayload };

/* ------------------------------------------------------------------ */
/* Montagem da fila de blocos                                          */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return formatBRL(Number.isFinite(n) ? n : 0);
}

function fmtNum(v: number, digits = 1): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function buildBlocks(data: ApresentacaoPayload): Block[] {
  const blocks: Block[] = [];
  const camadas = data.camadas ?? [];

  blocks.push({ kind: "capa", data });

  camadas.forEach((cam, idx) => {
    blocks.push({ kind: "camada", cam, idx });
    if (cam.horasN3 && cam.horasN3.blocos.length >= 2) {
      blocks.push({ kind: "horas-n3", cam, n3: cam.horasN3 });
    }
    (cam.rotinasGrupos ?? []).forEach((grupo) => {
      if (grupo.items.length > 0) blocks.push({ kind: "rotinas", cam, grupo });
    });
  });

  // Restrições consolidadas (uma coluna por camada)
  const camadasComRestricao = camadas.filter((c) => (c.restricoes ?? []).length > 0);
  if (camadasComRestricao.length) {
    blocks.push({ kind: "restricoes-camadas", camadas: camadasComRestricao });
  }

  // Itens adicionais (paginação: 10 por slide)
  const itens = data.itensAdicionais ?? [];
  if (itens.length) {
    const per = 10;
    const total = Math.ceil(itens.length / per);
    for (let p = 0; p < total; p++) {
      blocks.push({
        kind: "itens-adicionais",
        items: itens.slice(p * per, (p + 1) * per),
        page: p + 1,
        totalPages: total,
      });
    }
  }

  // Restrições gerais
  if ((data.restricoesGerais ?? []).length) {
    blocks.push({ kind: "restricoes-gerais", items: data.restricoesGerais });
  }

  blocks.push({ kind: "investimento", data });

  return blocks;
}

/* ------------------------------------------------------------------ */
/* Helpers de OOXML                                                     */
/* ------------------------------------------------------------------ */

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function runXml(
  text: string,
  opts: { sz?: number; bold?: boolean; italic?: boolean; color?: string; font?: string; spc?: number } = {},
): string {
  const sz = opts.sz ?? 1200;
  const bold = opts.bold ? ' b="1"' : "";
  const italic = opts.italic ? ' i="1"' : "";
  const color = opts.color ?? COLOR_TEXT;
  const font = opts.font ?? FONT_BODY;
  const spc = opts.spc ? ` spc="${opts.spc}"` : "";
  return (
    `<a:r><a:rPr lang="pt-BR" sz="${sz}"${bold}${italic}${spc} dirty="0">` +
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/>` +
    `</a:rPr><a:t>${xmlEscape(text)}</a:t></a:r>`
  );
}

function paraSimple(
  text: string,
  opts: {
    sz?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    font?: string;
    align?: "l" | "ctr" | "r";
    spc?: number;
  } = {},
): string {
  const algn = opts.align ?? "l";
  return (
    `<a:p><a:pPr algn="${algn}"><a:buNone/></a:pPr>` +
    runXml(text, opts) +
    `</a:p>`
  );
}

function paraCheck(text: string, sz = 1200, color = COLOR_TEXT, bulletColor = COLOR_PRIMARY): string {
  // Bullet com check em verde primário (ou variação clara sobre fundo escuro)
  return (
    `<a:p><a:pPr marL="342900" indent="-342900" algn="l">` +
    `<a:buClr><a:srgbClr val="${bulletColor}"/></a:buClr>` +
    `<a:buSzPct val="120000"/>` +
    `<a:buFont typeface="Wingdings"/><a:buChar char="ü"/>` +
    `</a:pPr>` +
    runXml(text, { sz, color }) +
    `</a:p>`
  );
}

function paraBullet(text: string, sz = 1000, color = COLOR_MUTED): string {
  return (
    `<a:p><a:pPr marL="228600" indent="-228600" algn="l">` +
    `<a:buClr><a:srgbClr val="${COLOR_ACCENT}"/></a:buClr>` +
    `<a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr>` +
    runXml(text, { sz, color }) +
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
  paragraphs: string;
  anchor?: "t" | "ctr" | "b";
  autofit?: "norm" | "spAuto" | "none";
  padL?: number;
  padT?: number;
}): string {
  const anchor = opts.anchor ?? "t";
  const autofit =
    opts.autofit === "spAuto"
      ? "<a:spAutoFit/>"
      : opts.autofit === "none"
        ? ""
        : '<a:normAutofit fontScale="100000" lnSpcReduction="0"/>';
  const lIns = opts.padL ?? 45720;
  const tIns = opts.padT ?? 27432;
  return (
    `<p:sp><p:nvSpPr>` +
    `<p:cNvPr id="${opts.id}" name="${opts.name}"/>` +
    `<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${opts.x}" y="${opts.y}"/>` +
    `<a:ext cx="${opts.cx}" cy="${opts.cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="${lIns}" tIns="${tIns}" rIns="${lIns}" bIns="${tIns}" anchor="${anchor}">${autofit}</a:bodyPr>` +
    `<a:lstStyle/>${opts.paragraphs}</p:txBody></p:sp>`
  );
}

function shape(opts: {
  id: number;
  name: string;
  prst?: string;
  adj?: number; // roundRect adj
  x: number;
  y: number;
  cx: number;
  cy: number;
  fill?: string;
  alpha?: number;
  lineColor?: string;
  lineW?: number;
  gradient?: boolean;
  noFill?: boolean;
}): string {
  const prst = opts.prst ?? "roundRect";
  const adjXml = prst === "roundRect" ? `<a:avLst><a:gd name="adj" fmla="val ${opts.adj ?? 6000}"/></a:avLst>` : `<a:avLst/>`;
  let fill: string;
  if (opts.noFill) {
    fill = `<a:noFill/>`;
  } else if (opts.gradient) {
    fill =
      `<a:gradFill flip="none" rotWithShape="1">` +
      `<a:gsLst>` +
      `<a:gs pos="0"><a:srgbClr val="${COLOR_PRIMARY}"/></a:gs>` +
      `<a:gs pos="100000"><a:srgbClr val="${COLOR_DARK}"/></a:gs>` +
      `</a:gsLst>` +
      `<a:lin ang="2700000" scaled="0"/>` +
      `</a:gradFill>`;
  } else if (opts.alpha) {
    fill = `<a:solidFill><a:srgbClr val="${opts.fill ?? COLOR_DARK}"><a:alpha val="${opts.alpha}"/></a:srgbClr></a:solidFill>`;
  } else {
    fill = `<a:solidFill><a:srgbClr val="${opts.fill ?? COLOR_DARK}"/></a:solidFill>`;
  }
  const line = opts.lineColor
    ? `<a:ln w="${opts.lineW ?? 9525}"><a:solidFill><a:srgbClr val="${opts.lineColor}"/></a:solidFill></a:ln>`
    : `<a:ln><a:noFill/></a:ln>`;
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${opts.id}" name="${opts.name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${opts.x}" y="${opts.y}"/><a:ext cx="${opts.cx}" cy="${opts.cy}"/></a:xfrm>` +
    `<a:prstGeom prst="${prst}">${adjXml}</a:prstGeom>` +
    fill + line + `</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="pt-BR"/></a:p></p:txBody></p:sp>`
  );
}

/* ------------------------------------------------------------------ */
/* Helpers de layout composto                                          */
/* ------------------------------------------------------------------ */

function kickerAndTitle(
  ids: () => number,
  kicker: string,
  title: string,
  opts: { titleSz?: number } = {},
): string {
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;
  const shapes: string[] = [];
  shapes.push(
    textShape({
      id: ids(),
      name: "Kicker",
      x: marginX,
      y: inch(0.5),
      cx: cw,
      cy: inch(0.32),
      autofit: "none",
      paragraphs: paraSimple(kicker.toUpperCase(), {
        sz: 1100,
        bold: true,
        color: COLOR_ACCENT,
        font: FONT_HEAD,
        spc: 300,
      }),
    }),
  );
  shapes.push(
    textShape({
      id: ids(),
      name: "Title",
      x: marginX,
      y: inch(0.82),
      cx: cw,
      cy: inch(0.75),
      autofit: "norm",
      paragraphs: paraSimple(title, {
        sz: opts.titleSz ?? 3200,
        bold: true,
        color: COLOR_TEXT,
        font: FONT_HEAD,
      }),
    }),
  );
  // Linha de acento
  shapes.push(
    shape({
      id: ids(),
      name: "Divider",
      prst: "rect",
      x: marginX,
      y: inch(1.68),
      cx: inch(0.9),
      cy: 25400,
      fill: COLOR_ACCENT,
    }),
  );
  return shapes.join("");
}

function metricCard(
  ids: () => number,
  x: number,
  y: number,
  cx: number,
  cy: number,
  label: string,
  value: string,
  subtitle?: string,
): string {
  const parts: string[] = [];
  parts.push(
    shape({
      id: ids(),
      name: "MetricBg",
      x,
      y,
      cx,
      cy,
      fill: COLOR_DARK,
      alpha: 65000,
      lineColor: COLOR_LINE,
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "MetricLbl",
      x: x + inch(0.15),
      y: y + inch(0.08),
      cx: cx - inch(0.3),
      cy: inch(0.28),
      autofit: "none",
      paragraphs: paraSimple(label.toUpperCase(), {
        sz: 800,
        bold: true,
        color: COLOR_MUTED,
        font: FONT_HEAD,
        spc: 200,
      }),
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "MetricVal",
      x: x + inch(0.15),
      y: y + inch(0.32),
      cx: cx - inch(0.3),
      cy: cy - inch(0.4) - (subtitle ? inch(0.22) : 0),
      autofit: "norm",
      paragraphs: paraSimple(value, {
        sz: 2000,
        bold: true,
        color: COLOR_TEXT,
        font: FONT_HEAD,
      }),
    }),
  );
  if (subtitle) {
    parts.push(
      textShape({
        id: ids(),
        name: "MetricSub",
        x: x + inch(0.15),
        y: y + cy - inch(0.26),
        cx: cx - inch(0.3),
        cy: inch(0.22),
        autofit: "none",
        paragraphs: paraSimple(subtitle, {
          sz: 800,
          color: COLOR_ACCENT,
          italic: true,
        }),
      }),
    );
  }
  return parts.join("");
}

function tableRow(
  ids: () => number,
  x: number,
  y: number,
  cx: number,
  cy: number,
  cols: { text: string; w: number; align?: "l" | "ctr" | "r"; bold?: boolean; color?: string; sz?: number }[],
  opts: { fill?: string; alpha?: number; header?: boolean } = {},
): string {
  const parts: string[] = [];
  if (opts.fill || opts.header) {
    parts.push(
      shape({
        id: ids(),
        name: "RowBg",
        prst: "rect",
        x,
        y,
        cx,
        cy,
        fill: opts.fill ?? COLOR_DARK,
        alpha: opts.alpha ?? (opts.header ? 45000 : 25000),
        lineColor: COLOR_LINE,
        lineW: 6350,
      }),
    );
  }
  let cursor = x + inch(0.15);
  for (const c of cols) {
    parts.push(
      textShape({
        id: ids(),
        name: "Cell",
        x: cursor,
        y,
        cx: c.w - inch(0.15),
        cy,
        anchor: "ctr",
        autofit: "norm",
        paragraphs: paraSimple(c.text, {
          sz: c.sz ?? (opts.header ? 900 : 1000),
          bold: c.bold ?? opts.header,
          color: c.color ?? (opts.header ? COLOR_ACCENT : COLOR_TEXT),
          font: opts.header ? FONT_HEAD : FONT_BODY,
          align: c.align ?? "l",
          spc: opts.header ? 200 : undefined,
        }),
      }),
    );
    cursor += c.w;
  }
  return parts.join("");
}

/* ------------------------------------------------------------------ */
/* Renderers por bloco                                                 */
/* ------------------------------------------------------------------ */

function renderCapa(ids: () => number, data: ApresentacaoPayload): string {
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;
  const parts: string[] = [];
  parts.push(
    textShape({
      id: ids(),
      name: "Kicker",
      x: marginX,
      y: inch(0.9),
      cx: cw,
      cy: inch(0.4),
      autofit: "none",
      paragraphs: paraSimple("PROPOSTA COMERCIAL", {
        sz: 1300,
        bold: true,
        color: COLOR_ACCENT,
        font: FONT_HEAD,
        spc: 500,
      }),
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "OfferName",
      x: marginX,
      y: inch(1.5),
      cx: cw,
      cy: inch(1.6),
      autofit: "norm",
      paragraphs: paraSimple(data.ofertaNome || "Proposição", {
        sz: 5400,
        bold: true,
        color: COLOR_TEXT,
        font: FONT_HEAD,
      }),
    }),
  );
  if (data.ofertaTagline) {
    parts.push(
      textShape({
        id: ids(),
        name: "Tagline",
        x: marginX,
        y: inch(3.2),
        cx: cw,
        cy: inch(0.6),
        autofit: "norm",
        paragraphs: paraSimple(data.ofertaTagline, {
          sz: 1800,
          italic: true,
          color: COLOR_MUTED,
        }),
      }),
    );
  }
  // Componentes como pílulas
  if (data.componentes?.length) {
    let cx = marginX;
    const y = inch(4.0);
    data.componentes.forEach((c, i) => {
      const w = Math.max(inch(1.2), inch(0.35 + c.length * 0.13));
      parts.push(
        shape({
          id: ids(),
          name: `Pill${i}`,
          x: cx,
          y,
          cx: w,
          cy: inch(0.42),
          adj: 50000,
          fill: COLOR_DARK,
          alpha: 60000,
          lineColor: COLOR_PRIMARY,
        }),
      );
      parts.push(
        textShape({
          id: ids(),
          name: `PillTx${i}`,
          x: cx,
          y,
          cx: w,
          cy: inch(0.42),
          anchor: "ctr",
          autofit: "none",
          paragraphs: paraSimple(c, {
            sz: 1100,
            bold: true,
            color: COLOR_TEXT,
            align: "ctr",
          }),
        }),
      );
      cx += w + inch(0.15);
    });
  }
  // Big investment badge
  parts.push(
    shape({
      id: ids(),
      name: "InvBg",
      x: marginX,
      y: inch(5.2),
      cx: inch(6.5),
      cy: inch(1.4),
      adj: 8000,
      gradient: true,
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "InvLbl",
      x: marginX + inch(0.3),
      y: inch(5.3),
      cx: inch(6.0),
      cy: inch(0.3),
      autofit: "none",
      paragraphs: paraSimple("INVESTIMENTO MENSAL", {
        sz: 1000,
        bold: true,
        color: COLOR_ON_DARK,
        font: FONT_HEAD,
        spc: 400,
      }),
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "InvVal",
      x: marginX + inch(0.3),
      y: inch(5.65),
      cx: inch(6.0),
      cy: inch(0.85),
      autofit: "norm",
      paragraphs: paraSimple(fmt(data.investimentoTotal), {
        sz: 4000,
        bold: true,
        color: COLOR_ON_DARK,
        font: FONT_HEAD,
      }),
    }),
  );
  return parts.join("");
}

function renderCamada(ids: () => number, cam: CamadaSlideData, idx: number): string {
  const meta = TIER_META[cam.key as string] ?? { tag: "TIER", number: idx + 1, tagColor: COLOR_ACCENT };
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;
  const parts: string[] = [];

  // Camada slides preservam o fundo com imagem do master (slide clonado).
  // As cores foram invertidas para máximo contraste sobre fundo escuro.
  const CAM_TEXT = "FFFFFF";
  const CAM_MUTED = "C9D8CE";
  const CAM_ACCENT = "8EE3B8"; // verde claro (kickers, divisórias)
  const CAM_TAG = "F1F6F3";
  const CAM_CARD_FILL = "0B1E15"; // verde muito escuro translúcido
  const CAM_CARD_LINE = CAM_ACCENT;

  // Kicker
  parts.push(
    textShape({
      id: ids(),
      name: "Kicker",
      x: marginX + inch(1.15),
      y: inch(0.5),
      cx: cw - inch(2.5),
      cy: inch(0.3),
      autofit: "none",
      paragraphs: paraSimple("CAMADA DA OFERTA", {
        sz: 1000,
        bold: true,
        color: CAM_ACCENT,
        font: FONT_HEAD,
        spc: 400,
      }),
    }),
  );

  // Badge (rounded dark square) com número
  const badgeSize = inch(0.95);
  parts.push(
    shape({
      id: ids(),
      name: "Badge",
      x: marginX,
      y: inch(0.85),
      cx: badgeSize,
      cy: badgeSize,
      adj: 22000,
      fill: CAM_ACCENT,
      lineColor: CAM_ACCENT,
      lineW: 15875,
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "BadgeNum",
      x: marginX,
      y: inch(0.85),
      cx: badgeSize,
      cy: badgeSize,
      anchor: "ctr",
      autofit: "none",
      paragraphs: paraSimple(String(meta.number), {
        sz: 3600,
        bold: true,
        color: "0B1E15",
        font: FONT_HEAD,
        align: "ctr",
      }),
    }),
  );

  // Tier tag (canto sup. direito)
  parts.push(
    textShape({
      id: ids(),
      name: "TierTag",
      x: SLIDE_W - marginX - inch(2.2),
      y: inch(0.95),
      cx: inch(2.2),
      cy: inch(0.4),
      autofit: "none",
      paragraphs: paraSimple(meta.tag, {
        sz: 1400,
        bold: true,
        color: CAM_TAG,
        font: FONT_HEAD,
        align: "r",
        spc: 500,
      }),
    }),
  );

  // Título
  parts.push(
    textShape({
      id: ids(),
      name: "CamTitle",
      x: marginX + inch(1.15),
      y: inch(0.85),
      cx: cw - inch(3.5),
      cy: inch(0.75),
      autofit: "norm",
      paragraphs: paraSimple(cam.titulo, {
        sz: 3200,
        bold: true,
        color: CAM_TEXT,
        font: FONT_HEAD,
      }),
    }),
  );

  // Tagline
  if (cam.tagline) {
    parts.push(
      textShape({
        id: ids(),
        name: "CamTag",
        x: marginX + inch(1.15),
        y: inch(1.55),
        cx: cw - inch(3.5),
        cy: inch(0.32),
        autofit: "none",
        paragraphs: paraSimple(cam.tagline, {
          sz: 1200,
          bold: true,
          italic: true,
          color: CAM_MUTED,
        }),
      }),
    );
  }

  // Divider
  parts.push(
    shape({
      id: ids(),
      name: "Divider",
      prst: "rect",
      x: marginX,
      y: inch(2.0),
      cx: inch(0.7),
      cy: 22860,
      fill: CAM_ACCENT,
    }),
  );

  // Descrição
  if (cam.descricao) {
    parts.push(
      textShape({
        id: ids(),
        name: "CamDesc",
        x: marginX,
        y: inch(2.15),
        cx: cw,
        cy: inch(0.95),
        autofit: "norm",
        paragraphs: paraSimple(cam.descricao, {
          sz: 1200,
          color: CAM_TEXT,
        }),
      }),
    );
  }

  // "O QUE ESTÁ INCLUÍDO"
  const inclY = inch(3.20);
  parts.push(
    textShape({
      id: ids(),
      name: "InclKicker",
      x: marginX,
      y: inclY,
      cx: cw,
      cy: inch(0.3),
      autofit: "none",
      paragraphs: paraSimple("★  O QUE ESTÁ INCLUÍDO", {
        sz: 1100,
        bold: true,
        color: CAM_ACCENT,
        font: FONT_HEAD,
        spc: 400,
      }),
    }),
  );

  // Checklist em 2 colunas
  const items = (cam.incluidos ?? []).slice(0, 10);
  const colGap = inch(0.35);
  const colW = Math.floor((cw - colGap) / 2);
  const half = Math.ceil(items.length / 2);
  const colA = items.slice(0, half);
  const colB = items.slice(half);
  const sz = items.length > 6 ? 1000 : 1100;
  const listY = inch(3.55);
  const listH = inch(2.05);
  parts.push(
    textShape({
      id: ids(),
      name: "InclA",
      x: marginX,
      y: listY,
      cx: colW,
      cy: listH,
      autofit: "norm",
      paragraphs:
        colA.map((t) => paraCheck(t, sz, CAM_TEXT, CAM_ACCENT)).join("") ||
        paraSimple("—", { color: CAM_MUTED }),
    }),
  );
  if (colB.length) {
    parts.push(
      textShape({
        id: ids(),
        name: "InclB",
        x: marginX + colW + colGap,
        y: listY,
        cx: colW,
        cy: listH,
        autofit: "norm",
        paragraphs: colB.map((t) => paraCheck(t, sz, CAM_TEXT, CAM_ACCENT)).join(""),
      }),
    );
  }

  // Footer: cards de volumes / horas + investimento
  const footerY = inch(5.75);
  const footerH = inch(1.15);
  const metricas = buildCamadaMetrics(cam);
  const investW = inch(3.5);
  const gridW = cw - investW - inch(0.2);
  const cardCount = metricas.length;
  if (cardCount > 0) {
    const gap = inch(0.12);
    const cardW = Math.floor((gridW - gap * (cardCount - 1)) / cardCount);
    metricas.forEach((m, i) => {
      parts.push(
        metricCard(
          ids,
          marginX + i * (cardW + gap),
          footerY,
          cardW,
          footerH,
          m.label,
          m.value,
          m.sub,
        ),
      );
    });
  }
  // Card investimento (gradiente, canto direito)
  parts.push(
    shape({
      id: ids(),
      name: "InvBg",
      x: SLIDE_W - marginX - investW,
      y: footerY,
      cx: investW,
      cy: footerH,
      adj: 8000,
      gradient: true,
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "InvLbl",
      x: SLIDE_W - marginX - investW + inch(0.2),
      y: footerY + inch(0.12),
      cx: investW - inch(0.4),
      cy: inch(0.28),
      autofit: "none",
      paragraphs: paraSimple("INVESTIMENTO MENSAL", {
        sz: 900,
        bold: true,
        color: COLOR_ON_DARK,
        font: FONT_HEAD,
        spc: 300,
      }),
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "InvVal",
      x: SLIDE_W - marginX - investW + inch(0.2),
      y: footerY + inch(0.4),
      cx: investW - inch(0.4),
      cy: inch(0.7),
      autofit: "norm",
      paragraphs: paraSimple(fmt(cam.valor), {
        sz: 2600,
        bold: true,
        color: COLOR_ON_DARK,
        font: FONT_HEAD,
      }),
    }),
  );

  return parts.join("");
}

function buildCamadaMetrics(cam: CamadaSlideData): { label: string; value: string; sub?: string }[] {
  const out: { label: string; value: string; sub?: string }[] = [];
  const met = cam.metricas ?? [];
  // Prioriza métricas já preparadas no payload
  met.slice(0, 3).forEach((m) => out.push({ label: m.label, value: m.value }));
  // Complementa com horas N3 se disponível
  if (cam.horasN3 && out.length < 4) {
    out.push({
      label: "Horas N3",
      value: `${fmtNum(cam.horasN3.total, 1)}h`,
      sub: `${fmt(cam.horasN3.valorHora)}/h`,
    });
  }
  // Field service
  if (cam.field && out.length < 4) {
    out.push({
      label: "Field · profissionais",
      value: String(cam.field.profissionais.reduce((s, p) => s + p.qtd, 0)),
      sub: `${fmtNum(cam.field.chamadosEscalados, 1)} ch/mês`,
    });
  }
  return out.slice(0, 4);
}

function renderHorasN3(ids: () => number, cam: CamadaSlideData, n3: HorasN3Slide): string {
  const parts: string[] = [];
  parts.push(kickerAndTitle(ids, `${cam.titulo} · Horas N3`, "Detalhamento Horas N3"));
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;

  // Barra horizontal com total
  const barY = inch(1.95);
  parts.push(
    shape({
      id: ids(),
      name: "TotalBar",
      x: marginX,
      y: barY,
      cx: cw,
      cy: inch(0.85),
      adj: 10000,
      gradient: true,
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "TotalLbl",
      x: marginX + inch(0.3),
      y: barY + inch(0.14),
      cx: cw - inch(0.6),
      cy: inch(0.3),
      autofit: "none",
      paragraphs: paraSimple("TOTAL DE HORAS TÉCNICAS N3 · MÊS", {
        sz: 1000,
        bold: true,
        color: COLOR_ON_DARK,
        font: FONT_HEAD,
        spc: 400,
      }),
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "TotalVal",
      x: marginX + inch(0.3),
      y: barY + inch(0.42),
      cx: cw - inch(0.6),
      cy: inch(0.42),
      autofit: "norm",
      paragraphs: paraSimple(
        `${fmtNum(n3.total, 1)}h  ·  ${fmt(n3.valorHora)}/h  ·  ${fmt(n3.total * n3.valorHora)}/mês`,
        { sz: 1800, bold: true, color: COLOR_ON_DARK, font: FONT_HEAD },
      ),
    }),
  );

  // Cards por bucket
  const cardsY = inch(3.05);
  const cardsH = inch(2.4);
  const blocos = n3.blocos.slice(0, 5);
  const gap = inch(0.15);
  const cardW = Math.floor((cw - gap * (blocos.length - 1)) / blocos.length);
  blocos.forEach((b, i) => {
    const x = marginX + i * (cardW + gap);
    parts.push(
      shape({
        id: ids(),
        name: `N3Card${i}`,
        x,
        y: cardsY,
        cx: cardW,
        cy: cardsH,
        adj: 8000,
        fill: COLOR_DARK,
        alpha: 55000,
        lineColor: COLOR_PRIMARY,
        lineW: 12700,
      }),
    );
    parts.push(
      textShape({
        id: ids(),
        name: `N3Ttl${i}`,
        x: x + inch(0.2),
        y: cardsY + inch(0.18),
        cx: cardW - inch(0.4),
        cy: inch(0.5),
        autofit: "norm",
        paragraphs: paraSimple(b.titulo.toUpperCase(), {
          sz: 1000,
          bold: true,
          color: COLOR_ACCENT,
          font: FONT_HEAD,
          spc: 300,
        }),
      }),
    );
    parts.push(
      textShape({
        id: ids(),
        name: `N3Hrs${i}`,
        x: x + inch(0.2),
        y: cardsY + inch(0.75),
        cx: cardW - inch(0.4),
        cy: inch(0.7),
        autofit: "norm",
        paragraphs: paraSimple(`${fmtNum(b.horas, 1)}h`, {
          sz: 2800,
          bold: true,
          color: COLOR_TEXT,
          font: FONT_HEAD,
        }),
      }),
    );
    if (b.descricao) {
      parts.push(
        textShape({
          id: ids(),
          name: `N3Desc${i}`,
          x: x + inch(0.2),
          y: cardsY + inch(1.55),
          cx: cardW - inch(0.4),
          cy: inch(0.75),
          autofit: "norm",
          paragraphs: paraSimple(b.descricao, {
            sz: 900,
            italic: true,
            color: COLOR_MUTED,
          }),
        }),
      );
    }
  });

  return parts.join("");
}

function renderRotinas(ids: () => number, cam: CamadaSlideData, grupo: RotinaGrupoSlide): string {
  const parts: string[] = [];
  parts.push(kickerAndTitle(ids, `${cam.titulo} · Rotinas`, grupo.titulo));
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;

  // Estratégia: Top 8 por demanda + "demais rotinas" consolidado
  const sorted = [...grupo.items].sort((a, b) => b.demanda - a.demanda);
  const TOP = 8;
  const top = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);
  const restDemanda = rest.reduce((s, r) => s + r.demanda, 0);

  // Card container
  const tableY = inch(1.95);
  const rowH = inch(0.42);
  const rowCount = 1 + top.length + (rest.length ? 1 : 0) + 1; // header + rows + resto + total
  const tableH = rowH * rowCount + inch(0.15);
  parts.push(
    shape({
      id: ids(),
      name: "TblBg",
      x: marginX,
      y: tableY,
      cx: cw,
      cy: tableH,
      adj: 8000,
      fill: COLOR_DARK,
      alpha: 40000,
      lineColor: COLOR_PRIMARY,
      lineW: 9525,
    }),
  );

  // Colunas: Grupo | Rotina | Frequência | Demanda/mês
  const wGrupo = inch(2.1);
  const wFreq = inch(1.8);
  const wDem = inch(1.5);
  const wRotina = cw - wGrupo - wFreq - wDem - inch(0.2);

  let yy = tableY + inch(0.07);
  parts.push(
    tableRow(
      ids,
      marginX + inch(0.1),
      yy,
      cw - inch(0.2),
      rowH,
      [
        { text: "GRUPO", w: wGrupo, align: "l" },
        { text: "ROTINA", w: wRotina, align: "l" },
        { text: "FREQUÊNCIA", w: wFreq, align: "l" },
        { text: "DEMANDA/MÊS", w: wDem, align: "r" },
      ],
      { header: true },
    ),
  );
  yy += rowH;
  top.forEach((r, i) => {
    parts.push(
      tableRow(
        ids,
        marginX + inch(0.1),
        yy,
        cw - inch(0.2),
        rowH,
        [
          { text: r.grupo, w: wGrupo, color: COLOR_MUTED, sz: 950 },
          { text: r.rotina, w: wRotina, bold: true, sz: 1000 },
          { text: r.frequencia, w: wFreq, color: COLOR_MUTED, sz: 950 },
          { text: fmtNum(r.demanda, 1), w: wDem, align: "r", bold: true, sz: 1000 },
        ],
        { fill: COLOR_DARK, alpha: i % 2 === 0 ? 20000 : 5000 },
      ),
    );
    yy += rowH;
  });
  if (rest.length) {
    parts.push(
      tableRow(
        ids,
        marginX + inch(0.1),
        yy,
        cw - inch(0.2),
        rowH,
        [
          { text: "—", w: wGrupo, color: COLOR_MUTED },
          {
            text: `Demais rotinas do grupo (${rest.length} itens)`,
            w: wRotina,
            italic: false,
            color: COLOR_MUTED,
            sz: 950,
          } as { text: string; w: number; color?: string; sz?: number },
          { text: "Diversas", w: wFreq, color: COLOR_MUTED, sz: 950 },
          { text: fmtNum(restDemanda, 1), w: wDem, align: "r", color: COLOR_MUTED, sz: 950 },
        ],
        { fill: COLOR_DARK, alpha: 15000 },
      ),
    );
    yy += rowH;
  }
  // Total
  const somaDemanda = grupo.items.reduce((s, r) => s + r.demanda, 0);
  parts.push(
    tableRow(
      ids,
      marginX + inch(0.1),
      yy,
      cw - inch(0.2),
      rowH,
      [
        { text: "TOTAL PREVISTO", w: wGrupo + wRotina + wFreq, bold: true, color: COLOR_ON_DARK },
        { text: `${fmtNum(somaDemanda, 1)} ch/mês`, w: wDem, align: "r", bold: true, color: COLOR_ON_DARK },
      ],
      { fill: COLOR_PRIMARY },
    ),
  );

  // Nota
  parts.push(
    textShape({
      id: ids(),
      name: "Note",
      x: marginX,
      y: tableY + tableH + inch(0.15),
      cx: cw,
      cy: inch(0.4),
      autofit: "norm",
      paragraphs: paraSimple(
        "Rotinas absorvidas pelo pool de horas N3 / Automação contratado. Detalhamento completo no Relatório de Proposição.",
        { sz: 900, italic: true, color: COLOR_MUTED },
      ),
    }),
  );

  return parts.join("");
}

function renderRestricoesCamadas(ids: () => number, camadas: CamadaSlideData[]): string {
  const parts: string[] = [];
  parts.push(kickerAndTitle(ids, "Escopo Contratual", "Restrições de Atuação por Camada"));

  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;
  const y = inch(1.95);
  const h = inch(4.85);
  const gap = inch(0.2);
  const cols = Math.min(camadas.length, 4);
  const colW = Math.floor((cw - gap * (cols - 1)) / cols);
  camadas.slice(0, 4).forEach((c, i) => {
    const x = marginX + i * (colW + gap);
    parts.push(
      shape({
        id: ids(),
        name: `RestrCard${i}`,
        x,
        y,
        cx: colW,
        cy: h,
        adj: 8000,
        fill: COLOR_DARK,
        alpha: 55000,
        lineColor: COLOR_PRIMARY,
        lineW: 12700,
      }),
    );
    parts.push(
      textShape({
        id: ids(),
        name: `RestrTtl${i}`,
        x: x + inch(0.25),
        y: y + inch(0.2),
        cx: colW - inch(0.5),
        cy: inch(0.55),
        autofit: "norm",
        paragraphs: paraSimple(c.titulo.toUpperCase(), {
          sz: 1400,
          bold: true,
          color: COLOR_ACCENT,
          font: FONT_HEAD,
          spc: 300,
        }),
      }),
    );
    const items = (c.restricoes ?? []).slice(0, 10);
    const sz = items.length > 6 ? 900 : 1000;
    parts.push(
      textShape({
        id: ids(),
        name: `RestrList${i}`,
        x: x + inch(0.25),
        y: y + inch(0.85),
        cx: colW - inch(0.5),
        cy: h - inch(1.0),
        autofit: "norm",
        paragraphs: items.map((t) => paraBullet(t, sz, COLOR_TEXT)).join("") ||
          paraSimple("Sem restrições específicas.", { sz, italic: true, color: COLOR_MUTED }),
      }),
    );
  });
  return parts.join("");
}

function renderItensAdicionais(
  ids: () => number,
  items: ItemAdicionalSlide[],
  page: number,
  total: number,
): string {
  const parts: string[] = [];
  const title = total > 1 ? `Itens Adicionais ao Contrato (${page}/${total})` : "Itens Adicionais ao Contrato";
  parts.push(kickerAndTitle(ids, "Escopo", title));
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;

  const y = inch(1.95);
  const rowH = inch(0.42);
  const rowCount = items.length + 1;
  const tblH = rowH * rowCount + inch(0.15);
  parts.push(
    shape({
      id: ids(),
      name: "TblBg",
      x: marginX,
      y,
      cx: cw,
      cy: tblH,
      adj: 8000,
      fill: COLOR_DARK,
      alpha: 40000,
      lineColor: COLOR_PRIMARY,
      lineW: 9525,
    }),
  );

  const wUnid = inch(1.5);
  const wValor = inch(1.7);
  const wObs = inch(4.2);
  const wItem = cw - wUnid - wValor - wObs - inch(0.2);

  let yy = y + inch(0.07);
  parts.push(
    tableRow(
      ids,
      marginX + inch(0.1),
      yy,
      cw - inch(0.2),
      rowH,
      [
        { text: "ITEM", w: wItem, align: "l" },
        { text: "UNIDADE", w: wUnid, align: "l" },
        { text: "VALOR UNIT.", w: wValor, align: "r" },
        { text: "OBSERVAÇÃO", w: wObs, align: "l" },
      ],
      { header: true },
    ),
  );
  yy += rowH;
  items.forEach((it, i) => {
    parts.push(
      tableRow(
        ids,
        marginX + inch(0.1),
        yy,
        cw - inch(0.2),
        rowH,
        [
          { text: it.descricao, w: wItem, bold: true, sz: 1000 },
          { text: it.unidade, w: wUnid, color: COLOR_MUTED, sz: 950 },
          { text: fmt(it.valor), w: wValor, color: COLOR_TEXT, sz: 1000, bold: true, align: "r" },
          { text: it.observacao ?? "", w: wObs, color: COLOR_MUTED, sz: 900 },
        ],
        { fill: COLOR_DARK, alpha: i % 2 === 0 ? 20000 : 5000 },
      ),
    );
    yy += rowH;
  });
  return parts.join("");
}

function renderRestricoesGerais(ids: () => number, items: string[]): string {
  const parts: string[] = [];
  parts.push(kickerAndTitle(ids, "Escopo", "Restrições Gerais"));
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;
  const y = inch(1.95);
  const h = inch(4.85);
  parts.push(
    shape({
      id: ids(),
      name: "Card",
      x: marginX,
      y,
      cx: cw,
      cy: h,
      adj: 8000,
      fill: COLOR_DARK,
      alpha: 55000,
      lineColor: COLOR_PRIMARY,
      lineW: 12700,
    }),
  );
  const sz = items.length > 10 ? 1000 : items.length > 6 ? 1100 : 1300;
  const useTwo = items.length > 8;
  if (useTwo) {
    const half = Math.ceil(items.length / 2);
    const a = items.slice(0, half);
    const b = items.slice(half);
    const gap = inch(0.35);
    const colW = Math.floor((cw - inch(0.8) - gap) / 2);
    parts.push(
      textShape({
        id: ids(),
        name: "ListA",
        x: marginX + inch(0.4),
        y: y + inch(0.3),
        cx: colW,
        cy: h - inch(0.6),
        autofit: "norm",
        paragraphs: a.map((t) => paraBullet(t, sz, COLOR_TEXT)).join(""),
      }),
    );
    parts.push(
      textShape({
        id: ids(),
        name: "ListB",
        x: marginX + inch(0.4) + colW + gap,
        y: y + inch(0.3),
        cx: colW,
        cy: h - inch(0.6),
        autofit: "norm",
        paragraphs: b.map((t) => paraBullet(t, sz, COLOR_TEXT)).join(""),
      }),
    );
  } else {
    parts.push(
      textShape({
        id: ids(),
        name: "List",
        x: marginX + inch(0.4),
        y: y + inch(0.3),
        cx: cw - inch(0.8),
        cy: h - inch(0.6),
        autofit: "norm",
        paragraphs: items.map((t) => paraBullet(t, sz, COLOR_TEXT)).join(""),
      }),
    );
  }
  return parts.join("");
}

function renderInvestimento(ids: () => number, data: ApresentacaoPayload): string {
  const parts: string[] = [];
  parts.push(kickerAndTitle(ids, "Investimento", "Investimento Mensal Total"));
  const marginX = inch(0.55);
  const cw = SLIDE_W - marginX * 2;

  // Bloco esquerdo: número gigante
  const leftW = inch(6.5);
  parts.push(
    textShape({
      id: ids(),
      name: "BigLabel",
      x: marginX,
      y: inch(2.0),
      cx: leftW,
      cy: inch(0.4),
      autofit: "none",
      paragraphs: paraSimple("TOTAL MENSAL", {
        sz: 1200,
        bold: true,
        color: COLOR_ACCENT,
        font: FONT_HEAD,
        spc: 500,
      }),
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "BigVal",
      x: marginX,
      y: inch(2.45),
      cx: leftW,
      cy: inch(1.6),
      autofit: "norm",
      paragraphs: paraSimple(fmt(data.investimentoTotal), {
        sz: 6000,
        bold: true,
        color: COLOR_TEXT,
        font: FONT_HEAD,
      }),
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "Annual",
      x: marginX,
      y: inch(4.1),
      cx: leftW,
      cy: inch(0.6),
      autofit: "norm",
      paragraphs:
        paraSimple(`Anual · ${fmt(data.investimentoTotal * 12)}`, {
          sz: 1400,
          bold: true,
          color: COLOR_MUTED,
        }),
    }),
  );

  // Bloco direito: breakdown por camada
  const rightX = marginX + leftW + inch(0.3);
  const rightW = cw - leftW - inch(0.3);
  parts.push(
    shape({
      id: ids(),
      name: "BrkBg",
      x: rightX,
      y: inch(1.95),
      cx: rightW,
      cy: inch(4.85),
      adj: 8000,
      fill: COLOR_DARK,
      alpha: 55000,
      lineColor: COLOR_PRIMARY,
      lineW: 12700,
    }),
  );
  parts.push(
    textShape({
      id: ids(),
      name: "BrkTtl",
      x: rightX + inch(0.3),
      y: inch(2.15),
      cx: rightW - inch(0.6),
      cy: inch(0.4),
      autofit: "none",
      paragraphs: paraSimple("COMPOSIÇÃO POR CAMADA", {
        sz: 1100,
        bold: true,
        color: COLOR_ACCENT,
        font: FONT_HEAD,
        spc: 400,
      }),
    }),
  );
  const camadas = data.camadas ?? [];
  const listY = inch(2.75);
  const rowH = inch(0.5);
  camadas.forEach((c, i) => {
    const y = listY + i * rowH;
    parts.push(
      textShape({
        id: ids(),
        name: `BrkL${i}`,
        x: rightX + inch(0.3),
        y,
        cx: rightW - inch(0.6),
        cy: rowH,
        anchor: "ctr",
        autofit: "norm",
        paragraphs: paraSimple(c.titulo, {
          sz: 1300,
          bold: true,
          color: COLOR_TEXT,
        }),
      }),
    );
    parts.push(
      textShape({
        id: ids(),
        name: `BrkV${i}`,
        x: rightX + inch(0.3),
        y,
        cx: rightW - inch(0.6),
        cy: rowH,
        anchor: "ctr",
        autofit: "norm",
        paragraphs: paraSimple(fmt(c.valor), {
          sz: 1300,
          bold: true,
          color: COLOR_ACCENT,
          align: "r",
          font: FONT_HEAD,
        }),
      }),
    );
  });
  return parts.join("");
}

/**
 * Remove do template clonado shapes que contêm o texto "Proposição" — era o
 * placeholder do master, dispensável nos slides gerados.
 */
function stripProposicaoShape(xml: string): string {
  return xml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, (sp) => {
    const flat = sp.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (/>\s*[^<]*Proposicao[^<]*</i.test(flat)) return "";
    return sp;
  });
}

/* ------------------------------------------------------------------ */
/* Núcleo: renderiza um bloco em cima do slide clonado                 */
/* ------------------------------------------------------------------ */

function buildContentSlide(templateXml: string, block: Block, seed: number): string {
  const baseXml = stripProposicaoShape(templateXml);
  let counter = 5000 + seed * 200;
  const ids = () => ++counter;

  // Overlay branco cobrindo todo o slide, para garantir alto contraste
  // do conteúdo injetado (referência: slide 6). O master fica preservado
  // no ZIP, mas visualmente é reescrito neste clone.
  const whiteBg = shape({
    id: ++counter,
    name: "WhiteBg",
    prst: "rect",
    x: 0,
    y: 0,
    cx: SLIDE_W,
    cy: SLIDE_H,
    fill: COLOR_SURFACE,
  });
  // Faixa lateral verde (identidade), à esquerda
  const sideBand = shape({
    id: ++counter,
    name: "SideBand",
    prst: "rect",
    x: 0,
    y: 0,
    cx: inch(0.18),
    cy: SLIDE_H,
    fill: COLOR_PRIMARY,
  });

  let injection = whiteBg + sideBand;
  switch (block.kind) {
    case "capa":
      injection += renderCapa(ids, block.data);
      break;
    case "camada":
      injection += renderCamada(ids, block.cam, block.idx);
      break;
    case "horas-n3":
      injection += renderHorasN3(ids, block.cam, block.n3);
      break;
    case "rotinas":
      injection += renderRotinas(ids, block.cam, block.grupo);
      break;
    case "restricoes-camadas":
      injection += renderRestricoesCamadas(ids, block.camadas);
      break;
    case "itens-adicionais":
      injection += renderItensAdicionais(ids, block.items, block.page, block.totalPages);
      break;
    case "restricoes-gerais":
      injection += renderRestricoesGerais(ids, block.items);
      break;
    case "investimento":
      injection += renderInvestimento(ids, block.data);
      break;
  }
  return baseXml.replace(/<\/p:spTree>/, `${injection}</p:spTree>`);
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