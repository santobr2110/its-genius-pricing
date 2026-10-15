ALTER TABLE public.zabbix_subscriptions
  ALTER COLUMN ro_perc DROP NOT NULL,
  ALTER COLUMN sem_ro_perc DROP NOT NULL,
  ALTER COLUMN pgto30_ro_perc DROP NOT NULL,
  ALTER COLUMN pgto30_sem_ro_perc DROP NOT NULL,
  ALTER COLUMN ro_perc DROP DEFAULT,
  ALTER COLUMN sem_ro_perc DROP DEFAULT,
  ALTER COLUMN pgto30_ro_perc DROP DEFAULT,
  ALTER COLUMN pgto30_sem_ro_perc DROP DEFAULT;
COMMENT ON COLUMN public.zabbix_subscriptions.ro_perc IS 'NULL = herda o parâmetro da categoria (desconto_ro_<categoria>). Valor = exceção deste SKU.';
COMMENT ON COLUMN public.zabbix_subscriptions.sem_ro_perc IS 'NULL = herda o parâmetro da categoria (desconto_sem_ro_<categoria>). Valor = exceção deste SKU.';
COMMENT ON COLUMN public.zabbix_subscriptions.pgto30_ro_perc IS 'NULL = herda o parâmetro da categoria (desconto_pgto30_ro_<categoria>). Valor = exceção deste SKU.';
COMMENT ON COLUMN public.zabbix_subscriptions.pgto30_sem_ro_perc IS 'NULL = herda o parâmetro da categoria (desconto_pgto30_sem_ro_<categoria>). Valor = exceção deste SKU.';