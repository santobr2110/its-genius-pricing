import { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { Headphones, Eye, Truck, Server, Monitor } from "lucide-react";

export interface AreaData {
  nome: string;
  icon: React.ElementType;
  chamadosBrutos: number;
  chamadosN0: number;
  chamadosN1: number;
  chamadosN2: number;
  chamadosN3: number;
  custoN1: number;
  custoN2: number;
  custoN3: number;
  custoFerramentas: number;
  custoFerramentasLabel?: string;
  custoExtra: number;
  custoExtraLabel?: string;
}

export function buildAreas(state: ITSMState, results: ITSMResults): AreaData[] {
  const human = results.humanAttendanceActive;
  const n0Factor = state.reducaoN0 / 100;
  const humanFactor = human ? 1 - n0Factor : 0;

  const raw = {
    usuarios: results.chamadosUsuarios,
    servidores: results.chamadosServidores,
    rede: results.chamadosRede,
    bd: results.chamadosBancoDados,
    sistemas: results.chamadosSistemas,
  };

  const buildArea = (sources: number[]) => {
    const bruto = sources.reduce((a, b) => a + b, 0);
    const humanCalls = bruto * humanFactor;
    return {
      bruto,
      n0: bruto * n0Factor,
      n1: humanCalls * (state.percN1 / 100),
      n2: humanCalls * (state.percN2 / 100),
      n3: humanCalls * (state.percN3 / 100),
    };
  };

  const propCost = (_areaBruto: number, levelCalls: number, totalLevelCalls: number, totalLevelCost: number) => {
    if (totalLevelCalls <= 0) return 0;
    return (levelCalls / totalLevelCalls) * totalLevelCost;
  };

  const totalN1 = results.volumeN1;
  const totalN2 = results.volumeN2;
  const totalN3 = results.volumeN3;

  const centralServico = buildArea([raw.usuarios, raw.sistemas]);
  const monitoramento = buildArea([raw.servidores, raw.rede, raw.bd]);
  const fieldService = buildArea([raw.usuarios]);
  const gestaoInfra = buildArea([raw.servidores, raw.rede, raw.bd]);
  const gestaoSistemas = buildArea([raw.sistemas]);

  const custoHorasPreventivas = results.horasPrevencao > 0
    ? results.horasPrevencao * state.valorHoraN3
    : 0;

  const custoN3Atendimento = results.horasAtendimentoN3 * state.valorHoraN3;

  return [
    {
      nome: "Central de Serviço",
      icon: Headphones,
      chamadosBrutos: centralServico.bruto,
      chamadosN0: centralServico.n0,
      chamadosN1: centralServico.n1,
      chamadosN2: 0,
      chamadosN3: 0,
      custoN1: propCost(centralServico.bruto, centralServico.n1, totalN1, results.custoN1),
      custoN2: 0,
      custoN3: 0,
      custoFerramentas: 0,
      custoExtra: 0,
    },
    {
      nome: "Monitoramento",
      icon: Eye,
      chamadosBrutos: state.tierMonitor ? results.smartMonitor.chamadosAtivos : monitoramento.bruto,
      chamadosN0: human ? monitoramento.n0 : 0,
      chamadosN1: state.tierMonitor
        ? results.smartMonitor.chamadosAtivos
        : monitoramento.n1,
      chamadosN2: 0,
      chamadosN3: 0,
      custoN1:
        propCost(monitoramento.bruto, monitoramento.n1, totalN1, results.custoN1) +
        results.smartMonitor.custoN1Alocado,
      custoN2: 0,
      custoN3: 0,
      custoFerramentas: results.smartMonitor.custoMonitoramento,
      custoFerramentasLabel: "Infra Smart Monitor (ativos)",
      custoExtra: 0,
    },
    {
      nome: "Field Service",
      icon: Truck,
      chamadosBrutos: fieldService.bruto,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: fieldService.n2,
      chamadosN3: fieldService.n3,
      custoN1: 0,
      custoN2: propCost(fieldService.bruto, fieldService.n2, totalN2, results.custoN2),
      custoN3: totalN3 > 0 ? (fieldService.n3 / totalN3) * custoN3Atendimento : 0,
      custoFerramentas: 0,
      custoExtra: 0,
    },
    {
      nome: "Gestão Infra e BD",
      icon: Server,
      chamadosBrutos: gestaoInfra.bruto,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: gestaoInfra.n2,
      chamadosN3: gestaoInfra.n3,
      custoN1: 0,
      custoN2: propCost(gestaoInfra.bruto, gestaoInfra.n2, totalN2, results.custoN2),
      custoN3: totalN3 > 0 ? (gestaoInfra.n3 / totalN3) * custoN3Atendimento : 0,
      custoFerramentas: 0,
      custoExtra: custoHorasPreventivas,
      custoExtraLabel: "Rotinas p/ Prevenção",
    },
    {
      nome: "Gestão de Firewall",
      icon: Monitor,
      chamadosBrutos: gestaoSistemas.bruto,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: gestaoSistemas.n2,
      chamadosN3: gestaoSistemas.n3,
      custoN1: 0,
      custoN2: propCost(gestaoSistemas.bruto, gestaoSistemas.n2, totalN2, results.custoN2),
      custoN3: totalN3 > 0 ? (gestaoSistemas.n3 / totalN3) * custoN3Atendimento : 0,
      custoFerramentas: 0,
      custoExtra: 0,
    },
  ];
}

export function getAreaTotal(area: AreaData): number {
  return area.custoN1 + area.custoN2 + area.custoN3 + area.custoFerramentas + area.custoExtra;
}
