import { computeN3Distribution, type N3Distribution } from "@/lib/n3Distribution";
import { computeCustoAtendimentoTotal } from "./custoAtendimentoUM";
import { resolveCoberturaFTE, type CoberturaResultado } from "./coberturaFTE";
import { computeFunil, type FunilResultado } from "./funilAtendimento";
import { computeCascata, type CascataResultado } from "./financeiroServiceDesk";
import { fatorRegime, resolveRegimeCusto, type RegimeCusto } from "./regimeCusto";
import { computeRotinasSD, type RotinasSDResultado } from "./rotinasSD";
import type { ServiceDeskState } from "./types";

export interface ServiceDeskResults {
  regime: RegimeCusto;
  fatorRegimeAplicado: number;
  funil: FunilResultado;
  cobertura: CoberturaResultado;
  umTotal: number;
  custoPlataforma: number;
  custoMedioPorUM: number;
  custoPorFTE: number;
  fteDedicadoSites: number;
  custoEquipe: number;
  custoBolsaHoras: number;
  custoCanaisAdicionais: number;
  canaisAdicionais: number;
  custoBaseConhecimento: number;
  custoChatbot: number;
  custoRotinasAvancadas: number;
  rotinas: RotinasSDResultado;
  distribuicaoHoras: N3Distribution;
  fatorSLAAplicado: number;
  custoSubtotal: number;
  custoTotalMensal: number;
  custoOneTime: number;
  cascata: CascataResultado;
  precoVendaMensal: number;
  precoPorUsuario: number;
  precoPorChamado: number;
  rentabilidadePct: number;
}

export interface CalcInput {
  state: ServiceDeskState;
  /** Custo mensal total da equipe cadastrada. */
  custoTotalEquipe: number;
  /** Quantidade de pessoas cadastradas na equipe. */
  totalPessoas: number;
  /** IDs das rotinas desativadas nesta proposta. */
  rotinasOff: Set<string>;
}

export function calcServiceDesk({
  state,
  custoTotalEquipe,
  totalPessoas,
  rotinasOff,
}: CalcInput): ServiceDeskResults {
  const regime = resolveRegimeCusto({ modalidade: state.modalidade, itsmTipo: state.itsmTipo });
  const fatorRegimeAplicado = fatorRegime(regime, state.fatorIneficiencia);

  const funil = computeFunil({
    volumeBrutoMes: state.volumeBrutoMes,
    pctAutoatendimento: state.pctAutoatendimento,
    pctTriagem: state.pctTriagem,
    pctEscalonado: state.pctEscalonado,
  });

  const fteVolume =
    state.produtividadeChamadosFTE > 0
      ? funil.chamadosN1 / state.produtividadeChamadosFTE
      : 0;
  const cobertura = resolveCoberturaFTE(fteVolume, state.janelaCobertura, state.pisosCobertura);

  const custoPorFTE = totalPessoas > 0 ? custoTotalEquipe / totalPessoas : 0;

  const fteDedicadoSites = state.sites.reduce((s, x) => s + Math.max(0, x.headcount || 0), 0);
  const adicionalSites = state.sites.reduce((s, x) => s + Math.max(0, x.adicionalMensal || 0), 0);

  // Equipe: no regime dedicado o headcount dos sites é somado ao FTE remoto.
  const fteFaturavel =
    regime === "dedicado" ? cobertura.fteContratado + fteDedicadoSites : cobertura.fteContratado;
  const custoEquipe =
    custoPorFTE * fteFaturavel * fatorRegimeAplicado +
    (regime === "dedicado"
      ? adicionalSites + fteDedicadoSites * (state.custoFTEDedicadoAdicional || 0)
      : 0);

  const plataforma = computeCustoAtendimentoTotal(
    {
      qtdUsuariosPadrao: state.qtdUsuariosPadrao,
      qtdUsuariosVIP: state.qtdUsuariosVIP,
      qtdEstacoes: state.qtdEstacoes,
    },
    state.atendimentoPesos,
    state.atendimentoFaixas,
    state.atendimentoPiso,
  );

  const custoBolsaHoras =
    Math.max(0, state.bolsaHorasEscalonamento || 0) * Math.max(0, state.valorHoraEscalonamento || 0);

  const canaisAdicionais = Math.max(0, (state.canais?.length ?? 0) - (state.canaisInclusos || 0));
  const custoCanaisAdicionais = canaisAdicionais * Math.max(0, state.custoPorCanalAdicional || 0);

  const custoBaseConhecimento = state.baseConhecimentoAtiva
    ? Math.max(0, state.baseConhecimentoHorasMes || 0) * Math.max(0, state.valorHoraEscalonamento || 0)
    : 0;

  const custoChatbot = state.chatbotIA ? Math.max(0, state.chatbotIAMensal || 0) : 0;

  const rotinas = state.rotinasAtivas
    ? computeRotinasSD(state.rotinas ?? [], rotinasOff, {
        qtdEstacoes: state.qtdEstacoes,
        qtdUsuarios: state.qtdUsuariosPadrao + state.qtdUsuariosVIP,
        valorHora: state.valorHoraEscalonamento,
      })
    : { base: [], avancado: [], horasBase: 0, horasAvancado: 0, custoAvancado: 0 };

  // Bolsa de horas de escalonamento distribuída em cascata (waterfall).
  const distribuicaoHoras = computeN3Distribution({
    total: state.bolsaHorasEscalonamento,
    horasChamados: funil.chamadosEscalonados * Math.max(0, state.tempoMedioEscalonamentoH || 0),
    horasRotinas: rotinas.horasBase,
    horasMelhoria: state.horasMelhoria,
  });

  const fatorSLAAplicado = Math.max(1, state.fatoresSLA?.[state.nivelSLA] ?? 1);

  const custoSubtotal =
    custoEquipe +
    plataforma.custoTotal +
    custoBolsaHoras +
    custoCanaisAdicionais +
    custoBaseConhecimento +
    custoChatbot +
    rotinas.custoAvancado;

  const custoTotalMensal = custoSubtotal * fatorSLAAplicado;

  const custoOneTime =
    (state.itsmTipo === "cliente-integrado" ? Math.max(0, state.custoIntegracaoOneTime || 0) : 0) +
    (state.baseConhecimentoAtiva ? Math.max(0, state.baseConhecimentoSetup || 0) : 0) +
    (state.chatbotIA ? Math.max(0, state.chatbotIASetup || 0) : 0);

  const cascata = computeCascata(custoTotalMensal, state);
  const usuarios = state.qtdUsuariosPadrao + state.qtdUsuariosVIP;

  return {
    regime,
    fatorRegimeAplicado,
    funil,
    cobertura,
    umTotal: plataforma.umTotal,
    custoPlataforma: plataforma.custoTotal,
    custoMedioPorUM: plataforma.custoMedioPorUM,
    custoPorFTE,
    fteDedicadoSites,
    custoEquipe,
    custoBolsaHoras,
    custoCanaisAdicionais,
    canaisAdicionais,
    custoBaseConhecimento,
    custoChatbot,
    custoRotinasAvancadas: rotinas.custoAvancado,
    rotinas,
    distribuicaoHoras,
    fatorSLAAplicado,
    custoSubtotal,
    custoTotalMensal,
    custoOneTime,
    cascata,
    precoVendaMensal: cascata.precoVenda,
    precoPorUsuario: usuarios > 0 ? cascata.precoVenda / usuarios : 0,
    precoPorChamado: funil.chamadosN1 > 0 ? cascata.precoVenda / funil.chamadosN1 : 0,
    rentabilidadePct: cascata.rentabilidadePct,
  };
}