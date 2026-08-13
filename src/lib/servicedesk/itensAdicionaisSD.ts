import type { ServiceDeskState } from "./types";
import { computeCustoPorUMAtendimentoMarginal, computeUMAtendimento } from "./custoAtendimentoUM";

export type ItemSDTipo =
  | "canal-adicional"
  | "hora-escalonamento-n2"
  | "integracao-itsm-cliente"
  | "base-conhecimento-setup"
  | "site-presencial"
  | "usuario-adicional"
  | "chatbot-ia-setup"
  | "fixo";

export type CobrancaSD = "mensal" | "one-time";

export interface ItemAdicionalSD {
  id: string;
  tipo: ItemSDTipo;
  descricao: string;
  cobranca: CobrancaSD;
  /** Horas (quando o item é medido por hora). */
  horas?: number;
  /** Quando preenchido (> 0), sobrepõe o cálculo automático. */
  valorManual?: number;
  ativo: boolean;
}

export const ITENS_ADICIONAIS_SD_SEED: ItemAdicionalSD[] = [
  { id: "sd-ia-01", tipo: "canal-adicional", descricao: "Canal de atendimento adicional", cobranca: "mensal", ativo: true },
  { id: "sd-ia-02", tipo: "hora-escalonamento-n2", descricao: "Hora adicional de escalonamento N2", cobranca: "mensal", horas: 1, ativo: true },
  { id: "sd-ia-03", tipo: "integracao-itsm-cliente", descricao: "Integração com o ITSM do cliente", cobranca: "one-time", ativo: true },
  { id: "sd-ia-04", tipo: "base-conhecimento-setup", descricao: "Implantação da Base de Conhecimento", cobranca: "one-time", ativo: true },
  { id: "sd-ia-05", tipo: "site-presencial", descricao: "Site presencial adicional (dedicado)", cobranca: "mensal", ativo: true },
  { id: "sd-ia-06", tipo: "usuario-adicional", descricao: "Usuário atendido adicional", cobranca: "mensal", ativo: true },
  { id: "sd-ia-07", tipo: "chatbot-ia-setup", descricao: "Chatbot com IA — implantação", cobranca: "one-time", ativo: true },
];

export interface ItemSDValor {
  valor: number;
  detalhe?: string;
}

export interface ItemSDCtx {
  state: ServiceDeskState;
  /** Custo mensal de um FTE dedicado (equipe). */
  custoPorFTE: number;
  fatorVenda: number;
}

export function createItemAdicionalSDCalculator(ctx: ItemSDCtx) {
  const { state, custoPorFTE, fatorVenda } = ctx;
  const um = computeUMAtendimento(
    {
      qtdUsuariosPadrao: state.qtdUsuariosPadrao,
      qtdUsuariosVIP: state.qtdUsuariosVIP,
      qtdEstacoes: state.qtdEstacoes,
    },
    state.atendimentoPesos,
  );
  const custoPorUMMarginal = computeCustoPorUMAtendimentoMarginal(um, state.atendimentoFaixas);
  const chamadosPorUsuario =
    state.qtdUsuariosPadrao + state.qtdUsuariosVIP > 0
      ? state.volumeBrutoMes / (state.qtdUsuariosPadrao + state.qtdUsuariosVIP)
      : 0;
  const custoPorChamadoN1 =
    state.produtividadeChamadosFTE > 0 ? custoPorFTE / state.produtividadeChamadosFTE : 0;

  return function computeItemSD(it: ItemAdicionalSD): ItemSDValor {
    if (typeof it.valorManual === "number" && it.valorManual > 0) {
      return { valor: it.valorManual };
    }
    const horas = it.horas && it.horas > 0 ? it.horas : 1;
    switch (it.tipo) {
      case "canal-adicional":
        return { valor: (state.custoPorCanalAdicional || 0) * fatorVenda };
      case "hora-escalonamento-n2":
        return {
          valor: horas * (state.valorHoraEscalonamento || 0) * fatorVenda,
          detalhe: horas > 1 ? `${horas.toFixed(1)}h × valor hora N2` : undefined,
        };
      case "integracao-itsm-cliente":
        return { valor: (state.custoIntegracaoOneTime || 0) * fatorVenda, detalhe: "valor único" };
      case "base-conhecimento-setup":
        return { valor: (state.baseConhecimentoSetup || 0) * fatorVenda, detalhe: "valor único" };
      case "site-presencial":
        return {
          valor:
            (custoPorFTE + (state.custoFTEDedicadoAdicional || 0)) * fatorVenda,
          detalhe: "por FTE dedicado no site",
        };
      case "usuario-adicional": {
        const custoMonit = custoPorUMMarginal * (state.atendimentoPesos.usuarioPadrao || 1);
        const custoChamados = chamadosPorUsuario * custoPorChamadoN1;
        return {
          valor: (custoMonit + custoChamados) * fatorVenda,
          detalhe: `${chamadosPorUsuario.toFixed(1)} ch/mês previstos`,
        };
      }
      case "chatbot-ia-setup":
        return { valor: (state.chatbotIASetup || 0) * fatorVenda, detalhe: "valor único" };
      default:
        return { valor: it.valorManual ?? 0 };
    }
  };
}