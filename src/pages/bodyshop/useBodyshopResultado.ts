import { useMemo } from "react";
import { useBodyshopCadastro } from "@/hooks/useBodyshopCadastro";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { useITSMContext } from "@/contexts/ITSMContext";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { taxPorProdutoFactory } from "@/lib/pricing/taxRates";
import { computeCarrinhoBS, montarEntradas, entradasDoSnapshot, globaisDoSnapshot, mesmasEntradas, diferencasParametros, type GlobaisBS } from "@/lib/bodyshop/carrinho";
import { useBSState } from "./useBsState";

export function useBodyshopResultado() {
  const cad = useBodyshopCadastro(), tax = useTaxCodes(), st = useBSState();
  const { comissaoTiers: tiers } = useITSMContext();
  const params = cad.p;
  const hoje = new Date().toISOString().slice(0, 10);
  const globaisVivos: GlobaisBS = useMemo(() => ({ rentabilidadeAlvoPerc: st.config.rentabilidadeAlvoPerc ?? params.rentabilidadeAlvoPerc,
    comissaoFixaPerc: params.comissaoFixaPerc, retencaoPerc: params.retencaoPerc,
    irpjCsllPerc: resolveIrpjCsllPerc(st.config.convencao, { roiPerc: st.config.rentabilidadeAlvoPerc ?? params.rentabilidadeAlvoPerc }),
    encFinancPerc: st.config.encFinancPerc ?? params.encFinancPerc, descontoTotalPerc: st.config.descontoTotalPerc,
    duracaoMeses: st.config.duracaoMeses }), [st.config, params]);
  const entradasVivas = useMemo(() => montarEntradas(st.linhas, cad.cargos, params, taxPorProdutoFactory(st.config.municipio, hoje, tax.codes, tax.rates)), [st.linhas, cad.cargos, params, st.config.municipio, hoje, tax.codes, tax.rates]);
  const vivo = useMemo(() => computeCarrinhoBS(entradasVivas, globaisVivos, tiers), [entradasVivas, globaisVivos, tiers]);
  const congelado = useMemo(() => st.snapshot ? computeCarrinhoBS(entradasDoSnapshot(st.snapshot), globaisDoSnapshot(st.snapshot), st.snapshot.tiers ?? tiers) : null, [st.snapshot, tiers]);
  const congeladoIntacto = !!st.snapshot && mesmasEntradas(st.snapshot, st.linhas, st.config);
  const diffs = useMemo(() => st.snapshot ? diferencasParametros(st.snapshot, entradasVivas, globaisVivos, tiers) : [], [st.snapshot, entradasVivas, globaisVivos, tiers]);
  const usados = new Set([params.produtoPadrao, ...cad.cargos.map(c => c.codigo_produto)]);
  const ids = tax.codes.filter(c => usados.has(c.codigo)).map(c => c.id);
  const municipios = Array.from(new Set([st.config.municipio, ...tax.rates.filter(r => ids.includes(r.tax_product_code_id)).map(r => r.municipio)])).sort();
  return { cad, tax, st, params, tiers, globaisVivos, entradasVivas, vivo, congelado, congeladoIntacto, diffs, municipios,
    res: congeladoIntacto && congelado ? congelado : vivo, loading: cad.loading || tax.loading, error: cad.error || tax.error };
}