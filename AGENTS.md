
- Observability pricing has two isolated models (classic UM bands vs levels M1–M4 + NVPS) selected by `modeloObservabilidade`; only one ever produces monitoring cost — keeps saved pricings unchanged.
- Shared pricing foundation lives in `src/lib/pricing/` (cascade + tax resolution) and DB tables `tax_product_codes`/`tax_product_code_rates`/`catalog_products`; until Phase 1B only Treinamento reads them — Smart ITO/BodyShop keep `codigosProdutoImposto.ts` so their results stay frozen.
- `src/test/naoRegressao.test.ts` snapshots Smart ITO, BodyShop and M1–M4 results; never update those snapshots to make a change pass — protects existing pricing.
