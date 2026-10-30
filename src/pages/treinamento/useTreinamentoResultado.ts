import { useMemo } from "react";
import { useTreinamentoCadastro } from "@/hooks/useTreinamentoCadastro";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { resolveTaxRates, taxPorProdutoFactory } from "@/lib/pricing/taxRates";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { useParametrosFinanceiros } from "@/hooks/useParametrosFinanceiros";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { paramsFromRows } from "@/lib/treinamento/calc";
import { computeCarrinho, PRODUTO_TRN } from "@/lib/treinamento/carrinho";
import { useCarrinhoState } from "./useCarrinhoState";

/** Resultado do carrinho atual (mesma conta do Configurador), para a Proposta. */
export function useTreinamentoResultado() {
  const cad = useTreinamentoCadastro();
  const tax = useTaxCodes();
  const st = useCarrinhoState();
  const central = useParametrosFinanceiros();
  const params = useMemo(() => paramsFromRows(cad.params), [cad.params]);
  // Cascata base: SKU da Turma Aberta configurado no Financeiro (o código legado "TRN" não existe mais no cadastro).
  const codigoBase = st.config.codigoProduto && st.config.codigoProduto !== "TRN" && tax.codes.some((c) => c.codigo === st.config.codigoProduto)
    ? st.config.codigoProduto
    : (params.produtos?.turmaAberta ?? PRODUTO_TRN.turmaAberta);
  const rates = resolveTaxRates(codigoBase, st.config.municipio, new Date().toISOString().slice(0, 10), tax.codes, tax.rates);
  const irpj = st.atual.id ? (st.config.irpjCsllPerc ?? resolveIrpjCsllPerc(st.config.convencao)) : central.irpjCsllPerc;
  const tiers = st.atual.id ? (st.config.comissaoTiers ?? DEFAULT_COMISSAO_TIERS) : central.comissaoTiers;
  const res = useMemo(() => computeCarrinho(
    st.linhas, cad.courses, cad.comboItems, params, st.config,
    { pisPerc: rates?.pisPerc ?? 0, cofinsPerc: rates?.cofinsPerc ?? 0, issPerc: rates?.issPerc ?? 0 }, irpj, tiers,
    taxPorProdutoFactory(st.config.municipio, new Date().toISOString().slice(0, 10), tax.codes, tax.rates),
  ), [st.linhas, st.config, cad.courses, cad.comboItems, params, rates?.pisPerc, rates?.cofinsPerc, rates?.issPerc, irpj, tiers, tax.codes, tax.rates]);
  const municipios = useMemo(() => {
    const ids = tax.codes.filter((c) => (Object.values(params.produtos ?? PRODUTO_TRN) as string[]).includes(c.codigo)).map((c) => c.id);
    return Array.from(new Set(tax.rates.filter((r) => ids.includes(r.tax_product_code_id)).map((r) => r.municipio))).sort();
  }, [tax.codes, tax.rates, params.produtos]);
  return { cad, st, res, rates, tax, irpj, tiers, municipios, loading: cad.loading || tax.loading || central.loading };
}
