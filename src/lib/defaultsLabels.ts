// Rótulos amigáveis para as chaves de `app_defaults`. Cobrindo todas as
// chaves listadas em PARAM_KEYS (já namespeadas) e seus equivalentes legados
// (sem namespace) que ainda existem no banco.

const RAW: Record<string, string> = {
  "itsm:calculator:v1": "Calculadora ITSM (inclui Equipe N3)",
  "itsm:n1team:v1": "Equipe N1",
  "itsm:n2team:v1": "Equipe N2",
  "itsm:fieldteams:v1": "Field Service",
  "gestao-ti:rotinas": "Gestão de TI — Rotinas",
  "gestao-ti:gmuds": "Gestão de TI — GMUDs",
  "gestao-ti:smartPerf:n3Cortes": "Gestão de TI — Cortes N3",
  "escopo:proposicao": "Escopo — Proposição",
  "escopo:restricoesGerais": "Escopo — Restrições Gerais",
  "escopo:itensAdicionais": "Escopo — Itens Adicionais",
  // Smart ITO — Financeiro/Impostos (sem namespace por razões históricas)
  "financeiro.codigoProduto": "Código de Produto (Smart ITO)",
  "financeiro.cidadeIss": "Cidade ISS (Smart ITO)",
  // BodyShop (sem namespace por razões históricas)
  "prof.fin.state.v1": "Financeiro BodyShop",
  "prof.fin.comissaoTiers.v1": "Tiers de Comissão BodyShop",
  "prof.financeiro.codigoProduto": "Código de Produto (BodyShop)",
  "prof.financeiro.cidadeIss": "Cidade ISS (BodyShop)",
};

export function labelForDefaultKey(key: string): string {
  // Tira o prefixo de oferta (ito.smart-ito.) se existir
  const stripped = key.replace(
    /^(ito|datacenter|cloud|observabilidade)\.[^.]+\./,
    "",
  );
  return RAW[stripped] ?? RAW[key] ?? key;
}

export function offeringForDefaultKey(key: string): string {
  // Chaves do BodyShop ficam fora do namespace `ito.smart-ito.*` por
  // razões históricas (gravadas direto em localStorage).
  if (key.startsWith("prof.fin.") || key.startsWith("prof.financeiro.")) {
    return "ITO · BodyShop";
  }
  const m = key.match(/^(ito|datacenter|cloud|observabilidade)\.([^.]+)\./);
  if (!m) return "Legado (sem namespace)";
  const group = m[1].toUpperCase();
  const off = m[2]
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return `${group} · ${off}`;
}