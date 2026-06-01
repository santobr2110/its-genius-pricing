// Rótulos amigáveis para as chaves de `app_defaults`. Cobrindo todas as
// chaves listadas em PARAM_KEYS (já namespeadas) e seus equivalentes legados
// (sem namespace) que ainda existem no banco.

const RAW: Record<string, string> = {
  "itsm:calculator:v1": "Calculadora ITSM",
  "itsm:n1team:v1": "Equipe N1",
  "itsm:n2team:v1": "Equipe N2",
  "itsm:fieldteams:v1": "Field Service",
  "gestao-ti:rotinas": "Gestão de TI — Rotinas",
  "gestao-ti:gmuds": "Gestão de TI — GMUDs",
  "gestao-ti:smartPerf:n3Cortes": "Gestão de TI — Cortes N3",
  "escopo:proposicao": "Escopo — Proposição",
  "escopo:restricoesGerais": "Escopo — Restrições Gerais",
  "escopo:itensAdicionais": "Escopo — Itens Adicionais",
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
  const m = key.match(/^(ito|datacenter|cloud|observabilidade)\.([^.]+)\./);
  if (!m) return "Legado (sem namespace)";
  const group = m[1].toUpperCase();
  const off = m[2]
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return `${group} · ${off}`;
}