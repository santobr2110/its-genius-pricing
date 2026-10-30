import { useMemo } from "react";
import { useSreCadastro } from "@/hooks/useSreCadastro";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { taxPorProdutoFactory } from "@/lib/pricing/taxRates";
import { useParametrosFinanceiros } from "@/hooks/useParametrosFinanceiros";
import { paramsFromRows } from "@/lib/sre/calc";
import {
  campanhaVigente, computeCarrinhoSre, diferencasParametrosSre, entradasDoSnapshot, globaisDoSnapshot, mesmasEntradasSre, montarEntradas,
  type GlobaisSre,
} from "@/lib/sre/carrinho";
import { useSreState } from "./useSreState";

/** Resultado da cotação aberta: caminho congelado quando há snapshot intacto; caso contrário, catálogo vivo. */
export function useSreResultado() {
  const cad = useSreCadastro();
  const tax = useTaxCodes();
  const st = useSreState();
  const central = useParametrosFinanceiros();
  const params = useMemo(() => paramsFromRows(cad.params), [cad.params]);
  const hoje = new Date().toISOString().slice(0, 10);
  const campanha = useMemo(() => campanhaVigente(cad.campanhas, hoje), [cad.campanhas, hoje]);

  const rentabilidadeCotacao = st.config.rentabilidadePerc ?? params.rentabilidadePadraoPerc;
  const globaisVivos: GlobaisSre = useMemo(() => ({
    comissaoFixaPerc: params.comissaoFixaPerc, retencaoPerc: params.retencaoPerc,
    irpjCsllPerc: central.irpjCsllPerc, irpjCsllConvencao: params.irpjCsllConvencao,
    encFinancPerc: st.config.encFinancPerc ?? params.encFinancPerc,
    descontoTotalPerc: st.config.descontoTotalPerc || 0, campanha,
  }), [st.config, params, central.irpjCsllPerc, campanha]);

  const entradasVivas = useMemo(
    () => montarEntradas(st.linhas, cad.pacotes, params, taxPorProdutoFactory(st.config.municipio, hoje, tax.codes, tax.rates), rentabilidadeCotacao),
    [rentabilidadeCotacao, st.linhas, cad.pacotes, params, st.config.municipio, hoje, tax.codes, tax.rates],
  );
  const vivo = useMemo(() => computeCarrinhoSre(entradasVivas, globaisVivos, central.comissaoTiers), [entradasVivas, globaisVivos, central.comissaoTiers]);

  const congeladoIntacto = !!st.snapshot && mesmasEntradasSre(st.snapshot, st.linhas, st.config);
  const congelado = useMemo(
    () => (st.snapshot ? computeCarrinhoSre(entradasDoSnapshot(st.snapshot), globaisDoSnapshot(st.snapshot), st.snapshot.comissaoTiers) : null),
    [st.snapshot],
  );
  const diffs = useMemo(
    () => (st.snapshot ? diferencasParametrosSre(st.snapshot, entradasVivas, globaisVivos, central.comissaoTiers) : []),
    [st.snapshot, entradasVivas, globaisVivos, central.comissaoTiers],
  );

  const res = congeladoIntacto && congelado ? congelado : vivo;
  const globais = congeladoIntacto && st.snapshot ? globaisDoSnapshot(st.snapshot) : globaisVivos;

  const municipios = useMemo(() => {
    const usados = new Set([params.produtoPadrao, ...cad.pacotes.map((p) => p.codigo_produto).filter(Boolean)]);
    const ids = tax.codes.filter((c) => usados.has(c.codigo)).map((c) => c.id);
    return Array.from(new Set(tax.rates.filter((r) => ids.includes(r.tax_product_code_id)).map((r) => r.municipio))).sort();
  }, [tax.codes, tax.rates, params.produtoPadrao, cad.pacotes]);

  return {
    cad, tax, st, params, res, vivo, congelado, congeladoIntacto, globais, globaisVivos, entradasVivas, rentabilidadeCotacao, diffs, municipios, tiersVivos: central.comissaoTiers,
    loading: cad.loading || tax.loading || central.loading,
  };
}
