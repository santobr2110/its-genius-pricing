import { describe, expect, it } from "vitest";
import { assinaturaTreinamento, resultadoTreinamentoCongelado } from "@/lib/treinamento/congelamento";
import { CONFIG_PADRAO, type CarrinhoResultado, type LinhaCarrinho } from "@/lib/treinamento/carrinho";
describe("Treinamento — impostos congelados", () => {
  const linhas: LinhaCarrinho[] = [{ id:"1",courseId:"c",modalidade:"turma_aberta",alunos:1,somenteExame:false,locacao:false,diarias:null,descontoPerc:0 }];
  const resultado = { precoFinalTotal:1000, linhas:[{ precoFinal:1000,tax:{issPerc:5,pisPerc:0.65,cofinsPerc:3} }] } as CarrinhoResultado;
  const config = { ...CONFIG_PADRAO, resultadoCongelado:{assinatura:assinaturaTreinamento(linhas,CONFIG_PADRAO),resultado} };
  it("preserva preço e alíquotas salvos", () => {
    expect(resultadoTreinamentoCongelado(linhas,config)?.precoFinalTotal).toBe(1000);
    expect(resultadoTreinamentoCongelado(linhas,config)?.linhas[0].tax?.issPerc).toBe(5);
  });
  it("edição explícita deixa de usar resultado anterior", () => {
    expect(resultadoTreinamentoCongelado([{...linhas[0],descontoPerc:10}],config)).toBeNull();
  });
  it("histórico sem dados permanece sem demonstrativo congelado", () => {
    expect(resultadoTreinamentoCongelado(linhas,CONFIG_PADRAO)).toBeNull();
  });
});