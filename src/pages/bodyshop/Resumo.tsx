import { useReformaCBS } from "@/hooks/useReformaCBS";
import { calcPrecoReforma, parcelasDeLinhas, textoPrecoReforma, REFORMA_VIGENCIA } from "@/lib/pricing/reformaTributaria";
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import selbettiLogo from '@/assets/selbetti-logo.png.asset.json';
import { resultadoOperacaoBS } from '@/lib/bodyshop/financeiro';
import { brl } from '@/lib/bodyshop/calc';
import { useBodyshopResultado } from './useBodyshopResultado';
import { BS_BASE } from './useBsState';
const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
export async function exportarResumoBsPdf(nomeArquivo: string) {
  const el = document.getElementById('bs-resumo-printable');
  if (!el) throw new Error('Resumo indisponível.');
  await document.fonts.ready;
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: getComputedStyle(el).backgroundColor });
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const pageHeight = Math.floor(canvas.width * 297 / 210);
  // Slice on row boundaries so a detail note never straddles pages.
  const box = el.getBoundingClientRect();
  const breaks = [...el.querySelectorAll('tr')].map(r => Math.floor((r.getBoundingClientRect().top - box.top) * canvas.height / box.height));
  let top = 0, page = 0;
  while (top < canvas.height) {
    let bottom = Math.min(top + pageHeight, canvas.height);
    if (bottom < canvas.height) {
      const safe = breaks.filter(b => b > top + pageHeight * .5 && b <= bottom).pop();
      if (safe) bottom = safe;
    }
    const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = bottom - top;
    const ctx = slice.getContext('2d'); if (!ctx) throw new Error('Não foi possível gerar o PDF.');
    ctx.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    if (page++) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, 210, slice.height * 210 / canvas.width, undefined, 'FAST');
    top = bottom;
  }
  pdf.save(nomeArquivo);
}
export default function BsResumo({ embedded = false }: { embedded?: boolean }) {
  const { st, res, congeladoIntacto, loading, error } = useBodyshopResultado();
  const { can } = useAuth(); const [exportando, setExportando] = useState(false);
  const ok = res.linhas.filter(l => !l.erros.length && l.fixos);
  if (embedded && (loading || !ok.length)) return null;
  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <p className="text-destructive">{error instanceof Error ? error.message : error}</p>;
  if (!ok.length) return <div className="p-12 flex flex-col items-center text-center gap-3"><FileText className="h-12 w-12 text-muted-foreground" /><h2 className="text-xl font-bold">Nenhum item na cotação</h2><p className="text-sm text-muted-foreground">Adicione cargos no <Link to={BS_BASE} className="text-primary underline">Configurador</Link>.</p></div>;
  const r = resultadoOperacaoBS(res), meses = res.cascataBase.duracaoMeses;
  const config = congeladoIntacto && st.snapshot ? st.snapshot : st.config;
  const condicao = `${meses} meses · início ${config.dataInicio ? new Date(config.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'a definir'} · ${config.municipio}`;
  const Field = ({ label, value }: { label: string; value?: string | null }) => <div className="flex gap-2 text-sm min-w-0"><span className="font-bold shrink-0">{label}</span><span className="break-words min-w-0">{value || '—'}</span></div>;
  const cell = 'border border-border px-2 py-1.5 align-top';
  const head = cell + ' font-bold bg-muted';
  const exportar = async () => { setExportando(true); try { await exportarResumoBsPdf(`${st.atual.codigo || 'resumo-bodyshop'}-${new Date().toISOString().slice(0, 10)}.pdf`); } catch(e) { toast.error((e as Error).message); } finally { setExportando(false); } };
  return <div className="space-y-4 min-w-0"><div className={embedded ? 'hidden' : 'flex flex-wrap items-center gap-2'}><h2 className="text-lg font-semibold flex gap-2 items-center"><FileText className="h-5 w-5 text-primary" />Resumo de Cotação</h2><Button size="sm" className="ml-auto gap-1.5 text-xs" disabled={!can('page.prof.proposal') || exportando} onClick={exportar}>{exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}Exportar PDF</Button></div>{res.temErros && <p className="text-xs text-destructive">Itens com erro não entram neste resumo.</p>}<div className="overflow-x-auto max-w-full"><div id="bs-resumo-printable" className="bs-resumo-printable bg-background text-foreground rounded-md shadow-sm p-10 mx-auto w-[210mm]"><div className="flex items-start justify-between mb-8"><img src={selbettiLogo.url} alt="Selbetti" className="h-12 w-auto" crossOrigin="anonymous" /><div className="text-3xl font-bold">Resumo de Cotação</div></div><div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8"><Field label="Cliente:" value={st.atual.cliente} /><Field label="Gerente de Contas:" value={st.atual.gerenteConta} /><Field label="Data:" value={new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} /><Field label="Especialista:" value={st.atual.especialistaBU} /><Field label="Arquiteto:" value={st.atual.arquitetoBU} /><Field label="Nº da Oportunidade:" value={st.atual.salesforce} /><Field label="Nº da Cotação:" value={st.atual.codigo} /><Field label="Valores:" value={congeladoIntacto && st.snapshot ? `congelados em ${new Date(st.snapshot.congeladoEm).toLocaleDateString('pt-BR')} · versão ${st.snapshot.versao}` : 'parâmetros atuais'} /></div><p className="text-sm mb-8"><strong>Condição comercial:</strong> {condicao}</p><h2 className="text-center text-xl font-bold mb-4">Taxas e Impostos</h2><div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8"><Field label="Investimento Mensal:" value={brl(r.venda)} /><Field label="Impostos (incl. IR/CSLL):" value={brl(r.impostos + r.ir)} /><Field label="Investimento Contrato:" value={brl(res.precoFinalTotalContrato)} /><Field label={`Mensal a partir de ${REFORMA_VIGENCIA}:`} value={textoPrecoReforma(calcPrecoReforma(parcelasDeLinhas(res.linhas), cbsReforma))} /><Field label="Comercial:" value={brl(r.comissao)} /><Field label="Financeiro:" value={brl(r.financeiro)} /><Field label="Retenção:" value={brl(r.retencao)} /><Field label="Custo Mensal:" value={brl(r.custo)} /></div><h2 className="text-center text-xl font-bold mb-4">Rentabilidade</h2><div className="grid grid-cols-2 mb-10"><div className="text-center"><div className="text-3xl font-bold">{brl(r.lucro)}</div><div>Líquido mensal</div><div className="text-xs mt-1">Contrato: {brl(res.lucroTotalContrato)}</div></div><div className="text-center"><div className="text-3xl font-bold">{pct(res.rentabilidadePerc)}</div><div>Percentual</div></div></div><p className="text-[11px] mb-2"><strong>Município de prestação:</strong> {config.municipio} · <strong>IR/CSLL:</strong> {pct(res.cascataBase.irpjCsllPerc)} · <strong>Enc. financeiro:</strong> {pct(res.cascataBase.encFinancPerc)}</p><table className="w-full text-[10px] border-collapse table-fixed"><thead><tr><th className={head + ' text-left w-[23%]'}>Cargo</th><th className={head + ' text-left w-[11%]'}>Senioridade</th><th className={head + ' w-[7%]'}>Faixa</th><th className={head + ' w-[6%]'}>Qtd.</th><th className={head + ' text-right'}>Valor Mensal Unitário</th><th className={head + ' text-right'}>Valor Mensal Total</th><th className={head + ' text-right'}>Valor do Contrato</th></tr></thead><tbody>{ok.map(l => { const e = l.entrada, f = l.fixos; if (!f) return null; const nota: [string, string][] = [['Produto fiscal', e.codigoProduto], ['PIS', pct(f.pisPerc)], ['COFINS', pct(f.cofinsPerc)], ['ISS', pct(f.issPerc)], ['Salário base', brl(e.salarioBase)], ['Encargos', pct(e.encargosPerc)], ['Benefícios', brl(e.beneficiosMensais)], ['Indiretos', pct(e.indiretosPerc)], ['Horas mensais', `${e.horasLinha}/${e.horasPadrao}`], ['Custo unitário', brl(l.custoUnitario)], ['Custo da linha', brl(l.custoLinha)], ['Comissão', pct(l.comissaoPerc)], ['Retenção', pct(f.retencaoPerc)], ['Desconto', pct(l.descontoEfetivoPerc)], ['Rentabilidade', pct(l.rentabilidadePerc)]]; return <Fragment key={e.linhaId}><tr><td className={cell + ' break-words'}>{e.cargo}</td><td className={cell}>{e.senioridade}</td><td className={cell + ' text-center'}>{e.faixa.toUpperCase()}</td><td className={cell + ' text-right'}>{e.quantidade}</td><td className={cell + ' text-right'}>{brl(l.precoFinal / e.quantidade)}</td><td className={cell + ' text-right font-semibold'}>{brl(l.precoFinal)}</td><td className={cell + ' text-right'}>{brl(l.precoFinal * meses)}</td></tr><tr><td className={cell + ' text-[9px]'} colSpan={7}><div className="grid grid-cols-3 gap-x-4 gap-y-0.5">{nota.map(([k,v]) => <span className="break-words" key={k}><strong>{k}:</strong> {v}</span>)}</div></td></tr></Fragment>; })}<tr><td className={cell + ' font-bold'} colSpan={5}>Total</td><td className={cell + ' text-right font-bold'}>{brl(res.precoFinalTotalMensal)}</td><td className={cell + ' text-right font-bold'}>{brl(res.precoFinalTotalContrato)}</td></tr></tbody></table></div></div></div>;
}
