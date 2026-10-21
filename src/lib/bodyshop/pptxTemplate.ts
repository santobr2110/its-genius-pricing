import PizZip from "pizzip";

/**
 * Operações mínimas sobre o pacote OOXML do PowerPoint (sem pptxgenjs, sem módulo pago).
 * O design vive no .pptx; aqui só se trocam marcadores {{TOKEN}} e se clonam/reordenam slides.
 */
export const A_CONFIRMAR = "[A CONFIRMAR]";
const PRES = "ppt/presentation.xml";
const PRES_RELS = "ppt/_rels/presentation.xml.rels";
const CT = "[Content_Types].xml";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const ler = (zip: PizZip, f: string) => { const x = zip.file(f); if (!x) throw new Error(`Modelo PowerPoint inválido: falta ${f}.`); return x.asText(); };

export async function abrirTemplate(url: string): Promise<PizZip> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Modelo PowerPoint do BodyShop indisponível.");
  return new PizZip(await r.arrayBuffer());
}

/** Realça um run em amarelo (equivalente ao realcarPendencias do Word). */
function realcar(rPr: string): string {
  if (rPr.includes("<a:highlight")) return rPr;
  const hl = '<a:highlight><a:srgbClr val="FFFF00"/></a:highlight>';
  if (/^<a:rPr[^>]*\/>$/.test(rPr)) return rPr.replace(/\/>$/, `>${hl}</a:rPr>`);
  // highlight vem depois de ln/fill/effect e antes de latin/ea/cs/sym/hlink
  const m = rPr.match(/<a:(latin|ea|cs|sym|hlinkClick|hlinkMouseOver|rtl|extLst)\b/);
  return m ? rPr.replace(m[0], `${hl}${m[0]}`) : rPr.replace("</a:rPr>", `${hl}</a:rPr>`);
}

/**
 * Substitui tokens num XML de slide. Só achata parágrafos que contêm "{{" (runs partidos);
 * valores com \n viram um <a:p> por linha, preservando <a:pPr> (marcadores do template).
 * Token sem valor no mapa vira [A CONFIRMAR] realçado.
 */
export function substituirTokensXml(xml: string, mapa: Record<string, string>): string {
  return xml.replace(/<a:p>([\s\S]*?)<\/a:p>|<a:p (?:[^>]*)>([\s\S]*?)<\/a:p>/g, (orig) => {
    const textos = [...orig.matchAll(/<a:t>([^<]*)<\/a:t>|<a:t\/>/g)].map(m => unesc(m[1] ?? ""));
    const full = textos.join("");
    if (!full.includes("{{")) return orig;
    const abertura = orig.match(/^<a:p[^>]*>/)![0];
    const pPr = orig.match(/<a:pPr\b[^>]*\/>|<a:pPr\b[\s\S]*?<\/a:pPr>/)?.[0] ?? "";
    const rPr0 = orig.match(/<a:r>\s*(<a:rPr\b[^>]*\/>|<a:rPr\b[\s\S]*?<\/a:rPr>)/)?.[1] ?? "<a:rPr/>";
    const end = orig.match(/<a:endParaRPr\b[^>]*\/>|<a:endParaRPr\b[\s\S]*?<\/a:endParaRPr>/)?.[0] ?? "";
    let pend = false;
    const valor = full.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k: string) => {
      const v = mapa[k];
      const s = v == null || String(v).trim() === "" ? A_CONFIRMAR : String(v);
      if (s.includes(A_CONFIRMAR)) pend = true;
      return s;
    });
    const linhas = valor.split("\n").map(l => l.replace(/^\s*•\s*/, ""));
    const rPr = pend ? realcar(rPr0) : rPr0;
    return linhas.map(l => `${abertura}${pPr}<a:r>${rPr}<a:t>${esc(l)}</a:t></a:r>${end}</a:p>`).join("");
  });
}

export function substituirTokens(zip: PizZip, slide: number, mapa: Record<string, string>): void {
  const f = `ppt/slides/slide${slide}.xml`;
  zip.file(f, substituirTokensXml(ler(zip, f), mapa));
}

interface SldRef { id: number; rid: string; arquivo: number }
/** Slides na ordem de apresentação, com o número do arquivo slideN.xml. */
export function listarSlides(zip: PizZip): SldRef[] {
  const rels = ler(zip, PRES_RELS);
  const alvo = new Map([...rels.matchAll(/<Relationship\b[^>]*>/g)].map(m => {
    const id = m[0].match(/Id="([^"]+)"/)![1]; const t = m[0].match(/Target="([^"]+)"/)![1]; return [id, t] as const;
  }));
  const lst = ler(zip, PRES).match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/)?.[1] ?? "";
  return [...lst.matchAll(/<p:sldId\b[^>]*\/>/g)].map(m => {
    const id = Number(m[0].match(/\bid="(\d+)"/)![1]); const rid = m[0].match(/r:id="([^"]+)"/)![1];
    const n = Number((alvo.get(rid) ?? "").match(/slide(\d+)\.xml$/)?.[1]);
    return { id, rid, arquivo: n };
  });
}

/** Clona slideN (arquivo) e registra no pacote; devolve o número do novo arquivo. Não entra na ordem até reordenarSlides. */
export function clonarSlide(zip: PizZip, origem: number): number {
  const existentes = Object.keys(zip.files).map(f => Number(f.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1])).filter(Boolean);
  const n = Math.max(...existentes) + 1;
  zip.file(`ppt/slides/slide${n}.xml`, ler(zip, `ppt/slides/slide${origem}.xml`));
  const relsF = `ppt/slides/_rels/slide${origem}.xml.rels`;
  if (zip.file(relsF)) {
    // Notas não são clonadas: um notesSlide com dois donos corrompe o pacote.
    const rels = ler(zip, relsF).replace(/<Relationship\b[^>]*relationships\/notesSlide"[^>]*\/>/g, "");
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, rels);
  }
  let pr = ler(zip, PRES_RELS);
  const ids = [...pr.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1]));
  const rid = `rId${Math.max(0, ...ids) + 1}`;
  pr = pr.replace("</Relationships>", `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n}.xml"/></Relationships>`);
  zip.file(PRES_RELS, pr);
  const ct = ler(zip, CT).replace("</Types>", `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
  zip.file(CT, ct);
  const pres = ler(zip, PRES);
  const maxId = Math.max(255, ...[...pres.matchAll(/<p:sldId\b[^>]*\bid="(\d+)"/g)].map(m => Number(m[1])));
  zip.file(PRES, pres.replace("</p:sldIdLst>", `<p:sldId id="${maxId + 1}" r:id="${rid}"/></p:sldIdLst>`));
  return n;
}

/** Remove o slide (arquivo N) de todos os registros. */
export function removerSlide(zip: PizZip, arquivo: number): void {
  const ref = listarSlides(zip).find(s => s.arquivo === arquivo);
  if (ref) {
    zip.file(PRES, ler(zip, PRES).replace(new RegExp(`<p:sldId\\b[^>]*r:id="${ref.rid}"[^>]*/>`), ""));
    zip.file(PRES_RELS, ler(zip, PRES_RELS).replace(new RegExp(`<Relationship\\b[^>]*Id="${ref.rid}"[^>]*/>`), ""));
  }
  zip.file(CT, ler(zip, CT).replace(new RegExp(`<Override PartName="/ppt/slides/slide${arquivo}\\.xml"[^>]*/>`), ""));
  zip.remove(`ppt/slides/slide${arquivo}.xml`);
  zip.remove(`ppt/slides/_rels/slide${arquivo}.xml.rels`);
}

/** Reordena pela lista de arquivos; slides fora da lista são removidos. */
export function reordenarSlides(zip: PizZip, ordem: number[]): void {
  const refs = listarSlides(zip);
  for (const r of refs) if (!ordem.includes(r.arquivo)) removerSlide(zip, r.arquivo);
  const vivos = listarSlides(zip);
  const lst = ordem.map(a => { const r = vivos.find(v => v.arquivo === a); if (!r) throw new Error(`Slide ${a} inexistente.`); return `<p:sldId id="${r.id}" r:id="${r.rid}"/>`; }).join("");
  zip.file(PRES, ler(zip, PRES).replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${lst}</p:sldIdLst>`));
}

/** Clona a linha da tabela que contém o marcador, uma vez por item; cada item substitui seus próprios tokens. */
export function clonarLinhaTabela(zip: PizZip, slide: number, marcador: string, itens: Record<string, string>[], negritoUltima = false): void {
  const f = `ppt/slides/slide${slide}.xml`;
  const xml = ler(zip, f);
  const tr = [...xml.matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)].find(m => m[0].includes(marcador))?.[0];
  if (!tr) throw new Error(`Linha de tabela com ${marcador} não encontrada.`);
  const linhas = itens.map((mapa, i) => {
    let t = substituirTokensXml(tr, mapa);
    if (negritoUltima && i === itens.length - 1 && itens.length > 1) t = t.replace(/<a:rPr\b(?![^>]*\bb=)/g, '<a:rPr b="1"');
    return t;
  });
  zip.file(f, xml.replace(tr, linhas.join("")));
}

export function tokensPendentes(zip: PizZip): string[] {
  const out = new Set<string>();
  for (const f of Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))) {
    const texto = [...ler(zip, f).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join("");
    for (const m of texto.matchAll(/\{\{[^}]*\}\}/g)) out.add(m[0]);
  }
  return [...out];
}

export function textoSlides(zip: PizZip): string {
  return Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .map(f => [...ler(zip, f).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => unesc(m[1])).join(" ")).join("\n");
}

export const MIME_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export async function salvar(zip: PizZip): Promise<Blob> {
  return zip.generate({ type: "blob", mimeType: MIME_PPTX, compression: "DEFLATE" });
}
