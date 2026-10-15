import { useMemo } from "react";
import { useZabbixCadastro } from "@/hooks/useZabbixCadastro";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { taxPorProdutoFactory } from "@/lib/pricing/taxRates";
import { resolveIrpjCsllPerc } from "@/lib/pricing/cascata";
import { DEFAULT_COMISSAO_TIERS } from "@/lib/comissaoRentabilidade";
import { paramsFromRows } from "@/lib/zabbix/calc";
import {
  computeCarrinhoZbx, diferencasParametros, entradasDoSnapshot, globaisDoSnapshot, montarEntradas,
  type ConfigZbx, type GlobaisZbx, type LinhaZbx, type SnapshotZbx,
} from "@/lib/zabbix/carrinho";
import { useZbxState } from "./useZbxState";

/** A cotação aberta ainda é exatamente a que foi congelada (mesmos itens e condições)? */
export function mesmasEntradas(s: SnapshotZbx, linhas: LinhaZbx[], c: ConfigZbx): boolean {
  if (s.municipio !== c.municipio || s.cenario.temRO !== c.temRO || s.cenario.pagamento30d !== c.pagamento30d) return false;
  if ((s.descontoTotalPerc ?? 0) !== (c.descontoTotalPerc || 0)) return false;
  if (c.encFinancPerc != null && c.encFinancPerc !== s.encFinancPerc) return false;
  if (s.itens.length !== linhas.length) return false;
  return s.itens.every((i, k) => {
    const l = linhas[k];
    return l && l.id === i.linhaId && l.subscriptionId === i.subscriptionId && l.quantidade === i.quantidade && (l.descontoPerc || 0) === (i.descontoPerc || 0);
  });
}

/** Resultado da cotação aberta: caminho congelado quando há snapshot intacto; caso contrário, catálogo vivo. */
export function useZabbixResultado() {
  const cad = useZabbixCadastro();
  const tax = useTaxCodes();
  const st = useZbxState();
  const params = useMemo(() => paramsFromRows(cad.params), [cad.params]);
  const hoje = new Date().toISOString().slice(0, 10);

  const globaisVivos: GlobaisZbx = useMemo(() => ({
    cenario: { temRO: st.config.temRO, pagamento30d: st.config.pagamento30d },
    comissaoFixaPerc: params.comissaoFixaPerc, retencaoPerc: params.retencaoPerc,
    irpjCsllPerc: resolveIrpjCsllPerc(st.config.convencao), encFinancPerc: st.config.encFinancPerc ?? params.encFinancPerc,
    descontoTotalPerc: st.config.descontoTotalPerc || 0,
  }), [st.config, params]);

  const entradasVivas = useMemo(
    () => montarEntradas(st.linhas, cad.subs, params, taxPorProdutoFactory(st.config.municipio, hoje, tax.codes, tax.rates)),
    [st.linhas, cad.subs, params, st.config.municipio, hoje, tax.codes, tax.rates],
  );
  const vivo = useMemo(() => computeCarrinhoZbx(entradasVivas, globaisVivos, DEFAULT_COMISSAO_TIERS), [entradasVivas, globaisVivos]);

  const congeladoIntacto = !!st.snapshot && mesmasEntradas(st.snapshot, st.linhas, st.config);
  const congelado = useMemo(
    () => (st.snapshot ? computeCarrinhoZbx(entradasDoSnapshot(st.snapshot), globaisDoSnapshot(st.snapshot), DEFAULT_COMISSAO_TIERS) : null),
    [st.snapshot],
  );
  const diffs = useMemo(() => (st.snapshot ? diferencasParametros(st.snapshot, entradasVivas, globaisVivos) : []), [st.snapshot, entradasVivas, globaisVivos]);

  const res = congeladoIntacto && congelado ? congelado : vivo;
  const globais = congeladoIntacto && st.snapshot ? globaisDoSnapshot(st.snapshot) : globaisVivos;

  const municipios = useMemo(() => {
    const ids = tax.codes.filter((c) => Object.values(params.produtos).includes(c.codigo)).map((c) => c.id);
    return Array.from(new Set(tax.rates.filter((r) => ids.includes(r.tax_product_code_id)).map((r) => r.municipio))).sort();
  }, [tax.codes, tax.rates, params.produtos]);

  return {
    cad, tax, st, params, res, vivo, congelado, congeladoIntacto, globais, globaisVivos, entradasVivas, diffs, municipios,
    loading: cad.loading || tax.loading,
  };
}
