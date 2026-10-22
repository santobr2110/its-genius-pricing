import { useReformaCBS } from "@/hooks/useReformaCBS";
import { calcPrecoReforma, fraseReforma, parcelasDeLinhas } from "@/lib/pricing/reformaTributaria";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileDown, Loader2, Stamp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBodyshopCotacoes, BS_GROUP, BS_OFFERING } from '@/hooks/useBodyshopCotacoes';
import { montarModeloPropostaBS, erroEmissaoBS, blobOriginal, moedaBS, snapshotsIguaisBS, type EmissaoBS, type ModeloPropostaBS } from '@/lib/bodyshop/proposta';
import { gerarPropostaBsPptx, montarModeloPropostaPptx, nomeArquivoPptx, contarPendenciasPptx, type ModeloPropostaPptx } from '@/lib/bodyshop/propostaPptx';
import { MIME_PPTX } from '@/lib/bodyshop/pptxTemplate';
import { computeCarrinhoBS, entradasDoSnapshot, globaisDoSnapshot } from '@/lib/bodyshop/carrinho';
import { useBodyshopResultado } from './useBodyshopResultado';
import { BS_BASE } from './useBsState';
import PropostaDoc from './PropostaDoc';
import BsResumo, { exportarResumoBsPdf } from './Resumo';

const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function baixar(blob:Blob,nome:string) {const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export default function BsProposta() {
  const {cad,st,params,loading,res}=useBodyshopResultado(); const {cbsPerc:cbsReforma}=useReformaCBS(); const cot=useBodyshopCotacoes(); const {can}=useAuth();
  const [contato,setContato]=useState(''),[email,setEmail]=useState(''),[validade,setValidade]=useState<number|null>(null),[prazo,setPrazo]=useState(''),[obs,setObs]=useState('');
  const [emitindo,setEmitindo]=useState(false),[resumo,setResumo]=useState(false),[selecionada,setSelecionada]=useState<EmissaoBS|null>(null);
  const [abrirWord,setAbrirWord]=useState(false),[wordBlob,setWordBlob]=useState<Blob|null>(null),[wordUrl,setWordUrl]=useState<string|null>(null),[simples,setSimples]=useState(false);
  const wordRef=useRef<HTMLDivElement>(null); const paths=useRef<string[]>([]);
  const salvo=cot.lista.find(c=>c.id===st.atual.id);
  const emissoes=(salvo?.payload.emissoes ?? []) as EmissaoBS[];
  const erro=erroEmissaoBS(st.snapshot,st.linhas,st.config);
  const bloqueio=!salvo?'Salve a cotação no Configurador antes de emitir.':erro;
  const modelo=useMemo(()=>{
    if(!st.snapshot || erro) return null;
    return montarModeloPropostaBS({snapshot:st.snapshot,contents:cad.contents,params:cad.params,cliente:st.atual.cliente,consultor:st.atual.especialistaBU??'',codigo:st.atual.codigo,salesforce:st.atual.salesforce??'',contato,email,versao:Math.max(0,...emissoes.map(e=>e.versao))+1,hojeISO:new Date().toISOString().slice(0,10),validadeDias:validade??params.validadeDias,prazoPagamento:prazo,observacoesExtra:obs});
  },[st.snapshot,erro,cad.contents,cad.params,st.atual,contato,email,validade,params.validadeDias,prazo,obs,emissoes]);
  const modeloPptx=useMemo<ModeloPropostaPptx|null>(()=>{
    if(!st.snapshot || erro) return null;
    try { return montarModeloPropostaPptx({snapshot:st.snapshot,contents:cad.contents,params:cad.params,cliente:st.atual.cliente,salesforce:st.atual.salesforce??'',especialista:st.atual.especialistaBU??'',amNome:st.atual.gerenteConta??'',amEmail:st.atual.gerenteContaEmail??'',reformaTributaria:fraseReforma(calcPrecoReforma(parcelasDeLinhas(res.linhas),cbsReforma),undefined,' por mês'),hojeISO:new Date().toISOString().slice(0,10)}); } catch { return null; }
  },[st.snapshot,erro,cad.contents,cad.params,st.atual,res.linhas,cbsReforma]);
  const [gerando,setGerando]=useState(false),[abrirPpt,setAbrirPpt]=useState(false),[pptUrl,setPptUrl]=useState<string|null>(null),[pptErro,setPptErro]=useState<string|null>(null),[pptBlob,setPptBlob]=useState<{blob:Blob;nome:string}|null>(null);
  const baixarPptx=async(m:ModeloPropostaPptx|null|undefined)=>{ if(!m)return; setGerando(true); try{ baixar(await gerarPropostaBsPptx(m),nomeArquivoPptx(m)); }catch(e){toast.error((e as Error).message);}finally{setGerando(false);} };
  const visualizarPptx=async(m:ModeloPropostaPptx|null|undefined)=>{
    if(!m)return; setAbrirPpt(true);setPptUrl(null);setPptErro(null);setPptBlob(null);
    try {
      const blob=await gerarPropostaBsPptx(m); setPptBlob({blob,nome:nomeArquivoPptx(m)});
      const {data}=await supabase.auth.getUser();if(!data.user)throw new Error('Sessão expirada.');
      const path=`${data.user.id}/proposta-bs-${Date.now()}.pptx`;
      const up=await supabase.storage.from('trn-previews').upload(path,blob,{contentType:MIME_PPTX,upsert:true});if(up.error)throw up.error;paths.current.push(path);
      const signed=await supabase.storage.from('trn-previews').createSignedUrl(path,600);if(signed.error||!signed.data)throw signed.error??new Error('link temporário indisponível');
      setPptUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signed.data.signedUrl)}`);
      setTimeout(()=>{void supabase.storage.from('trn-previews').remove([path]);},600000);
    }catch(e){setPptErro((e as Error).message);}
  };
  useEffect(()=>()=>{ if(paths.current.length) void supabase.storage.from('trn-previews').remove(paths.current); },[]);
  useEffect(()=>{
    if(!abrirWord||!simples||!wordBlob) return;
    let cancel=false;
    void import('docx-preview').then(async({renderAsync})=>{if(cancel||!wordRef.current)return;wordRef.current.innerHTML='';await renderAsync(wordBlob,wordRef.current,undefined,{inWrapper:true,breakPages:true,ignoreLastRenderedPageBreak:true});}).catch(e=>toast.error(e.message));
    return ()=>{cancel=true;};
  },[abrirWord,simples,wordBlob]);
  const visualizarWord=async(blob:Blob)=>{
    setAbrirWord(true);setSimples(false);setWordUrl(null);setWordBlob(blob);
    try {
      const {data}=await supabase.auth.getUser();if(!data.user)throw new Error('Sessão expirada.');
      const path=`${data.user.id}/bodyshop-${crypto.randomUUID()}.docx`;
      const up=await supabase.storage.from('trn-previews').upload(path,blob,{contentType:MIME});if(up.error)throw up.error;paths.current.push(path);
      const signed=await supabase.storage.from('trn-previews').createSignedUrl(path,600);if(signed.error||!signed.data)throw signed.error??new Error('Prévia indisponível.');
      setWordUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signed.data.signedUrl)}`);
      setTimeout(()=>{void supabase.storage.from('trn-previews').remove([path]);},600000);
    }catch(e){setSimples(true);toast.error(`Visualização Microsoft indisponível: ${(e as Error).message}`);}
  };
  const emitir=async()=>{
    if(!can('page.prof.proposal')||bloqueio||!modelo||!salvo||!st.snapshot)return;
    setEmitindo(true);
    try {
      const {data:atual,error:leitura}=await supabase.from('pricing_presets').select('payload,updated_at').eq('id',salvo.id).eq('group_slug',BS_GROUP).eq('offering_slug',BS_OFFERING).is('deleted_at',null).single();
      if(leitura)throw leitura;
      const payload=atual.payload as unknown as typeof salvo.payload;
      if(!snapshotsIguaisBS(payload.snapshot,st.snapshot))throw new Error('A cotação foi alterada em outra tela. Reabra antes de emitir.');
      const anteriores=(payload.emissoes??[]) as EmissaoBS[];
      const versao=Math.max(0,...anteriores.map(e=>e.versao))+1;
      const m:ModeloPropostaBS={...modelo,versao};
      if(!modeloPptx)throw new Error('Proposta PowerPoint indisponível para esta cotação.');
      await gerarPropostaBsPptx(modeloPptx); // valida marcadores e vazamento antes de congelar
      const res=computeCarrinhoBS(entradasDoSnapshot(st.snapshot),globaisDoSnapshot(st.snapshot),st.snapshot.tiers);
      const em:EmissaoBS={versao,emitidaEm:new Date().toISOString(),validaAte:m.dataValidade,snapshotVersao:st.snapshot.versao,modelo:m,custoTotal:res.custoTotal,rentabilidadePerc:res.rentabilidadePerc,modeloPptx};
      const {data:gravado,error}=await supabase.from('pricing_presets').update({payload:{...payload,emissoes:[...anteriores,em]} as never}).eq('id',salvo.id).eq('group_slug',BS_GROUP).eq('offering_slug',BS_OFFERING).eq('updated_at',atual.updated_at).is('deleted_at',null).select('id').maybeSingle();
      if(error)throw error;if(!gravado)throw new Error('Outra alteração ocorreu. Tente emitir novamente.');
      await cot.refresh();setSelecionada(em);toast.success(`Proposta v${versao} emitida e congelada`);
    }catch(e){toast.error((e as Error).message);}finally{setEmitindo(false);}
  };
  const exibido=selecionada?.modelo??modelo;
  const atualEmissao=selecionada??emissoes.at(-1);
  if(loading||cot.loading)return <Loader2 className="m-8 animate-spin"/>;
  return <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
    <aside className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Dados da proposta</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm">{st.atual.cliente||'Cliente não informado'}</p>
      <div><Label htmlFor="bs-contato">Contato (destinatário)</Label><Input id="bs-contato" value={contato} onChange={e=>setContato(e.target.value)}/></div>
      <div><Label htmlFor="bs-email">E-mail</Label><Input id="bs-email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <div><Label htmlFor="bs-validade">Validade (dias)</Label><Input id="bs-validade" type="number" min={1} value={validade??params.validadeDias} onChange={e=>setValidade(Math.max(1,Math.trunc(Number(e.target.value)||1)))}/></div>
      <div><Label htmlFor="bs-prazo">Prazo de pagamento</Label><Textarea id="bs-prazo" value={prazo} onChange={e=>setPrazo(e.target.value)}/></div>
      <div><Label htmlFor="bs-obs">Observações específicas</Label><Textarea id="bs-obs" value={obs} onChange={e=>setObs(e.target.value)}/></div>
      {bloqueio&&<p className="text-xs text-destructive">{bloqueio}</p>}
      {modelo&&JSON.stringify(modelo).includes('[A CONFIRMAR]')&&<p className="text-xs text-muted-foreground">Há campos [A CONFIRMAR]. Revise Conteúdo e Parâmetros, além dos dados da cotação.</p>}
      <Button className="w-full" disabled={emitindo||!!bloqueio||!can('page.prof.proposal')} onClick={emitir}>{emitindo?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<Stamp className="h-4 w-4 mr-2"/>}Emitir proposta</Button>
      {modeloPptx?.avisos.map(t=><p key={t} className="text-xs text-destructive">{t}</p>)}
      {modeloPptx&&contarPendenciasPptx(modeloPptx)>0&&<p className="text-xs rounded-md border border-primary/40 bg-muted p-2">{contarPendenciasPptx(modeloPptx)} campo(s) [A CONFIRMAR] na proposta. Revise Conteúdo, Parâmetros e os dados da cotação (ex.: e-mail do Gerente de Conta, local de alocação).</p>}
      <div className="flex gap-2"><Button variant="outline" className="flex-1" disabled={gerando||!(selecionada?.modeloPptx??modeloPptx)||!can('page.prof.proposal')} onClick={()=>baixarPptx(selecionada?.modeloPptx??modeloPptx)}>{gerando?<Loader2 className="h-4 w-4 mr-2 animate-spin"/>:<FileDown className="h-4 w-4 mr-2"/>}Baixar PPTX{selecionada?.modeloPptx?` v${selecionada.versao}`:''}</Button><Button variant="outline" size="icon" title="Visualizar PowerPoint" aria-label="Visualizar PowerPoint" disabled={!(selecionada?.modeloPptx??modeloPptx)} onClick={()=>visualizarPptx(selecionada?.modeloPptx??modeloPptx)}><Eye className="h-4 w-4"/></Button></div>
      <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={()=>{setResumo(true);setTimeout(()=>exportarResumoBsPdf('Cotacao-BodyShop.pdf').catch(e=>toast.error(e.message)),400);}}>Cotação/ROI</Button><Button variant="outline" size="icon" title="Visualizar Cotação/ROI" onClick={()=>setResumo(true)}><Eye className="h-4 w-4"/></Button></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Emissões</CardTitle></CardHeader><CardContent className="space-y-3">{!emissoes.length&&<p className="text-xs text-muted-foreground">Nenhuma versão emitida.</p>}{[...emissoes].reverse().map(em=><div key={em.versao} className="border-b pb-3 space-y-2 text-xs"><p>v{em.versao} · {new Date(em.emitidaEm).toLocaleString('pt-BR')}</p><p>{moedaBS(em.modelo.totalMensal)} / mês</p><div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={()=>setSelecionada(em)}>Ver v{em.versao}</Button>{em.modeloPptx&&<Button size="sm" variant="ghost" onClick={()=>baixarPptx(em.modeloPptx)}>PPTX v{em.versao}</Button>}{em.wordBase64&&em.nomeWord&&<Button size="sm" variant="ghost" onClick={()=>baixar(blobOriginal(em.wordBase64!,MIME),em.nomeWord!)}>Word v{em.versao}</Button>}{em.pdfBase64&&em.nomeWord&&<Button size="sm" variant="ghost" onClick={()=>baixar(blobOriginal(em.pdfBase64!,'application/pdf'),em.nomeWord!.replace(/\.docx$/,'.pdf'))}>PDF v{em.versao}</Button>}</div></div>)}</CardContent></Card>
    </aside>
    <div className="min-w-0">{selecionada&&<Button variant="ghost" onClick={()=>setSelecionada(null)}>Voltar à proposta atual</Button>}{exibido?<PropostaDoc modelo={exibido}/>:<p className="p-8 text-sm text-muted-foreground">Salve os perfis no <Link to={BS_BASE} className="text-primary underline">Configurador</Link> para preparar a proposta.</p>}</div>
    <Dialog open={resumo} onOpenChange={setResumo}><DialogContent className="max-w-5xl max-h-[90vh] overflow-auto"><DialogHeader><DialogTitle>Cotação/ROI</DialogTitle></DialogHeader><BsResumo embedded/></DialogContent></Dialog>
    <Dialog open={abrirPpt} onOpenChange={setAbrirPpt}><DialogContent className="max-w-5xl h-[90vh] flex flex-col"><DialogHeader className="pr-8"><DialogTitle>Proposta (PowerPoint)</DialogTitle></DialogHeader>{pptErro?<div className="m-auto text-center space-y-3"><p className="text-sm">Visualização exata indisponível: {pptErro}. Baixe o arquivo para conferir.</p>{pptBlob&&<Button onClick={()=>baixar(pptBlob.blob,pptBlob.nome)}><FileDown className="h-4 w-4 mr-2"/>Baixar PPTX</Button>}</div>:!pptUrl?<Loader2 className="m-auto animate-spin"/>:<iframe title="Proposta PowerPoint BodyShop" src={pptUrl} className="flex-1 w-full border rounded-md"/>}</DialogContent></Dialog>
    <Dialog open={abrirWord} onOpenChange={setAbrirWord}><DialogContent className="max-w-5xl h-[90vh] flex flex-col"><DialogHeader className="pr-8"><DialogTitle>Proposta (Word)</DialogTitle></DialogHeader><Button variant="ghost" size="sm" onClick={()=>setSimples(!simples)}>{simples?'Visualização Microsoft':'Visualização rápida'}</Button>{!simples&&!wordUrl&&<Loader2 className="m-auto animate-spin"/>}{!simples&&wordUrl&&<iframe title="Proposta Word BodyShop" src={wordUrl} className="flex-1 w-full border rounded-md"/>}{simples&&<div ref={wordRef} className="flex-1 overflow-auto"/>}</DialogContent></Dialog>
  </div>;
}