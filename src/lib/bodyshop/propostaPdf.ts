import { jsPDF } from 'jspdf';
import { moedaBS, secoesPropostaBS, type ModeloPropostaBS } from './proposta';

/** Vector PDF from the same frozen content, with safe paragraph pagination. */
export function gerarPropostaBsPdf(m: ModeloPropostaBS): Blob {
  const pdf = new jsPDF({unit:'mm',format:'a4',compress:true});
  let y=22;
  const nova = () => {pdf.addPage();y=22;};
  const texto = (s:string,bold=false,size=11) => {
    pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
    const linhas = pdf.splitTextToSize(s,166) as string[];
    for(const linha of linhas) {if(y>273) nova();pdf.text(linha,22,y);y+=size*.45;}
    y+=3;
  };
  texto('Selbetti IT Solutions',true,14); y+=24;
  texto('BODYSHOP',true,26); texto('Alocação de Profissionais · Proposta Comercial',false,14); y+=12;
  texto(m.cliente,true,18);texto(`${m.codigo ?? ''} · versão ${m.versao}`);
  for(const s of secoesPropostaBS(m)) {
    if(['Carta de apresentação','Quem somos','Objeto e escopo da alocação','Investimento','Aceite'].includes(s.titulo)) nova();
    if(y>250) nova();texto(s.titulo,true,16);
    if('investimento' in s) {
      const widths=[77,15,37,37],xs=[22,99,114,151];
      const linhaTabela=(values:string[],bold=false)=>{
        pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(9);
        const wrapped=values.map((v,i)=>pdf.splitTextToSize(v,widths[i]-4) as string[]);
        const h=Math.max(...wrapped.map(v=>v.length))*4+5;
        if(y+h>273) nova();
        wrapped.forEach((ls,i)=>{pdf.rect(xs[i],y,widths[i],h);pdf.text(ls,xs[i]+2,y+4);});y+=h;
      };
      linhaTabela(['Perfil','Qtd.','Valor Mensal Unitário','Valor Mensal Total'],true);
      m.itens.forEach(i=>linhaTabela([i.perfil,String(i.quantidade),moedaBS(i.unitario),moedaBS(i.total)]));y+=5;
    }
    s.textos.forEach(t=>texto(t)); y+=4;
  }
  return pdf.output('blob');
}