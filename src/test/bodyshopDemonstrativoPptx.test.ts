import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { preencherPptx, montarModeloPropostaPptx } from "@/lib/bodyshop/propostaPptx";
import { CONFIG_BS_PADRAO, congelar, type EntradaLinhaBS } from "@/lib/bodyshop/carrinho";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { textoSlides } from "@/lib/bodyshop/pptxTemplate";

describe("BodyShop — demonstrativo versionado", () => {
  it("o modelo novo detalha somente ISS/PIS/COFINS e preserva o total", () => {
    const entrada: EntradaLinhaBS = { linhaId:"1",cargoId:"1",cargo:"Analista",area:"TI",senioridade:"Sênior",nivelNum:3,faixa:"c3",salarioBase:10000,encargosPerc:62,indiretosPerc:5,beneficiosMensais:1000,beneficiosProporcionais:true,horasPadrao:176,horasLinha:176,regime:"integral",quantidade:1,descontoPerc:0,codigoProduto:"BS",tax:{pisPerc:1.65,cofinsPerc:7.6,issPerc:2},pisoRentabilidadePerc:null,origemParam:{},local:"Curitiba" };
    const snapshot=congelar([entrada],{rentabilidadeAlvoPerc:20,comissaoFixaPerc:7.32,retencaoPerc:5,irpjCsllPerc:10.34,encFinancPerc:0,descontoTotalPerc:0,duracaoMeses:12},CONFIG_BS_PADRAO,"u",DEFAULT_COMISSAO_TIERS);
    const modelo=montarModeloPropostaPptx({snapshot,contents:[],params:[],cliente:"Cliente",salesforce:"1",especialista:"Nome",amNome:"Nome",amEmail:"",hojeISO:"2026-11-06"});
    const zip=preencherPptx(new PizZip(readFileSync("public/templates/proposta-bodyshop-detalhada-v2.pptx")),modelo);
    const texto=textoSlides(zip);
    expect(texto).toContain("ISS 2%");
    expect(texto).toContain("PIS 1,65%");
    expect(texto).toContain("COFINS 7,6%");
    expect(modelo.demonstrativo?.precoFinal).toBeCloseTo(modelo.totalMensal,2);
    expect(texto).not.toContain("IRPJ");
  });
});