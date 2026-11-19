import { describe, expect, it } from "vitest";
import { adicionaisEscala, calcularEscala, validarEscala, type EscalaBS } from "@/lib/bodyshop/escala";
import { custoMensalUnitario, memorialCusto, type EntradaLinhaBS } from "@/lib/bodyshop/carrinho";
const e8 = (o: Partial<EscalaBS> = {}): EscalaBS => ({ tipo: "8x5", inicio: "08:00", fim: "17:00", intervaloMin: 60, sobreaviso: null, ...o });
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
describe("escalas BodyShop", () => {
  it("8x5 diurno 08–17 com 1h de almoço = 176h e sem adicional noturno", () => { const c = adicionaisEscala(10000, e8()); expect(c.horasMes).toBe(176); expect(c.adicionalNoturno).toBe(0); });
  it("12x36 = 192h por mês", () => expect(calcularEscala({ tipo: "12x36", inicio: "07:00", fim: "19:00", intervaloMin: 60, sobreaviso: null }).horasMes).toBe(192));
  it("noturno 22–05: 7h de relógio viram 8h pagas, com 40% sobre a hora", () => {
    const c = adicionaisEscala(7040, e8({ inicio: "22:00", fim: "06:00", intervaloMin: 60 })); // 7h líquidas × 22 = 154h
    close(c.horasNoturnasRelogioMes, 7 * 22); close(c.horasNoturnasPagasMes, 8 * 22); close(c.adicionalNoturno, (7040 / 154) * 0.4 * 176);
  });
  it("12x36 noturno 19–07: 7h noturnas por plantão × 16 plantões", () => { const c = adicionaisEscala(9600, { tipo: "12x36", inicio: "19:00", fim: "07:00", intervaloMin: 60, sobreaviso: null }); close(c.horasNoturnasPagasMes, 8 * 16); close(c.adicionalNoturno, 50 * 0.4 * 128); });
  it("sobreaviso semana = 15h entre jornadas × 22 dias, pago a 1/3 da hora", () => { const c = adicionaisEscala(17600, e8({ sobreaviso: "semana" })); close(c.horasSobreavisoMes, 15 * 22); close(c.sobreaviso, 100 / 3 * 330); });
  it("sobreaviso completo soma sábado e domingo de 24h × 52/12 semanas", () => close(calcularEscala(e8({ sobreaviso: "completo" })).horasSobreavisoMes, 330 + 48 * 52 / 12));
  it("somente sábado = 24h × 52/12", () => close(calcularEscala(e8({ sobreaviso: "sabado" })).horasSobreavisoMes, 24 * 52 / 12));
  it("12x36 não aceita sobreaviso e jornada > 6h exige 1h de intervalo", () => { expect(validarEscala({ tipo: "12x36", inicio: "07:00", fim: "19:00", intervaloMin: 60, sobreaviso: "semana" }).length).toBeGreaterThan(0); expect(validarEscala(e8({ intervaloMin: 30 })).length).toBeGreaterThan(0); });
  it("adicionais recebem encargos e entram no custo", () => {
    const base: EntradaLinhaBS = { linhaId:"1",cargoId:"1",cargo:"A",area:"",senioridade:"",nivelNum:1,faixa:"c3",salarioBase:17600,encargosPerc:50,indiretosPerc:0,beneficiosMensais:0,beneficiosProporcionais:true,horasPadrao:176,horasLinha:176,regime:"integral",quantidade:1,descontoPerc:0,codigoProduto:"BS",tax:null,pisoRentabilidadePerc:null,origemParam:{} };
    const m = memorialCusto({ ...base, escala: e8({ sobreaviso: "semana" }) }); close(m.sobreaviso, 11000); close(custoMensalUnitario({ ...base, escala: e8({ sobreaviso: "semana" }) }), (17600 + 11000) * 1.5);
    expect(custoMensalUnitario(base)).toBe(17600 * 1.5);
  });
});
import { vendaHoraSobreaviso } from "@/lib/bodyshop/carrinho";
describe("venda da hora de sobreaviso", () => {
  it("é a fatia do preço proporcional ao custo do sobreaviso ÷ horas", () => {
    const entrada: EntradaLinhaBS = { linhaId:"1",cargoId:"1",cargo:"A",area:"",senioridade:"",nivelNum:1,faixa:"c3",salarioBase:17600,encargosPerc:50,indiretosPerc:0,beneficiosMensais:0,beneficiosProporcionais:true,horasPadrao:176,horasLinha:176,regime:"integral",quantidade:1,descontoPerc:0,codigoProduto:"BS",tax:null,pisoRentabilidadePerc:null,origemParam:{},escala:{ tipo:"8x5",inicio:"08:00",fim:"17:00",intervaloMin:60,sobreaviso:"semana" } };
    // custo 42900, sobreaviso 16500 com encargos; preço 85800 → 33000 ÷ 330h = 100
    close(vendaHoraSobreaviso({ entrada, precoFinal: 85800, erros: [] })!, 100);
    expect(vendaHoraSobreaviso({ entrada: { ...entrada, escala: { ...entrada.escala!, sobreaviso: null } }, precoFinal: 85800, erros: [] })).toBeNull();
  });
});
describe("profissional bilíngue", () => {
  it("acrescenta o % ao salário base antes de encargos", () => {
    const b: EntradaLinhaBS = { linhaId:"1",cargoId:"1",cargo:"A",area:"",senioridade:"",nivelNum:1,faixa:"c3",salarioBase:10000,encargosPerc:50,indiretosPerc:0,beneficiosMensais:0,beneficiosProporcionais:true,horasPadrao:176,horasLinha:176,regime:"integral",quantidade:1,descontoPerc:0,codigoProduto:"BS",tax:null,pisoRentabilidadePerc:null,origemParam:{} };
    close(custoMensalUnitario({ ...b, bilinguePerc: 20 }), 12000 * 1.5);
    close(custoMensalUnitario(b), 15000);
  });
});
import { vendaHorasExtras } from "@/lib/bodyshop/carrinho";
describe("horas extras", () => {
  const b: EntradaLinhaBS = { linhaId:"1",cargoId:"1",cargo:"A",area:"",senioridade:"",nivelNum:1,faixa:"c3",salarioBase:17600,encargosPerc:50,indiretosPerc:0,beneficiosMensais:0,beneficiosProporcionais:true,horasPadrao:176,horasLinha:176,regime:"integral",quantidade:1,descontoPerc:0,codigoProduto:"BS",tax:null,pisoRentabilidadePerc:null,origemParam:{} };
  it("10h extras a 200% da hora de R$ 100 = R$ 2.000 antes de encargos", () => { close(memorialCusto({ ...b, horasExtrasMes: 10 }).horasExtras, 2000); close(custoMensalUnitario({ ...b, horasExtrasMes: 10 }), 19600 * 1.5); });
  it("hora extra vendida = fatia do preço ÷ horas", () => { const x = vendaHorasExtras({ entrada: { ...b, horasExtrasMes: 10 }, precoFinal: 58800, erros: [] })!; close(x.totalMes, 6000); close(x.valorHora, 600); });
});
