import { describe, it, expect } from "vitest";
import { campanhasSobrepostas, paramsFromRows, resolvePacote, type SreCampanha } from "@/lib/sre/calc";

describe("SRE paramsFromRows", () => {
  it("usa defaults quando a chave não existe e Escala Selbetti com comissão vazia", () => {
    const p = paramsFromRows([]);
    expect(p.custoHoraExecucao).toBe(135);
    expect(p.pctHorasGestao).toBe(20);
    expect(p.retencaoPerc).toBe(5);
    expect(p.produtoPadrao).toBe("SRE");
    expect(p.comissaoFixaPerc).toBeNull();
    expect(p.validadeHorasMeses).toBeNull();
  });
});

describe("SRE herança do pacote", () => {
  const prm = paramsFromRows([]);
  it("NULL herda o parâmetro geral", () => {
    const r = resolvePacote({ pct_horas_gestao: null, custo_hora_execucao: null, custo_hora_gestao: null, codigo_produto: null }, prm);
    expect(r.pctHorasGestao).toBe(20);
    expect(r.codigoProduto).toBe("SRE");
    expect(r.origem.pctHorasGestao).toBe("parametro");
  });
  it("0 é exceção real do pacote", () => {
    const r = resolvePacote({ pct_horas_gestao: 0, custo_hora_execucao: null, custo_hora_gestao: null, codigo_produto: null }, prm);
    expect(r.pctHorasGestao).toBe(0);
    expect(r.origem.pctHorasGestao).toBe("pacote");
  });
});

describe("SRE campanhas sobrepostas", () => {
  const base: SreCampanha = { id: "a", nome: "A", desconto_perc: 12, vigencia_inicio: "2026-01-01", vigencia_fim: "2026-03-31", ativo: true, observacao: null, a_confirmar: false };
  it("bloqueia campanha ativa que cruza o período de outra ativa", () => {
    expect(campanhasSobrepostas({ id: "b", ativo: true, vigencia_inicio: "2026-03-01", vigencia_fim: null }, [base])).toHaveLength(1);
  });
  it("permite períodos sem interseção ou campanha inativa", () => {
    expect(campanhasSobrepostas({ id: "b", ativo: true, vigencia_inicio: "2026-04-01", vigencia_fim: null }, [base])).toHaveLength(0);
    expect(campanhasSobrepostas({ id: "b", ativo: false, vigencia_inicio: "2026-02-01", vigencia_fim: null }, [base])).toHaveLength(0);
  });
});
