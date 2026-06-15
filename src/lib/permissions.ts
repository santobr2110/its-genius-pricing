export type PermissionKey =
  // Acesso a Grupos (Business Unit)
  | "group.ito.access"
  | "group.datacenter.access"
  | "group.cloud.access"
  | "group.observabilidade.access"
  // Acesso a Ofertas dentro dos Grupos
  | "offering.ito.smart-ito.access"
  | "offering.ito.pacote-horas.access"
  | "offering.ito.bodyshop.access"
  | "offering.ito.profissionais-alocados.access"
  // Páginas e ações da oferta Smart ITO (ITO)
  | "page.home"
  | "page.detalhamento"
  | "page.equipe_n1"
  | "page.equipe_n2"
  | "page.equipe_n3"
  | "page.financeiro"
  | "page.taxas_demanda"
  | "page.precificacoes"
  | "page.field_service"
  | "page.gestao_ti"
  | "page.relatorio_demanda"
  | "page.resumo_cotacao"
  | "page.escopo"
  // Permissão de escrita por página (somente leitura quando ausente)
  | "page.home.write"
  | "page.detalhamento.write"
  | "page.equipe_n1.write"
  | "page.equipe_n2.write"
  | "page.equipe_n3.write"
  | "page.financeiro.write"
  | "page.taxas_demanda.write"
  | "page.field_service.write"
  | "page.gestao_ti.write"
  | "page.escopo.write"
  | "pricing.edit"
  | "pricing.save_preset"
  | "pricing.delete_preset"
  | "params.save_defaults"
  | "pricing.export_pdf"
  | "teams.edit"
  | "financeiro.edit"
  | "admin.users.manage"
  | "admin.roles.manage"
  // Profissionais Alocados — páginas
  | "page.prof.base_conhecimento"
  | "page.prof.financeiro"
  | "page.prof.selecao_manual"
  | "page.prof.selecao_ia"
  | "page.prof.cotacoes"
  // Profissionais Alocados — escrita
  | "page.prof.base_conhecimento.write"
  | "page.prof.financeiro.write"
  | "page.prof.selecao_manual.write"
  | "page.prof.selecao_ia.write"
  // Profissionais Alocados — ações
  | "prof.pricing.save"
  | "prof.pricing.delete"
  | "prof.pricing.export";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  group:
    | "Grupos (Business Unit)"
    | "Ofertas"
    | "ITO › Smart ITO › Páginas"
    | "ITO › Smart ITO › Precificação"
    | "ITO › Smart ITO › Equipes"
    | "ITO › Smart ITO › Financeiro"
    | "ITO › Profissionais Alocados"
    | "Administração";
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "group.ito.access",             label: "Acessar Grupo ITO",             group: "Grupos (Business Unit)" },
  { key: "group.datacenter.access",      label: "Acessar Grupo Datacenter",      group: "Grupos (Business Unit)" },
  { key: "group.cloud.access",           label: "Acessar Grupo Cloud",           group: "Grupos (Business Unit)" },
  { key: "group.observabilidade.access", label: "Acessar Grupo Observabilidade", group: "Grupos (Business Unit)" },
  { key: "offering.ito.smart-ito.access", label: "Acessar Oferta Smart ITO",     group: "Ofertas" },
  { key: "offering.ito.pacote-horas.access", label: "Acessar Oferta Pacote de Horas", group: "Ofertas" },
  { key: "offering.ito.bodyshop.access",     label: "Acessar Oferta Bodyshop",        group: "Ofertas" },
  { key: "offering.ito.profissionais-alocados.access", label: "Acessar Oferta Precificação de Profissionais Alocados", group: "Ofertas" },
  { key: "page.home",              label: "Início / calculadora",              group: "ITO › Smart ITO › Páginas" },
  { key: "page.detalhamento",      label: "Proposição",                        group: "ITO › Smart ITO › Páginas" },
  { key: "page.equipe_n1",         label: "Equipe N1",                         group: "ITO › Smart ITO › Páginas" },
  { key: "page.equipe_n2",         label: "Equipe N2",                         group: "ITO › Smart ITO › Páginas" },
  { key: "page.equipe_n3",         label: "Equipe N3",                         group: "ITO › Smart ITO › Páginas" },
  { key: "page.field_service",     label: "Field Service de Microinformática",                     group: "ITO › Smart ITO › Páginas" },
  { key: "page.gestao_ti",         label: "Gestão de TI",                      group: "ITO › Smart ITO › Páginas" },
  { key: "page.financeiro",        label: "Financeiro",                        group: "ITO › Smart ITO › Páginas" },
  { key: "page.taxas_demanda",     label: "Métricas e Parâmetros",             group: "ITO › Smart ITO › Páginas" },
  { key: "page.precificacoes",     label: "Precificações salvas",              group: "ITO › Smart ITO › Páginas" },
  { key: "page.relatorio_demanda", label: "Relatório de Demanda",              group: "ITO › Smart ITO › Páginas" },
  { key: "page.resumo_cotacao",    label: "Resumo de Cotação",                 group: "ITO › Smart ITO › Páginas" },
  { key: "page.escopo",            label: "Escopo da Proposição",              group: "ITO › Smart ITO › Páginas" },
  { key: "page.home.write",          label: "Editar Início / calculadora",      group: "ITO › Smart ITO › Páginas" },
  { key: "page.detalhamento.write",  label: "Editar Proposição",                group: "ITO › Smart ITO › Páginas" },
  { key: "page.equipe_n1.write",     label: "Editar Equipe N1",                 group: "ITO › Smart ITO › Páginas" },
  { key: "page.equipe_n2.write",     label: "Editar Equipe N2",                 group: "ITO › Smart ITO › Páginas" },
  { key: "page.equipe_n3.write",     label: "Editar Equipe N3",                 group: "ITO › Smart ITO › Páginas" },
  { key: "page.field_service.write", label: "Editar Field Service de Microinformática",             group: "ITO › Smart ITO › Páginas" },
  { key: "page.gestao_ti.write",     label: "Editar Gestão de TI",              group: "ITO › Smart ITO › Páginas" },
  { key: "page.financeiro.write",    label: "Editar Financeiro",                group: "ITO › Smart ITO › Páginas" },
  { key: "page.taxas_demanda.write", label: "Editar Métricas e Parâmetros",     group: "ITO › Smart ITO › Páginas" },
  { key: "page.escopo.write",        label: "Editar Escopo da Proposição",      group: "ITO › Smart ITO › Páginas" },
  { key: "pricing.edit",           label: "Editar parâmetros de precificação", group: "ITO › Smart ITO › Precificação" },
  { key: "pricing.save_preset",    label: "Salvar precificações",              group: "ITO › Smart ITO › Precificação" },
  { key: "pricing.delete_preset",  label: "Remover precificações salvas",      group: "ITO › Smart ITO › Precificação" },
  { key: "params.save_defaults",   label: "Salvar parâmetros padrão",          group: "ITO › Smart ITO › Precificação" },
  { key: "pricing.export_pdf",     label: "Exportar PDF / proposta",           group: "ITO › Smart ITO › Precificação" },
  { key: "teams.edit",             label: "Editar equipes N1/N2/N3",           group: "ITO › Smart ITO › Equipes" },
  { key: "financeiro.edit",        label: "Editar configurações financeiras",  group: "ITO › Smart ITO › Financeiro" },
  { key: "admin.users.manage", label: "Gerenciar usuários", group: "Administração" },
  { key: "admin.roles.manage", label: "Gerenciar perfis e permissões", group: "Administração" },
  { key: "page.prof.base_conhecimento",        label: "Base de Conhecimento",                   group: "ITO › Profissionais Alocados" },
  { key: "page.prof.base_conhecimento.write",  label: "Editar Base de Conhecimento",            group: "ITO › Profissionais Alocados" },
  { key: "page.prof.financeiro",               label: "Financeiro (Profissionais Alocados)",    group: "ITO › Profissionais Alocados" },
  { key: "page.prof.financeiro.write",         label: "Editar Financeiro (Profissionais)",     group: "ITO › Profissionais Alocados" },
  { key: "page.prof.selecao_manual",           label: "Seleção Manual",                         group: "ITO › Profissionais Alocados" },
  { key: "page.prof.selecao_manual.write",     label: "Editar Seleção Manual",                  group: "ITO › Profissionais Alocados" },
  { key: "page.prof.selecao_ia",               label: "Seleção com IA",                         group: "ITO › Profissionais Alocados" },
  { key: "page.prof.selecao_ia.write",         label: "Editar Seleção com IA",                  group: "ITO › Profissionais Alocados" },
  { key: "page.prof.cotacoes",                 label: "Cotações Salvas",                        group: "ITO › Profissionais Alocados" },
  { key: "prof.pricing.save",                  label: "Salvar cotações (Profissionais)",        group: "ITO › Profissionais Alocados" },
  { key: "prof.pricing.delete",                label: "Excluir cotações (Profissionais)",       group: "ITO › Profissionais Alocados" },
  { key: "prof.pricing.export",                label: "Exportar propostas (Profissionais)",     group: "ITO › Profissionais Alocados" },
];

export const PERMISSION_GROUPS = Array.from(new Set(PERMISSIONS.map((p) => p.group)));