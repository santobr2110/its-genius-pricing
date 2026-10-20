import { describe, expect, it } from 'vitest';
import { montarModeloPropostaBS, erroEmissaoBS, blobBase64, blobOriginal } from '@/lib/bodyshop/proposta';
import { congelar, computeCarrinhoBS, CONFIG_BS_PADRAO, type EntradaLinhaBS, type LinhaBS } from '@/lib/bodyshop/carrinho';
import { DEFAULT_COMISSAO_TIERS } from '@/lib/comissaoRentabilidade';
const linha:LinhaBS={id:'l',cargoId:'c',faixa:'c3',quantidade:2,regime:'integral',horasLinha:176,descontoPerc:0};
const entrada:EntradaLinhaBS={linhaId:'l',cargoId:'c',cargo:'Analista',area:'TI',senioridade:'Sênior',nivelNum:3,faixa:'c3',salarioBase:10000,encargosPerc:62,indiretosPerc:5,beneficiosMensais:1381,beneficiosProporcionais:true,horasPadrao:176,horasLinha:176,regime:'integral',quantidade:2,descontoPerc:0,codigoProduto:'BS',tax:{pisPerc:1.65,cofinsPerc:7.6,issPerc:2},pisoRentabilidadePerc:null,origemParam:{}};
const g={rentabilidadeAlvoPerc:20,comissaoFixaPerc:7.32,retencaoPerc:5,irpjCsllPerc:10.3,encFinancPerc:0,descontoTotalPerc:0,duracaoMeses:12};
const snapshot=congelar([entrada],g,CONFIG_BS_PADRAO,'u',DEFAULT_COMISSAO_TIERS);
const modelo=()=>montarModeloPropostaBS({snapshot,contents:[],params:[],cliente:'Cliente',contato:'Contato',email:'',consultor:'Consultor',codigo:'BS-1',salesforce:'123',versao:1,hojeISO:'2026-10-20',validadeDias:15});
describe('BodyShop Fase 5',()=>{
  it('investimento usa os dois perfis e os totais mensais e contratuais do snapshot',()=>{
    const m=modelo(),res=computeCarrinhoBS([entrada],g,DEFAULT_COMISSAO_TIERS);
    expect(m.itens[0].quantidade).toBe(2);expect(m.totalMensal).toBe(res.precoFinalTotalMensal);expect(m.totalContrato).toBe(res.precoFinalTotalContrato);expect(m.itens[0].unitario*2).toBe(m.totalMensal);
  });
  it('emissão bloqueia snapshot ausente',()=>expect(erroEmissaoBS(null,[linha],CONFIG_BS_PADRAO)).not.toBeNull());
  it('emissão bloqueia alterações não salvas',()=>expect(erroEmissaoBS(snapshot,[{...linha,quantidade:3}],CONFIG_BS_PADRAO)).not.toBeNull());
  it('emissão bloqueia erros no configurador congelado',()=>expect(erroEmissaoBS({...snapshot,itens:snapshot.itens.map(i=>({...i,pisPerc:null}))},[linha],CONFIG_BS_PADRAO)).not.toBeNull());
  it('emissão aceita snapshot íntegro',()=>expect(erroEmissaoBS(snapshot,[linha],CONFIG_BS_PADRAO)).toBeNull());
  it('conteúdo ausente começa vazio e marcado a confirmar',()=>{expect(modelo().blocos[0].campos.every(c=>c.texto==='[A CONFIRMAR]')).toBe(true);expect(modelo().blocos[0].aConfirmar).toBe(true);});
  it('a validade de 15 dias termina em 4 de novembro',()=>expect(modelo().dataValidade).toBe('2026-11-04'));
  it('arquivo original permanece byte idêntico ao recuperar versão',async()=>{const original=new Blob([new Uint8Array([0,255,65,128,32])]);const base64=await blobBase64(original);expect(new Uint8Array(await blobOriginal(base64,'application/pdf').arrayBuffer())).toEqual(new Uint8Array([0,255,65,128,32]));});
});