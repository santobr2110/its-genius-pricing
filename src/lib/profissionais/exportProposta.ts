import type { Cotacao } from "@/hooks/useCotacoes";
import { formatBRL } from "./calc";

export function gerarPropostaTxt(c: Cotacao): string {
  const data = (s: string) => new Date(s).toLocaleDateString("pt-BR");
  const linhas = [
    "Proposta Comercial — Alocação de Profissional de TI",
    "=".repeat(60),
    `Cliente:   ${c.cliente}`,
    `Emissão:   ${data(c.criado_em)}`,
    `Validade:  ${data(c.valida_ate)}`,
    "",
    "PERFIL",
    `- Cargo:        ${c.cargo}`,
    `- Área:         ${c.area}`,
    `- Nível:        ${c.nivel}`,
    c.descricao_cargo ? `- Descrição:    ${c.descricao_cargo}` : null,
    c.competencias?.length ? `- Competências: ${c.competencias.join(", ")}` : null,
    "",
    "PARÂMETROS",
    `- Encargos:       ${c.encargos_pct}%`,
    `- Overhead:       ${c.overhead_pct}%`,
    `- Margem:         ${c.margem_pct}%`,
    `- Carga horária:  ${c.horas_mensais}h/mês`,
    "",
    "VALORES",
    `- Custo Total Mensal:  ${formatBRL(Number(c.custo_total))}`,
    `- Valor de Venda:      ${formatBRL(Number(c.valor_venda))}`,
    `- Valor por Hora:      ${formatBRL(Number(c.valor_hora))}`,
    `- Valor por Sprint:    ${formatBRL(Number(c.valor_sprint))}`,
  ];
  if (c.origem === "ia" && c.ia_justificativa) {
    linhas.push("", "NOTA — Recomendação por IA", c.ia_justificativa, `Índice de aderência: ${c.ia_indice_aderencia ?? 0}%`);
  }
  linhas.push("", "—", "Calculado via IT Pricing Hub");
  return linhas.filter((l) => l !== null).join("\n");
}

export function gerarCsv(cotacoes: Cotacao[]): string {
  const headers = [
    "cliente", "origem", "cargo", "area", "nivel", "salario_base",
    "encargos_pct", "overhead_pct", "margem_pct", "horas_mensais",
    "custo_total", "valor_venda", "valor_hora", "valor_sprint",
    "valida_ate", "criado_em", "observacoes",
  ];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = cotacoes.map((c) => headers.map((h) => esc((c as any)[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}