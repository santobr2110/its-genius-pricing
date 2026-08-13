import PptxGenJS from "pptxgenjs";
import type { ServiceDeskResults } from "./calcServiceDesk";
import type { ServiceDeskState } from "./types";
import { brl, pct, vol } from "./format";
import { JANELA_LABEL } from "./coberturaFTE";
import { CANAL_LABEL } from "./funilAtendimento";
import { ITSM_TIPO_LABEL, MODALIDADE_LABEL, REGIME_LABEL } from "./regimeCusto";
import { SLA_LABEL } from "./types";
import type { ItemAdicionalSD, ItemSDValor } from "./itensAdicionaisSD";

/** Dados de um gate renderizados como slide. */
export interface GateSlideData {
  titulo: string;
  conteudo: string[];
  metrica1?: { label: string; valor: string };
  metrica2?: { label: string; valor: string };
}

export interface ExportSDInput {
  state: ServiceDeskState;
  results: ServiceDeskResults;
  itens: ItemAdicionalSD[];
  valorItem: (i: ItemAdicionalSD) => ItemSDValor;
  cliente?: string | null;
  codigoProposta?: string | null;
  watermark?: string | null;
}

const AZUL = "1F3B73";
const CINZA = "5B6472";

export function buildGateSlides({
  state, results, itens, valorItem,
}: ExportSDInput): GateSlideData[] {
  const slides: GateSlideData[] = [
    {
      titulo: "Modelo de Operação",
      conteudo: [
        `Modalidade: ${MODALIDADE_LABEL[state.modalidade]}`,
        `Ferramenta ITSM: ${ITSM_TIPO_LABEL[state.itsmTipo]}`,
        `Regime de custo: ${REGIME_LABEL[results.regime]}`,
        `Janela de atendimento: ${JANELA_LABEL[state.janelaCobertura]}`,
      ],
      metrica1: { label: "FTE contratado", valor: vol(results.cobertura.fteContratado) },
      metrica2: { label: "Nível de SLA", valor: SLA_LABEL[state.nivelSLA] },
    },
    {
      titulo: "Demanda de Atendimento",
      conteudo: [
        `Volume bruto: ${vol(results.funil.volumeBruto)} contatos/mês`,
        `Desvio por autoatendimento: ${vol(results.funil.desviadoAutoatendimento)}`,
        `Resolvido na triagem: ${vol(results.funil.resolvidoTriagem)}`,
        `Chamados atendidos no N1: ${vol(results.funil.chamadosN1)}`,
        `Chamados escalonados: ${vol(results.funil.chamadosEscalonados)}`,
      ],
      metrica1: { label: "Usuários atendidos", valor: vol(state.qtdUsuariosPadrao + state.qtdUsuariosVIP) },
      metrica2: { label: "Taxa de desvio", valor: pct(results.funil.taxaDesvioTotalPct) },
    },
    {
      titulo: "Bolsa de Horas de Escalonamento",
      conteudo: [
        `Chamados escalonados: ${vol(results.distribuicaoHoras.chamados)} h`,
        `Rotinas preventivas: ${vol(results.distribuicaoHoras.rotinas)} h`,
        `Horas de melhoria: ${vol(results.distribuicaoHoras.melhoria)} h`,
        `Horas técnicas: ${vol(results.distribuicaoHoras.tecnicas)} h`,
      ],
      metrica1: { label: "Bolsa contratada", valor: `${vol(results.distribuicaoHoras.total)} h` },
      metrica2: { label: "Valor hora", valor: brl(state.valorHoraEscalonamento) },
    },
    {
      titulo: "Canais e Experiência",
      conteudo: [
        `Canais contratados: ${state.canais.map((c) => CANAL_LABEL[c]).join(", ") || "—"}`,
        `Base de Conhecimento: ${state.baseConhecimentoAtiva ? "incluída" : "não incluída"}`,
        `Chatbot com IA: ${state.chatbotIA ? "incluído" : "não incluído"}`,
      ],
      metrica1: { label: "Canais adicionais", valor: vol(results.canaisAdicionais) },
      metrica2: { label: "Investimento canais", valor: brl(results.custoCanaisAdicionais) },
    },
  ];

  if (state.rotinasAtivas && (results.rotinas.base.length || results.rotinas.avancado.length)) {
    slides.push({
      titulo: "Rotinas Preventivas",
      conteudo: [
        ...results.rotinas.base.slice(0, 8).map((r) => `${r.rotina.rotina} — ${r.rotina.frequencia} (Base)`),
        ...results.rotinas.avancado.slice(0, 4).map((r) => `${r.rotina.rotina} — ${r.rotina.frequencia} (Avançado)`),
      ],
      metrica1: { label: "Horas na bolsa", valor: `${vol(results.rotinas.horasBase)} h` },
      metrica2: { label: "Rotinas avançadas", valor: brl(results.rotinas.custoAvancado) },
    });
  }

  if (state.modalidade !== "remoto" && state.sites.length > 0) {
    slides.push({
      titulo: "Atendimento Presencial",
      conteudo: state.sites.map((s) => `${s.nome}${s.cidade ? ` — ${s.cidade}` : ""}: ${vol(s.headcount)} FTE dedicado(s)`),
      metrica1: { label: "Sites", valor: vol(state.sites.length) },
      metrica2: { label: "FTE dedicados", valor: vol(results.fteDedicadoSites) },
    });
  }

  const ativos = itens.filter((i) => i.ativo);
  if (ativos.length > 0) {
    slides.push({
      titulo: "Itens Adicionais",
      conteudo: ativos.map((i) => {
        const v = valorItem(i);
        return `${i.descricao}: ${brl(v.valor)}${i.cobranca === "one-time" ? " (valor único)" : "/mês"}`;
      }),
    });
  }

  slides.push({
    titulo: "Investimento",
    conteudo: [
      `Preço de venda mensal: ${brl(results.precoVendaMensal)}`,
      `Investimento por usuário: ${brl(results.precoPorUsuario)}`,
      `Investimento por chamado atendido: ${brl(results.precoPorChamado)}`,
      results.custoOneTime > 0 ? `Valores únicos de implantação: ${brl(results.custoOneTime)}` : "Sem valores únicos de implantação",
    ],
    metrica1: { label: "Mensalidade", valor: brl(results.precoVendaMensal) },
    metrica2: { label: "Por usuário", valor: brl(results.precoPorUsuario) },
  });

  return slides;
}

export async function exportarApresentacaoServiceDesk(input: ExportSDInput) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const capa = pptx.addSlide();
  capa.addText("Smart Service Desk", { x: 0.6, y: 2.1, fontSize: 34, bold: true, color: AZUL });
  capa.addText(input.cliente ? `Proposta para ${input.cliente}` : "Proposta comercial", {
    x: 0.6, y: 2.9, fontSize: 16, color: CINZA,
  });
  if (input.codigoProposta) {
    capa.addText(input.codigoProposta, { x: 0.6, y: 3.4, fontSize: 12, color: CINZA });
  }

  for (const g of buildGateSlides(input)) {
    const s = pptx.addSlide();
    s.addText(g.titulo, { x: 0.5, y: 0.4, fontSize: 22, bold: true, color: AZUL });
    s.addText(g.conteudo.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })), {
      x: 0.6, y: 1.2, w: 6.2, h: 3.6, fontSize: 13, color: "333333",
    });
    if (g.metrica1) {
      s.addText(g.metrica1.valor, { x: 7.1, y: 1.4, w: 2.6, fontSize: 22, bold: true, color: AZUL, align: "center" });
      s.addText(g.metrica1.label, { x: 7.1, y: 2.0, w: 2.6, fontSize: 11, color: CINZA, align: "center" });
    }
    if (g.metrica2) {
      s.addText(g.metrica2.valor, { x: 7.1, y: 2.9, w: 2.6, fontSize: 22, bold: true, color: AZUL, align: "center" });
      s.addText(g.metrica2.label, { x: 7.1, y: 3.5, w: 2.6, fontSize: 11, color: CINZA, align: "center" });
    }
    if (input.watermark) {
      s.addText(input.watermark, {
        x: 1, y: 2.4, w: 8, h: 1.2, fontSize: 44, bold: true, color: "DDDDDD",
        align: "center", rotate: 340,
      });
    }
  }

  await pptx.writeFile({
    fileName: `Smart-Service-Desk-${(input.cliente ?? "proposta").replace(/\s+/g, "-")}.pptx`,
  });
}