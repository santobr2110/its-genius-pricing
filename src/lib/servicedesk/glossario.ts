// Glossário de siglas e termos técnicos usados no Smart Service Desk.
// Fonte única para tooltips inline e para o card de glossário.

export interface TermoGlossario {
  sigla: string;
  titulo: string;
  descricao: string;
}

export const GLOSSARIO_SD: TermoGlossario[] = [
  {
    sigla: "UM",
    titulo: "Unidade de Medida",
    descricao:
      "Medida única de tamanho do atendimento. Cada usuário padrão, usuário VIP e estação de trabalho vale um peso; a soma ponderada é o total de UM, usado nas faixas de custo da plataforma.",
  },
  {
    sigla: "FTE",
    titulo: "Full Time Equivalent (profissional em tempo integral)",
    descricao:
      "Equivalente a uma pessoa dedicada em tempo integral no mês. 0,5 FTE = meio período de um profissional.",
  },
  {
    sigla: "N0",
    titulo: "Triagem / autoatendimento",
    descricao:
      "Primeiro filtro do contato: portal, chatbot ou triagem, resolvido antes de abrir chamado para o analista.",
  },
  {
    sigla: "N1",
    titulo: "Primeiro nível de atendimento",
    descricao:
      "Analistas do Service Desk que atendem e resolvem a maior parte dos chamados dos usuários.",
  },
  {
    sigla: "N2 / N3",
    titulo: "Níveis especializados de escalonamento",
    descricao:
      "Times técnicos que recebem os chamados que o N1 não resolve. Consomem a bolsa de horas de escalonamento.",
  },
  {
    sigla: "ITSM",
    titulo: "IT Service Management",
    descricao:
      "Ferramenta de gestão de serviços de TI (registro de chamados, fluxos e SLA). Pode ser a da Selbetti ou a do cliente, com integração.",
  },
  {
    sigla: "SLA",
    titulo: "Service Level Agreement (acordo de nível de serviço)",
    descricao:
      "Compromisso de prazos de atendimento e solução. Níveis mais exigentes aplicam um fator multiplicador sobre o custo.",
  },
  {
    sigla: "Regime de custo",
    titulo: "Pool, semidedicado ou dedicado",
    descricao:
      "Pool: equipe compartilhada entre clientes. Semidedicado: compartilhada com fator de ineficiência. Dedicado: equipe exclusiva do cliente.",
  },
  {
    sigla: "Piso da janela",
    titulo: "FTE mínimo de cobertura",
    descricao:
      "Quantidade mínima de profissionais para manter a janela de atendimento coberta (8x5, 12x6 ou 24x7). O FTE contratado é sempre o MAIOR entre o calculado por volume e esse piso.",
  },
  {
    sigla: "Bolsa de horas",
    titulo: "Horas de escalonamento contratadas",
    descricao:
      "Pacote mensal de horas técnicas para N2/N3, distribuído por prioridade entre chamados escalonados, rotinas, melhoria e horas técnicas remanescentes.",
  },
  {
    sigla: "Faixa marginal",
    titulo: "Progressão de custo por UM",
    descricao:
      "O custo por UM cai conforme o volume cresce: cada faixa é cobrada apenas sobre a parcela de UM que cai dentro dela.",
  },
  {
    sigla: "Markup divisor",
    titulo: "Formação do preço de venda",
    descricao:
      "Preço de venda = custo ÷ (1 − soma dos percentuais de impostos, comissão e lucro). Impostos e lucro incidem sobre o preço final, não sobre o custo.",
  },
  {
    sigla: "Valor único",
    titulo: "Cobrança one-time (setup)",
    descricao:
      "Valor cobrado uma única vez na implantação (integração, base de conhecimento, chatbot), fora da mensalidade.",
  },
  {
    sigla: "Headcount",
    titulo: "Quantidade de pessoas no site",
    descricao: "Número de profissionais alocados presencialmente em um site do cliente.",
  },
  {
    sigla: "Encargos / Indiretos",
    titulo: "Composição do custo de pessoal",
    descricao:
      "Encargos: percentual sobre o salário (INSS, FGTS, férias, 13º). Indiretos: rateio de estrutura, gestão e ferramentas.",
  },
  {
    sigla: "Rentabilidade",
    titulo: "Margem sobre o preço de venda",
    descricao: "Lucro dividido pelo preço de venda mensal, em percentual.",
  },
];

export const GLOSSARIO_MAP: Record<string, TermoGlossario> = Object.fromEntries(
  GLOSSARIO_SD.map((t) => [t.sigla.toLowerCase(), t]),
);

export function termo(sigla: string): TermoGlossario | undefined {
  return GLOSSARIO_MAP[sigla.toLowerCase()];
}
