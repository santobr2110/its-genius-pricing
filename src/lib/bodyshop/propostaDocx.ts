import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { realcarPendencias } from '@/lib/zabbix/propostaDocxV2';
import logo from '@/assets/selbetti-logo.png.asset.json';
import { moedaBS, secoesPropostaBS, type ModeloPropostaBS } from './proposta';

/** v1 remains programmatic until a dedicated design template is supplied. */
export async function gerarPropostaBsDocx(m: ModeloPropostaBS): Promise<Blob> {
  let blob: Blob;
  if (m.layoutVersao === 2) {
    const response = await fetch('/templates/proposta-bodyshop-template.docx');
    if (!response.ok) throw new Error('Modelo Word BodyShop indisponível.');
    const doc = new Docxtemplater(new PizZip(await response.arrayBuffer()), {paragraphLoop:true,linebreaks:true});
    doc.render({...m,itens:m.itens.map(i=>({...i,unitario:moedaBS(i.unitario),total:moedaBS(i.total)})),totalMensal:moedaBS(m.totalMensal),totalContrato:moedaBS(m.totalContrato)});
    blob = doc.getZip().generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  } else {
    const run = (text:string,bold=false) => new TextRun({text,bold,font:'Segoe UI',size:22});
    const p = (text:string) => new Paragraph({children:[run(text)],spacing:{after:140}});
    const widths = [3600,800,2300,2370];
    const border = {style:BorderStyle.SINGLE,size:4,color:'BFBFBF'};
    const row = (values:string[],header=false) => new TableRow({tableHeader:header,cantSplit:true,children:values.map((v,i)=>new TableCell({width:{size:widths[i],type:WidthType.DXA},margins:{top:100,bottom:100,left:100,right:100},borders:{top:border,bottom:border,left:border,right:border},shading:header?{fill:'E7EFEA',type:ShadingType.CLEAR}:undefined,children:[new Paragraph({alignment:i?AlignmentType.RIGHT:AlignmentType.LEFT,children:[run(v,header)]})]}))});
    const table = new Table({width:{size:9070,type:WidthType.DXA},columnWidths:widths,rows:[row(['Perfil','Quantidade','Valor Mensal Unitário','Valor Mensal Total'],true),...m.itens.map(i=>row([i.perfil,String(i.quantidade),moedaBS(i.unitario),moedaBS(i.total)]))]});
    const children: (Paragraph | Table)[] = [];
    try {
      const response = await fetch(logo.url); if(response.ok) children.push(new Paragraph({children:[new ImageRun({type:'png',data:await response.arrayBuffer(),transformation:{width:160,height:42},altText:{title:'Selbetti',description:'Selbetti IT Solutions',name:'Selbetti'}})]}));
    } catch { /* Text brand remains available when the logo service is unavailable. */ }
    children.push(new Paragraph({children:[new TextRun({text:'BODYSHOP',bold:true,font:'Segoe UI',size:44})],spacing:{before:600,after:200}}),p('Alocação de Profissionais · Proposta Comercial'),p(m.cliente),p(`${m.codigo ?? ''} · versão ${m.versao}`));
    for (const section of secoesPropostaBS(m)) {
      children.push(new Paragraph({heading:HeadingLevel.HEADING_1,pageBreakBefore:['Carta de apresentação','Quem somos','Objeto e escopo da alocação','Investimento','Aceite'].includes(section.titulo),keepNext:true,spacing:{before:240,after:200},children:[run(section.titulo,true)]}));
      if ('investimento' in section) children.push(table);
      children.push(...section.textos.flatMap(t=>t.split(/\n/).filter(Boolean).map(p)));
    }
    blob = await Packer.toBlob(new Document({styles:{default:{document:{run:{font:'Segoe UI',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1418,right:1418,bottom:1418,left:1418}}},children}]}));
  }
  const zip = new PizZip(await blob.arrayBuffer());
  const xml = zip.file('word/document.xml');
  if (!xml) throw new Error('Document Word inválido.');
  zip.file('word/document.xml',realcarPendencias(xml.asText()));
  return zip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}