import { useMemo } from "react";
import { useTreinamentoCadastro } from "@/hooks/useTreinamentoCadastro";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { resolveTaxRates } from "@/lib/pricing/taxRates";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { paramsFromRows } from "@/lib/treinamento/calc";
import { computeCarrinho } from "@/lib/treinamento/carrinho";
import { useCarrinhoState } from "./useCarrinhoState";

/** Resultado do carrinho atual (mesma conta do Configurador), para a Proposta. */
export function useTreinamentoResultado() {
  const cad = useTreinamentoCadastro();
  const tax = useTaxCodes();
  const st = useCarrinhoState();
  const params = useMemo(() => paramsFromRows(cad.params), [cad.params]);
  const rates = resolveTaxRates("TRN", st.config.municipio, new Date().toISOString().slice(0, 10), tax.codes, tax.rates);
  const irpj = resolveIrpjCsllPerc(st.config.convencao);
  const res = useMemo(() => computeCarrinho(
    st.linhas, cad.courses, cad.comboItems, params, st.config,
    { pisPerc: rates?.pisPerc ?? 0, cofinsPerc: rates?.cofinsPerc ?? 0, issPerc: rates?.issPerc ?? 0 }, irpj, DEFAULT_COMISSAO_TIERS,
  ), [st.linhas, st.config, cad.courses, cad.comboItems, params, rates?.pisPerc, rates?.cofinsPerc, rates?.issPerc, irpj]);
  return { cad, st, res, loading: cad.loading || tax.loading };
}
