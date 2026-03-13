import { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { Headphones, Eye, Truck, Server, Monitor, Wrench } from "lucide-react";

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
  custoExtra: number;
  custoExtraLabel?: string;
}

export function buildAreas(state: ITSMState, results: ITSMResults): AreaData[] {
  const n0Factor = state.reducaoN0 / 100;
  const humanFactor = 1 - n0Factor;

  const raw = {
    usuarios: results.chamadosUsuarios,
    servidores: results.chamadosServidores,
    rede: results.chamadosRede,
    bd: results.chamadosBancoDados,
    sistemas: results.chamadosSistemas,
  };

  const buildArea = (sources: number[]) => {
    const bruto = sources.reduce((a, b) => a + b, 0);
    const human = bruto * humanFactor;
    return {
      bruto,
      n0: bruto * n0Factor,
      n1: human * (state.percN1 / 100),
      n2: human * (state.percN2 / 100),
      n3: human * (state.percN3 / 100),
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
      custoExtra: 0,
    },
    {
      nome: "Monitoramento",
      icon: Eye,
      chamadosBrutos: monitoramento.bruto,
      chamadosN0: monitoramento.n0,
      chamadosN1: monitoramento.n1,
      chamadosN2: 0,
      chamadosN3: 0,
      custoN1: propCost(monitoramento.bruto, monitoramento.n1, totalN1, results.custoN1),
      custoN2: 0,
      custoN3: 0,
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
      custoExtra: custoHorasPreventivas,
      custoExtraLabel: "Rotinas p/ Prevenção",
    },
    {
      nome: "Gestão de Sistemas",
      icon: Monitor,
      chamadosBrutos: gestaoSistemas.bruto,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: gestaoSistemas.n2,
      chamadosN3: gestaoSistemas.n3,
      custoN1: 0,
      custoN2: propCost(gestaoSistemas.bruto, gestaoSistemas.n2, totalN2, results.custoN2),
      custoN3: totalN3 > 0 ? (gestaoSistemas.n3 / totalN3) * custoN3Atendimento : 0,
      custoExtra: 0,
    },
    {
      nome: "Custo de Ferramentas",
      icon: Wrench,
      chamadosBrutos: 0,
      chamadosN0: 0,
      chamadosN1: 0,
      chamadosN2: 0,
      chamadosN3: 0,
      custoN1: 0,
      custoN2: 0,
      custoN3: 0,
      custoExtra: state.custoFixoFerramentas,
      custoExtraLabel: "Ferramentas",
    },
  ];
}

export function getAreaTotal(area: AreaData): number {
  return area.custoN1 + area.custoN2 + area.custoN3 + area.custoExtra;
}
