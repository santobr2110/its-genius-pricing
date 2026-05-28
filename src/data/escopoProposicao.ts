/**
 * Conteúdo editável do Relatório de Proposição.
 *
 * Cada camada tem: título, tagline curta, descrição livre, lista de itens
 * incluídos (bullets) e lista de restrições de atuação (mostradas em formato
 * compacto no fim do relatório).
 *
 * Os valores aqui são apenas defaults — o usuário edita na página
 * Configurações › Escopo e o estado é persistido via `usePersistentState`
 * sob a chave `escopo:proposicao`.
 */

export type CamadaKey = "monitor" | "flow" | "operation" | "performance" | "enterprise" | "fieldService";

export interface EscopoCamada {
  titulo: string;
  tagline: string;
  descricao: string;
  incluidos: string[];
  restricoes: string[];
}

export type EscopoProposicao = Record<CamadaKey, EscopoCamada>;

export const CAMADA_ORDEM: CamadaKey[] = [
  "monitor",
  "flow",
  "operation",
  "fieldService",
  "performance",
  "enterprise",
];

export const CAMADA_LABEL: Record<CamadaKey, string> = {
  monitor: "Smart Monitor",
  flow: "Smart Flow",
  operation: "Smart Operation",
  fieldService: "Field Service de Microinformática",
  performance: "Smart Performance",
  enterprise: "Smart Enterprise",
};

export const ESCOPO_DEFAULT: EscopoProposicao = {
  monitor: {
    titulo: "Smart Monitor",
    tagline: "Monitoramento da infraestrutura",
    descricao:
      "Monitoramento 24x7 da infraestrutura do cliente, com coleta via proxys instalados no ambiente e abertura automática de chamados a partir dos eventos detectados.",
    incluidos: [
      "Monitoramento 24x7 com alertas de incidentes",
      "Cobertura de Servidores, Ativos de Rede, Bancos de Dados e Firewall",
      "Coleta via proxys instalados no ambiente do cliente",
      "Abertura automática de chamados a partir dos eventos detectados",
    ],
    restricoes: [
      "Não inclui resolução de incidentes — apenas detecção e notificação",
      "Não cobre ativos fora do inventário declarado",
      "Não inclui atendimento ao usuário final",
      "Customizações de monitoramento contam como Automação / Manutenção (horas N3 / Automação)",
    ],
  },
  flow: {
    titulo: "Smart Flow",
    tagline: "Monitoramento integrado ao ITSM e atendentes dedicados",
    descricao:
      "Camada de integração entre o monitoramento e o ITSM do cliente, com atendentes dedicados para triagem e roteamento técnico, horas de automação e horas N3 / Automação opcionais para tratamento de eventos.",
    incluidos: [
      "Monitoramento integrado ao ITSM do cliente",
      "Acesso de atendentes dedicados no ITSM para operação técnica",
      "Horas de automação para tratamento e ajuste contínuo de eventos",
      "Horas N3 / Automação opcionais para acionamento técnico sob demanda",
      "Proxys de coleta dedicados à camada Flow",
    ],
    restricoes: [
      "Não inclui Service Desk humano N1/N2 reativo (oferta Smart Operation)",
      "Horas N3 / Automação e atendentes são absorvidos pela camada Smart Operation quando contratada",
      "Automações fora do catálogo demandam estudo técnico prévio",
      "Cobertura limitada aos ativos do inventário declarado",
    ],
  },
  operation: {
    titulo: "Smart Operation",
    tagline: "Service Desk humano N1 e N2 com rotinas básicas",
    descricao:
      "Service Desk gerenciado com atendimento humano nos níveis N1 e N2, triagem técnica, SLA controlado e rotinas preventivas básicas executadas mensalmente.",
    incluidos: [
      "Funil N1 e N2 reativo com SLA controlado",
      "Triagem técnica e roteamento dos chamados",
      "Rotinas preventivas básicas (Operation)",
      "Indicadores e relatórios mensais",
      "Atendimento N3 contratado em horas, quando aplicável",
    ],
    restricoes: [
      "Não inclui rotinas avançadas em ambientes complexos (HA, multi-site, 24x7, ERP)",
      "Horas N3 / Automação limitadas ao volume contratado mensalmente — não acumulam entre meses",
      "Não inclui suporte presencial sem contratação do Field Service de Microinformática",
      "Atendimentos fora do horário comercial seguem regras específicas de plantão",
    ],
  },
  fieldService: {
    titulo: "Field Service de Microinformática",
    tagline: "Suporte presencial — incluso no Smart Operation",
    descricao:
      "Equipe presencial alocada para atendimento de microinformática e suporte em sites do cliente, complementando a operação remota do Smart Operation.",
    incluidos: [
      "Equipe N1F / N2F / N3F presencial alocada",
      "Atendimento de microinformática nos sites do cliente",
      "Rotinas Field — Microinformática executadas periodicamente",
      "Transbordo automático para N1 remoto em pico de demanda",
    ],
    restricoes: [
      "Cobertura limitada às localidades contratadas",
      "SLA de deslocamento conforme distância e modalidade contratada",
      "Equipamentos fora do inventário declarado podem gerar custo adicional",
      "Peças e insumos de hardware não estão inclusos",
    ],
  },
  performance: {
    titulo: "Smart Performance",
    tagline: "Rotinas preventivas avançadas e horas técnicas N3 / Automação",
    descricao:
      "Operação avançada com rotinas preventivas executadas pelo N3, cobertura de ambientes complexos e horas técnicas N3 / Automação dedicadas ao cliente.",
    incluidos: [
      "Rotinas preventivas avançadas executadas pelo N3",
      "Cobertura de ambientes complexos (HA, multi-site, 24x7, ERP)",
      "Otimização contínua de performance e capacidade",
      "Horas técnicas N3 / Automação dedicadas ao cliente",
    ],
    restricoes: [
      "Horas N3 / Automação dedicadas não são acumulativas entre meses",
      "Mudanças estruturais fora do escopo previsto demandam projeto específico",
      "Rotinas em ambientes complexos requerem janela de manutenção acordada",
      "Cobertura condicionada ao inventário e às flags de complexidade declaradas",
    ],
  },
  enterprise: {
    titulo: "Smart Enterprise",
    tagline: "Governança e visão executiva da TI",
    descricao:
      "Camada de governança executiva sobre toda a operação de TI, com gestão estratégica, comitê executivo e alinhamento contínuo entre TI e negócio.",
    incluidos: [
      "Gestão estratégica e roadmap tecnológico",
      "Comitê executivo e governança de mudanças (GMUDs)",
      "Alinhamento contínuo entre TI e negócio",
      "Relatórios executivos consolidados",
    ],
    restricoes: [
      "Não substitui CIO/CTO interno do cliente",
      "Decisões estratégicas finais permanecem com o cliente",
      "Roadmap é revisado em ciclos trimestrais",
      "Execução de iniciativas estratégicas pode demandar projetos dedicados",
    ],
  },
};

export const ESCOPO_STORAGE_KEY = "escopo:proposicao";

export const RESTRICOES_GERAIS_STORAGE_KEY = "escopo:restricoesGerais";

export const RESTRICOES_GERAIS_DEFAULT: string[] = [
  "Atendimentos em horário comercial (08h às 18h, dias úteis); fora desse período seguem regras de plantão acordadas em contrato.",
  "SLA e janelas de atendimento conforme contrato vigente.",
  "Atividades não previstas neste escopo podem ser atendidas sob demanda mediante orçamento específico.",
  "Mudanças de inventário (usuários, equipamentos ou ativos) que ultrapassem 10% do volume contratado podem implicar revisão comercial.",
  "Valores apresentados são mensais e em Reais (BRL), reajustados anualmente pelo índice previsto em contrato.",
  "Aquisição de hardware, software, licenças e insumos não está inclusa, salvo menção expressa.",
];

// ============================================================
// Itens Adicionais ao Contrato
// ============================================================

/**
 * Tipos suportados:
 * - "monitorado-*": valor calculado automaticamente combinando o custo de
 *   monitoramento + chamados previstos (incidentes ponderados no funil) + a
 *   parcela proporcional de GMUDs/Rotinas por ativo, com markup de margem e
 *   impostos aplicados.
 * - "fixo": valor unitário fixo informado pelo usuário (ex.: proxy adicional,
 *   acesso ao ITSM, hora N3 / Automação avulsa, TAM, Owner).
 */
export type ItemAdicionalTipo =
  | "monitorado-servidor"
  | "monitorado-rede"
  | "monitorado-firewall"
  | "monitorado-bd"
  | "monitorado-sistema"
  | "proxy"
  | "itsm"
  | "hora-n3"
  | "tam"
  | "owner"
  | "fixo";

export interface ItemAdicional {
  id: string;
  descricao: string;
  unidade: string;
  tipo: ItemAdicionalTipo;
  /** Valor manual em R$. Quando informado (>0) sobrescreve o cálculo automático. */
  valorManual?: number;
  observacao?: string;
}

export const ITENS_ADICIONAIS_STORAGE_KEY = "escopo:itensAdicionais";

const uid = (s: string) => s;

export const ITENS_ADICIONAIS_DEFAULT: ItemAdicional[] = [
  {
    id: uid("servidor"),
    descricao: "Servidor adicional",
    unidade: "Servidor / mês",
    tipo: "monitorado-servidor",
    observacao: "Inclui monitoramento + chamados previstos (incidentes, rotinas e GMUDs) ponderados no funil de atendimento.",
  },
  {
    id: uid("firewall"),
    descricao: "Firewall adicional",
    unidade: "Firewall / mês",
    tipo: "monitorado-firewall",
    observacao: "Considerado como ativo de rede crítico — mesma taxa de chamados de ativos de rede.",
  },
  {
    id: uid("rede"),
    descricao: "Ativo de Rede adicional",
    unidade: "Ativo / mês",
    tipo: "monitorado-rede",
    observacao: "Switch, roteador, access point ou similar dentro do escopo monitorado.",
  },
  {
    id: uid("bd"),
    descricao: "Banco de Dados adicional",
    unidade: "Instância / mês",
    tipo: "monitorado-bd",
    observacao: "Instância de banco de dados monitorada e suportada conforme escopo contratado.",
  },
  {
    id: uid("proxy"),
    descricao: "Proxy de monitoramento adicional",
    unidade: "Proxy / mês",
    tipo: "proxy",
    observacao: "Adicional ao(s) proxy(s) inicial(is); valor unitário alinhado ao parâmetro de Proxy adicional do Smart Monitor.",
  },
  {
    id: uid("itsm"),
    descricao: "Acesso adicional ao ITSM",
    unidade: "Usuário / mês",
    tipo: "itsm",
    valorManual: 150,
    observacao: "Liberação de novo usuário no ITSM além dos perfis previstos no contrato.",
  },
  {
    id: uid("hora-n3"),
    descricao: "Hora técnica N3 / Automação avulsa",
    unidade: "Hora",
    tipo: "hora-n3",
    observacao: "Hora N3 / Automação sob demanda, fora do volume mensal contratado. Cobrada conforme consumo aprovado.",
  },
  {
    id: uid("tam"),
    descricao: "TAM — Technical Account Manager",
    unidade: "Mês",
    tipo: "tam",
    valorManual: 0,
    observacao: "Profissional dedicado à governança técnica e relacionamento contínuo com o cliente.",
  },
  {
    id: uid("owner"),
    descricao: "Owner / Gestor de Contas dedicado",
    unidade: "Mês",
    tipo: "owner",
    valorManual: 0,
    observacao: "Gestor responsável pelo ciclo de vida do contrato e satisfação do cliente.",
  },
];