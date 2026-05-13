export type PermissionKey =
  | "page.home"
  | "page.detalhamento"
  | "page.equipe_n1"
  | "page.equipe_n2"
  | "page.equipe_n3"
  | "page.financeiro"
  | "page.taxas_demanda"
  | "page.precificacoes"
  | "page.operacao"
  | "page.field_service"
  | "page.gestao_ti"
  | "page.relatorio_demanda"
  | "pricing.edit"
  | "pricing.save_preset"
  | "pricing.delete_preset"
  | "params.save_defaults"
  | "pricing.export_pdf"
  | "teams.edit"
  | "financeiro.edit"
  | "admin.users.manage"
  | "admin.roles.manage";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  group: "Páginas" | "Precificação" | "Equipes" | "Financeiro" | "Administração";
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "page.home", label: "Acessar Início", group: "Páginas" },
  { key: "page.detalhamento", label: "Acessar Proposição", group: "Páginas" },
  { key: "page.equipe_n1", label: "Acessar Equipe N1", group: "Páginas" },
  { key: "page.equipe_n2", label: "Acessar Equipe N2", group: "Páginas" },
  { key: "page.equipe_n3", label: "Acessar Equipe N3", group: "Páginas" },
  { key: "page.field_service", label: "Acessar Field Service", group: "Páginas" },
  { key: "page.gestao_ti", label: "Acessar Gestão de TI", group: "Páginas" },
  { key: "page.financeiro", label: "Acessar Financeiro", group: "Páginas" },
  { key: "page.taxas_demanda", label: "Acessar Métricas e Parâmetros", group: "Páginas" },
  { key: "page.operacao", label: "Acessar Operação", group: "Páginas" },
  { key: "page.precificacoes", label: "Acessar Precificações", group: "Páginas" },
  { key: "page.relatorio_demanda", label: "Acessar Relatório de Demanda", group: "Páginas" },
  { key: "pricing.edit", label: "Editar parâmetros de precificação", group: "Precificação" },
  { key: "pricing.save_preset", label: "Salvar precificações", group: "Precificação" },
  { key: "pricing.delete_preset", label: "Remover precificações salvas", group: "Precificação" },
  { key: "params.save_defaults", label: "Salvar parâmetros padrão", group: "Precificação" },
  { key: "pricing.export_pdf", label: "Exportar PDF / proposta", group: "Precificação" },
  { key: "teams.edit", label: "Editar equipes N1/N2/N3", group: "Equipes" },
  { key: "financeiro.edit", label: "Editar configurações financeiras", group: "Financeiro" },
  { key: "admin.users.manage", label: "Gerenciar usuários", group: "Administração" },
  { key: "admin.roles.manage", label: "Gerenciar perfis e permissões", group: "Administração" },
];

export const PERMISSION_GROUPS = Array.from(new Set(PERMISSIONS.map((p) => p.group)));