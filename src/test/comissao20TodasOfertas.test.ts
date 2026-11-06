import { describe, expect, it } from "vitest";
import { comissaoFromRent, DEFAULT_COMISSAO_TIERS as tiers } from "@/lib/comissaoRentabilidade";
import { parametrosFinanceiros } from "@/lib/pricing/parametrosCompartilhados";
import { computeLinhaBS, type EntradaLinhaBS } from "@/lib/bodyshop/carrinho";
import { composicaoSmartITO } from "@/lib/pricing/cascata";
import { aplicarDesconto, computePreco } from "@/lib/treinamento/calc";
import { computeLinha, type EntradaLinha } from "@/lib/zabbix/carrinho";
import { computeLinhaSre, type EntradaLinhaSre } from "@/lib/sre/carrinho";

const tax = { pisPerc:1.65,cofinsPerc:7.6,issPerc:2.5 };
const fixos = { ...tax,irpjCsllPerc:10.34,encFinancPerc:0,retencaoPerc:5 };
const globais = { rentabilidadeAlvoPerc:20,comissaoFixaPerc:null,...fixos,descontoTotalPerc:0,duracaoMeses:12 };
const bs: EntradaLinhaBS = {linhaId:"1",cargoId:"1",cargo:"Analista",area:"TI",senioridade:"Sênior",nivelNum:3,faixa:"c3",salarioBase:6083.740757940777,encargosPerc:62,indiretosPerc:5,beneficiosMensais:1381,beneficiosProporcionais:true,horasPadrao:176,horasLinha:176,regime:"integral",quantidade:1,descontoPerc:0,codigoProduto:"BS",tax,pisoRentabilidadePerc:10,origemParam:{}};
describe("Comissão variável com rentabilidade de 20%",()=>{
  it("BodyShop aplica 7,32% inclusive no salário fracionário informado",()=>{
    const r=computeLinhaBS(bs,globais,tiers);
    expect(r.erros).toEqual([]);expect(r.comissaoPerc).toBe(7.32);expect(r.rentabilidadePerc).toBeCloseTo(20,10);
  });
  it("Smart ITO aplica 7,32% na cascata mensal",()=>{
    const r=composicaoSmartITO(1000,{pis:tax.pisPerc,cofins:tax.cofinsPerc,iss:tax.issPerc,irpjCsll:10.34,encFinanc:0,comissao:comissaoFromRent(20,tiers),lucro:20});
    expect(r.composicao.comissao/r.precoVenda*100).toBeCloseTo(7.32,10);
  });
  it("Treinamento preserva 7,32% na chegada a 20% sem desconto",()=>{
    const p={...tax,comissaoPerc:7.32,irpjCsllPerc:10.34,encFinancPerc:0,lucroPerc:20};
    const venda=computePreco(1000,1,p,0,5);
    const r=aplicarDesconto(1000,venda.cascata.precoVenda,0,p,tiers,null,5);
    expect(r.comissaoPerc).toBe(7.32);expect(r.rentabilidadePerc).toBeCloseTo(20,10);
  });
  it("Zabbix aplica 7,32% em venda fixa com rentabilidade efetiva de 20%",()=>{
    const e: EntradaLinha={linhaId:"1",subscriptionId:"s",partNumber:"SKU",nome:"Suporte",categoria:"suporte",unidade:"un",vendaUnitaria:10000,listaUsd:null,listaBrl:4559,cambio:5,descontos:{ro:0,semRo:0,pgto30Ro:0,pgto30SemRo:0},origemDesconto:{ro:"categoria",semRo:"categoria",pgto30Ro:"categoria",pgto30SemRo:"categoria"},codigoProduto:"ZBX",tax,quantidade:1,descontoPerc:0,permiteQuantidade:true,quantidadeMaxima:null,pisoRentabilidadePerc:null};
    const r=computeLinha(e,{...globais,cenario:{temRO:false,pagamento30d:false}},tiers);
    expect(r.comissaoPerc).toBe(7.32);expect(r.rentabilidadePerc).toBeCloseTo(20,10);
  });
  it("SRE aplica 7,32% com alvo único de 20%",()=>{
    const e: EntradaLinhaSre={linhaId:"1",pacoteId:"p",partNumber:"SKU",nome:"Pacote",horasExecucao:5,pctHorasGestao:20,custoHoraExecucao:135,custoHoraGestao:135,rentabilidadeAlvoPerc:20,codigoProduto:"SRE",tax,quantidade:1,descontoPerc:0,origemParam:{}};
    const r=computeLinhaSre(e,{...globais,irpjCsllConvencao:"padrao_site",campanha:null},tiers);
    expect(r.comissaoPerc).toBe(7.32);expect(r.rentabilidadePerc).toBeCloseTo(20,10);
  });
  it("cadastro central vazio ou inválido não zera a escala de novas contas",()=>{
    expect(comissaoFromRent(20,parametrosFinanceiros({comissaoTiers:[]}).comissaoTiers)).toBe(7.32);
    expect(comissaoFromRent(20,parametrosFinanceiros({comissaoTiers:[{minRent:"20",comissao:7.32}]}).comissaoTiers)).toBe(7.32);
  });
  it("comissão fixa zero continua sendo uma escolha explícita",()=>{
    expect(computeLinhaBS(bs,{...globais,comissaoFixaPerc:0},tiers).comissaoPerc).toBe(0);
  });
});