import { useMemo } from "react";
import { useTreinamentoCadastro } from "@/hooks/useTreinamentoCadastro";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { resolveTaxRates, taxPorProdutoFactory } from "@/lib/pricing/taxRates";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { paramsFromRows } from "@/lib/treinamento/calc";
import { computeCarrinho, PRODUTO_TRN } from "@/lib/treinamento/carrinho";
import { useCarrinhoState } from "./useCarrinhoState";

/** Resultado do carrinho atual (mesma conta do Configurador), para a Proposta. */
export function useTreinamentoResultado() {
  const cad = useTreinamentoCadastro();
  const tax = useTaxCodes();
  const st = useCarrinhoState();
  const params = useMemo(() => paramsFromRows(cad.params), [cad.params]);
  const rates = resolveTaxRates(st.config.codigoProduto || "TRN", st.config.municipio, new Date().toISOString().slice(0, 10), tax.codes, tax.rates);
  const irpj = resolveIrpjCsllPerc(st.config.convencao);
  const res = useMemo(() => computeCarrinho(
    st.linhas, cad.courses, cad.comboItems, params, st.config,
    { pisPerc: rates?.pisPerc ?? 0, cofinsPerc: rates?.cofinsPerc ?? 0, issPerc: rates?.issPerc ?? 0 }, irpj, DEFAULT_COMISSAO_TIERS,
    taxPorProdutoFactory(st.config.municipio, new Date().toISOString().slice(0, 10), tax.codes, tax.rates),
  ), [st.linhas, st.config, cad.courses, cad.comboItems, params, rates?.pisPerc, rates?.cofinsPerc, rates?.issPerc, irpj, tax.codes, tax.rates]);
  const municipios = useMemo(() => {
    const ids = tax.codes.filter((c) => (Object.values(params.produtos ?? PRODUTO_TRN) as string[]).includes(c.codigo)).map((c) => c.id);
    return Array.from(new Set(tax.rates.filter((r) => ids.includes(r.tax_product_code_id)).map((r) => r.municipio))).sort();
  }, [tax.codes, tax.rates, params.produtos]);
  return { cad, st, res, rates, tax, irpj, municipios, loading: cad.loading || tax.loading };
}
