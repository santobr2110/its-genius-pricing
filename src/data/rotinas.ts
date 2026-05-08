export type Oferta = "Operation" | "Performance";
export type Frequencia =
  | "Semanal"
  | "Quinzenal"
  | "Mensal"
  | "Bimestral"
  | "Trimestral"
  | "Semestral"
  | "Anual";

export const FREQUENCIAS: Frequencia[] = [
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Anual",
];

export const FREQ_TO_CHAMADOS: Record<Frequencia, number> = {
  Semanal: 4,
  Quinzenal: 2,
  Mensal: 1,
  Bimestral: 0.5,
  Trimestral: 0.3,
  Semestral: 0.2,
  Anual: 0.1,
};

export const CAC_FACTOR = 0.2;

export type AtivoTipo =
  | "Ambiente"
  | "Servidor"
  | "Ativo de Rede"
  | "Banco de Dados"
  | "Firewall"
  | "Equipamento"
  | "Usuário";

export const ATIVO_TIPOS: AtivoTipo[] = [
  "Ambiente",
  "Servidor",
  "Ativo de Rede",
  "Banco de Dados",
  "Firewall",
  "Equipamento",
  "Usuário",
];

export interface InventarioCounts {
  qtdUsuarios: number;
  qtdEquipamentos: number;
  qtdServidores: number;
  qtdAtivosRede: number;
  qtdBancosDados: number;
  qtdSistemas: number; // Firewall
}

export function inventarioMultiplicador(
  ativo: AtivoTipo,
  inv: InventarioCounts,
): number {
  switch (ativo) {
    case "Ambiente":
      return 1;
    case "Servidor":
      return inv.qtdServidores;
    case "Ativo de Rede":
      return inv.qtdAtivosRede;
    case "Banco de Dados":
      return inv.qtdBancosDados;
    case "Firewall":
      return inv.qtdSistemas;
    case "Equipamento":
      return inv.qtdEquipamentos;
    case "Usuário":
      return inv.qtdUsuarios;
  }
}

function ativoFromUnidade(unidade: string): AtivoTipo {
  const u = unidade.toLowerCase();
  if (u.includes("banco")) return "Banco de Dados";
  if (u.includes("firewall")) return "Firewall";
  if (u.includes("ativo de rede")) return "Ativo de Rede";
  if (u.includes("servidor")) return "Servidor";
  if (u.includes("equipamento")) return "Equipamento";
  if (u.includes("usuário") || u.includes("usuario")) return "Usuário";
  return "Ambiente";
}

export interface Rotina {
  id: string;
  grupo: string;
  rotina: string;
  oferta: Oferta;
  unidade: string;
  ativo: AtivoTipo;
  automacao: boolean;
  frequencia: Frequencia;
  chamadosMes: number;
  cac: number;
}

const r = (
  id: string,
  grupo: string,
  rotina: string,
  oferta: Oferta,
  unidade: string,
  automacao: boolean,
  frequencia: Frequencia,
): Rotina => {
  const chamadosMes = FREQ_TO_CHAMADOS[frequencia];
  return {
    id,
    grupo,
    rotina,
    oferta,
    unidade,
    ativo: ativoFromUnidade(unidade),
    automacao,
    frequencia,
    chamadosMes,
    cac: +(chamadosMes * CAC_FACTOR).toFixed(4),
  };
};

export const ROTINAS_DEFAULT: Rotina[] = [
  r("aud-1", "Auditoria", "Auditoria Rotinas/CAC", "Operation", "Ambiente", false, "Quinzenal"),
  r("bkp-1", "BACKUP", "Segurança do ambiente/ferramenta de backup", "Performance", "Ambiente", false, "Semestral"),
  r("bkp-2", "BACKUP", "Validação do Backup", "Operation", "Ambiente", false, "Bimestral"),
  r("bkp-3", "BACKUP", "Health Check", "Operation", "Ambiente", true, "Semanal"),
  r("av-1", "Antivírus", "Health Check", "Operation", "Ambiente", false, "Mensal"),
  r("av-2", "Antivírus", "Revisão da política da ferramenta", "Performance", "Ambiente", false, "Trimestral"),
  r("ito-1", "Book ITO", "Apresentação Book ITO", "Operation", "Ambiente", true, "Mensal"),
  r("bd-1", "Banco de Dados", "Análise da Instância", "Operation", "Por Banco", false, "Mensal"),
  r("bd-2", "Banco de Dados", "Análise de segurança da Instância", "Performance", "Por Banco", false, "Trimestral"),
  r("bd-3", "Banco de Dados", "Health check", "Operation", "Por Banco", false, "Semanal"),
  r("bd-4", "Banco de Dados", "Teste de desastre recovery", "Performance", "Por Banco", false, "Semestral"),
  r("fw-1", "Firewall", "Análise das regras de entrada aplicadas", "Performance", "Por Firewall", false, "Semestral"),
  r("fw-2", "Firewall", "Análise de versões e correções de versões", "Performance", "Por Firewall", false, "Mensal"),
  r("fw-3", "Firewall", "Backup das configurações do Firewall", "Operation", "Por Firewall", false, "Mensal"),
  r("fw-4", "Firewall", "Health Check", "Operation", "Por Firewall", false, "Quinzenal"),
  r("cl-1", "Cloud", "Análise de capacidade cloud", "Performance", "Por Ambiente", false, "Semestral"),
  r("cl-2", "Cloud", "Health check da tecnologia", "Operation", "Por Ambiente", false, "Semanal"),
  r("mi-1", "Microinformática", "Acompanhamento dos vencimentos dos contratos", "Performance", "Ambiente", false, "Semestral"),
  r("mi-2", "Microinformática", "Análise da parte elétrica do datacenter", "Performance", "Ambiente", false, "Trimestral"),
  r("mi-3", "Microinformática", "Análise da qualidade da rede sem fio", "Operation", "Ambiente", false, "Semanal"),
  r("mi-4", "Microinformática", "Avaliar organização e identificação do cabeamento", "Performance", "Ambiente", false, "Semanal"),
  r("mi-5", "Microinformática", "Manutenção preventiva dos Ativos", "Operation", "Ambiente", false, "Trimestral"),
  r("mi-6", "Microinformática", "Organização do datacenter", "Operation", "Ambiente", false, "Mensal"),
  r("mi-7", "Microinformática", "Revisão de vida útil dos equipamentos de usuários", "Performance", "Ambiente", false, "Mensal"),
  r("mi-8", "Microinformática", "Revisar documentação do ambiente, para manter atualizada", "Operation", "Ambiente", false, "Semestral"),
  r("mi-9", "Microinformática", "Revisar Estoque de Periféricos para Atendimento aos Usuários", "Performance", "Ambiente", false, "Quinzenal"),
  r("mi-10", "Microinformática", "Revisar Inventário de Hardwares e Softwares", "Operation", "Ambiente", false, "Mensal"),
  r("mi-11", "Microinformática", "Revisar Lista de Softwares Homologados", "Operation", "Ambiente", false, "Mensal"),
  r("mi-12", "Microinformática", "Revisar permissões de acesso físico ao datacenter", "Operation", "Ambiente", false, "Mensal"),
  r("net-1", "Network", "Switches | Health Check", "Operation", "Por Ativo de Rede", false, "Mensal"),
  r("lnx-1", "Sistema Operacional Linux", "Health Check", "Operation", "Ambiente", true, "Semanal"),
  r("win-1", "Sistema Operacional Windows", "Análise de segurança/compliance do Active Directory (AD)", "Operation", "Ambiente", false, "Mensal"),
  r("win-2", "Sistema Operacional Windows", "Health Check", "Operation", "Ambiente", true, "Semanal"),
  r("pro-1", "Protheus", "Análise de processos críticos do ambiente", "Performance", "Ambiente", false, "Semestral"),
  r("pro-2", "Protheus", "Avaliar ciclo de vida PROTHEUS", "Performance", "Ambiente", false, "Semestral"),
  r("pro-3", "Protheus", "Avaliar Lib", "Performance", "Ambiente", false, "Trimestral"),
  r("pro-4", "Protheus", "Avaliar os binários", "Performance", "Ambiente", false, "Semestral"),
  r("pro-5", "Protheus", "Avaliar pasta System", "Performance", "Ambiente", false, "Trimestral"),
  r("pro-6", "Protheus", "Avaliar Serviços Protheus", "Performance", "Ambiente", false, "Trimestral"),
  r("pro-7", "Protheus", "Revisar stored procedures", "Performance", "Ambiente", false, "Semestral"),
  r("pro-8", "Protheus", "Validação dos usuários ativos no ERP", "Performance", "Ambiente", false, "Semestral"),
  r("vrt-1", "Virtualizadores", "Análise de compliance", "Performance", "Ambiente", false, "Mensal"),
  r("vrt-2", "Virtualizadores", "Análise de segurança", "Performance", "Ambiente", false, "Mensal"),
  r("vrt-3", "Virtualizadores", "Health Check da tecnologia", "Operation", "Ambiente", false, "Semanal"),
  r("vrt-4", "Virtualizadores", "Realizar coleta de dados do consumo atual do ambiente", "Performance", "Ambiente", false, "Mensal"),
  r("vrt-5", "Virtualizadores", "Teste da Estrutura de Contingência dos Virtualizadores", "Performance", "Ambiente", false, "Anual"),
];