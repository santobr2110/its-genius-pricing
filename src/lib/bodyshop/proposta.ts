import { computeCarrinhoBS, entradasDoSnapshot, globaisDoSnapshot, mesmasEntradas, type SnapshotBS, type LinhaBS, type ConfigBS } from './carrinho';
import type { BodyshopContent } from './calc';

export const A_CONFIRMAR = '[A CONFIRMAR]';
const texto = (v: unknown) => String(v ?? '').trim() || A_CONFIRMAR;
export interface ModeloPropostaBS {
  layoutVersao: 1 | 2; cliente: string; contato: string; email: string; consultor: string;
  codigo: string | null; salesforce: string; versao: number; cidade: string; dataEmissao: string; dataValidade: string;
  validadeDias: number; duracaoMeses: number; dataInicio: string; regime: string; prazoPagamento: string;
  quemSomos: string; numeros: string[]; objeto: string; reajusteIndice: string; observacoes: string;
  textoTributario: string; dadosFaturamento: string[];
  blocos: { id: string; titulo: string; aConfirmar: boolean; campos: { label: string; texto: string }[] }[];
  itens: { id: string; perfil: string; quantidade: number; regime: string; unitario: number; total: number }[];
  totalMensal: number; totalContrato: number;
}
export interface EmissaoBS {
  versao: number; emitidaEm: string; validaAte: string; snapshotVersao: number;
  modelo: ModeloPropostaBS; custoTotal: number; rentabilidadePerc: number;
  /** Original bytes, not a reconstruction against a future template. */
  wordBase64: string; pdfBase64: string; nomeWord: string;
}
export function erroEmissaoBS(snapshot: SnapshotBS | null | undefined, linhas: LinhaBS[], config: ConfigBS): string | null {
  if (!snapshot || !mesmasEntradas(snapshot, linhas, config)) return 'Salve a cotação no Configurador para congelar os valores antes de emitir.';
  const res = computeCarrinhoBS(entradasDoSnapshot(snapshot), globaisDoSnapshot(snapshot), snapshot.tiers);
  if (!res.linhas.length || res.temErros) return 'Corrija os erros do Configurador antes de emitir.';
  return null;
}
export function montarModeloPropostaBS(a: {
  snapshot: SnapshotBS; contents: BodyshopContent[]; params: { key: string; value: unknown }[];
  cliente: string; contato: string; email: string; consultor: string; codigo: string | null; salesforce: string;
  versao: number; hojeISO: string; validadeDias: number; prazoPagamento?: string; observacoesExtra?: string;
}): ModeloPropostaBS {
  const p = new Map(a.params.map(r => [r.key, r.value]));
  const res = computeCarrinhoBS(entradasDoSnapshot(a.snapshot), globaisDoSnapshot(a.snapshot), a.snapshot.tiers);
  if (!res.linhas.length || res.temErros) throw new Error('Snapshot inválido para emissão.');
  const campos = [{k:'descricao',label:'Descrição'}, {k:'atividades',label:'Atividades'}, {k:'competencias',label:'Competências'}, {k:'formacao',label:'Formação'}, {k:'certificacoes',label:'Certificações'}, {k:'entregaveis',label:'Entregáveis'}, {k:'pre_requisitos',label:'Pré-requisitos'}] as const;
  const itens = res.linhas.map(l => ({ id:l.entrada.linhaId, perfil:`${l.entrada.cargo} · ${l.entrada.senioridade}`, quantidade:l.entrada.quantidade,
    regime:l.entrada.regime === 'integral' ? 'Integral' : 'Meio período', unitario:l.precoFinal/l.entrada.quantidade, total:l.precoFinal }));
  const ids = [...new Set(res.linhas.map(l => l.entrada.cargoId))];
  const blocos = ids.map(id => {
    const e = res.linhas.find(l => l.entrada.cargoId === id)?.entrada;
    const c = a.contents.find(c => c.cargo_id === id);
    return { id, titulo:`${e?.cargo} · ${e?.senioridade}`, aConfirmar:c?.a_confirmar ?? true, campos:campos.map(f => ({label:f.label, texto:texto(c?.[f.k])})) };
  });
  const lista = (key: string) => texto(p.get(key)).split(/\n+/).filter(Boolean);
  const dataValidade = new Date(new Date(a.hojeISO+'T12:00:00Z').getTime()+a.validadeDias*86400000).toISOString().slice(0,10);
  return { layoutVersao:1, cliente:texto(a.cliente), contato:texto(a.contato), email:a.email, consultor:texto(a.consultor), codigo:a.codigo, salesforce:a.salesforce,
    versao:a.versao, cidade:texto(p.get('proposta_cidade')), dataEmissao:a.hojeISO, dataValidade, validadeDias:a.validadeDias,
    duracaoMeses:a.snapshot.duracaoMeses, dataInicio:a.snapshot.dataInicio ?? A_CONFIRMAR, regime:[...new Set(itens.map(i=>i.regime))].join(' / '),
    prazoPagamento:texto(a.prazoPagamento?.trim() || p.get('proposta_prazo_pagamento')), quemSomos:texto(p.get('proposta_quem_somos')), numeros:lista('proposta_numeros'),
    objeto:`Alocação de profissionais por ${a.snapshot.duracaoMeses} meses. ${texto(p.get('proposta_objeto'))}`,
    reajusteIndice:texto(p.get('reajuste_indice')), observacoes:[a.observacoesExtra?.trim(), texto(p.get('proposta_observacoes'))].filter(Boolean).join('\n\n'),
    textoTributario:texto(p.get('proposta_texto_tributario')), dadosFaturamento:lista('proposta_dados_faturamento'), blocos,itens,
    totalMensal:res.precoFinalTotalMensal,totalContrato:res.precoFinalTotalContrato };
}
export function nomeArquivoBS(m: ModeloPropostaBS) {
  const limpar = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_');
  return `${limpar(m.cliente)}_OP${limpar(m.salesforce || 'sem-op')}_BodyShop_${m.dataEmissao.split('-').reverse().join('')}.docx`;
}
export async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i=0;i<bytes.length;i+=8192) s += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(s);
}
export function blobOriginal(base64: string, mime: string): Blob {
  return new Blob([Uint8Array.from(atob(base64), c=>c.charCodeAt(0))], {type:mime});
}