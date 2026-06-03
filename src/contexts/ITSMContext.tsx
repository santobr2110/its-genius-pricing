import { createContext, useContext, ReactNode, useEffect, useCallback, useMemo } from "react";
import { useITSMCalculator, ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { useN1TeamState, N1TeamState, N1TeamResults } from "@/hooks/useN1TeamState";
import { useN2TeamState, N2TeamState, N2TeamResults } from "@/hooks/useN2TeamState";
import { useFieldTeamsState, FieldTeamsState, FieldTeamsResults, FieldLevel } from "@/hooks/useFieldTeamsState";
import type { PricingPreset } from "@/hooks/usePricingPresets";
import { SMART_ITO_NS } from "@/lib/offerings";
import { notifyPersistentStateRestored, usePersistentState } from "@/hooks/usePersistentState";
import { supabase } from "@/integrations/supabase/client";
import { applyParamsPayload } from "@/hooks/useParameterProfiles";
import { useActivePresetSession, type ActivePresetStatus } from "@/hooks/useActivePresetSession";
import { isPresetActive } from "@/lib/activePreset";
import { toast } from "sonner";
import { type Rotina, ROTINAS_DEFAULT } from "@/data/rotinas";
import { type Gmud, GMUDS_DEFAULT } from "@/data/gmuds";
import {
  computeExtrasOperacionais,
  recomputeComposicaoComExtras,
  type ExtrasOperacionais,
} from "@/lib/extrasOperacionais";
import {
  DEFAULT_COMISSAO_TIERS,
  comissaoFromRent,
  type ComissaoTier,
} from "@/lib/comissaoRentabilidade";

interface ITSMContextType {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
  updateFunnel: (level: "percN1" | "percN2" | "percN3", value: number) => void;
  results: ITSMResults;
  extrasOperacionais: ExtrasOperacionais;
  comissaoTiers: ComissaoTier[];
  setComissaoTiers: (t: ComissaoTier[]) => void;
  n1Team: N1TeamState;
  updateN1Professional: ReturnType<typeof useN1TeamState>["updateProfessional"];
  addN1Professional: ReturnType<typeof useN1TeamState>["addProfessional"];
  removeN1Professional: ReturnType<typeof useN1TeamState>["removeProfessional"];
  moveN1Professional: ReturnType<typeof useN1TeamState>["moveProfessional"];
  updateN1Config: ReturnType<typeof useN1TeamState>["updateTeamConfig"];
  n1Results: N1TeamResults;
  n2Team: N2TeamState;
  updateN2Professional: ReturnType<typeof useN2TeamState>["updateProfessional"];
  addN2Professional: ReturnType<typeof useN2TeamState>["addProfessional"];
  removeN2Professional: ReturnType<typeof useN2TeamState>["removeProfessional"];
  moveN2Professional: ReturnType<typeof useN2TeamState>["moveProfessional"];
  updateN2Config: ReturnType<typeof useN2TeamState>["updateTeamConfig"];
  n2Results: N2TeamResults;
  fieldTeams: FieldTeamsState;
  fieldResults: FieldTeamsResults;
  updateFieldProfessional: ReturnType<typeof useFieldTeamsState>["updateProfessional"];
  addFieldProfessional: ReturnType<typeof useFieldTeamsState>["addProfessional"];
  removeFieldProfessional: ReturnType<typeof useFieldTeamsState>["removeProfessional"];
  updateFieldLevelConfig: ReturnType<typeof useFieldTeamsState>["updateLevelConfig"];
  loadPreset: (preset: PricingPreset) => void;
  activePreset: ActivePresetStatus;
}

const ITSMContext = createContext<ITSMContextType | null>(null);

export function ITSMProvider({ children }: { children: ReactNode }) {
  const calc = useITSMCalculator();
  const n1 = useN1TeamState();
  const n2 = useN2TeamState();
  const field = useFieldTeamsState();
  const activePreset = useActivePresetSession();

  // Rotinas e GMUDs precisam estar no contexto para que `custoTotalOperacao`
  // e a composição do PV reflitam os mesmos extras exibidos nas camadas Smart
  // e no Relatório de Proposição (Configurações Financeiras vs Camadas vs
  // Relatório passam a usar a mesma base de custo).
  const [rotinas] = usePersistentState<Rotina[]>("gestao-ti:rotinas", ROTINAS_DEFAULT);
  const [gmuds] = usePersistentState<Gmud[]>("gestao-ti:gmuds", GMUDS_DEFAULT);

  // Tabela de comissão por faixa de rentabilidade (editável em Configurações Financeiras).
  const [comissaoTiers, setComissaoTiers] = usePersistentState<ComissaoTier[]>(
    "itsm:comissaoTiers:v1",
    DEFAULT_COMISSAO_TIERS,
  );

  // Sincroniza automaticamente a comissão com base na rentabilidade (lucroPerc)
  // usando a tabela. Sempre que rentabilidade ou tiers mudarem, a comissão é
  // recalculada — mantendo o markup coerente em toda a calculadora.
  useEffect(() => {
    const next = comissaoFromRent(calc.state.lucroPerc || 0, comissaoTiers);
    if (Math.abs((calc.state.comissaoPerc || 0) - next) > 1e-6) {
      calc.update("comissaoPerc", next);
    }
  }, [calc.state.lucroPerc, comissaoTiers, calc.state.comissaoPerc, calc.update]);

  const extrasOperacionais = useMemo(
    () => computeExtrasOperacionais(calc.state, calc.results, rotinas, gmuds),
    [calc.state, calc.results, rotinas, gmuds],
  );

  const unifiedResults = useMemo(
    () => recomputeComposicaoComExtras(calc.state, calc.results, extrasOperacionais.custoTotal),
    [calc.state, calc.results, extrasOperacionais.custoTotal],
  );

  useEffect(() => {
    const nextCusto = n1.results.custoTotalEquipe / 4;
    const nextCapacidade = n1.teamState.capacidadeTimeTotal;
    if (
      calc.state.custoPessoaN1 === nextCusto &&
      calc.state.capacidadeChamadosN1 === nextCapacidade &&
      calc.state.percGestaoN1 === 0
    ) return;

    calc.setState((prev) => ({
      ...prev,
      custoPessoaN1: nextCusto,
      capacidadeChamadosN1: nextCapacidade,
      percGestaoN1: 0,
    }));
  }, [n1.results.custoTotalEquipe, n1.teamState.capacidadeTimeTotal, calc.state.custoPessoaN1, calc.state.capacidadeChamadosN1, calc.state.percGestaoN1, calc.setState]);

  useEffect(() => {
    const nextCusto = n2.results.custoTotalEquipe;
    const nextCapacidade = n2.teamState.capacidadeChamadosTotal;
    if (
      calc.state.custoAnalistaN2 === nextCusto &&
      calc.state.capacidadeChamadosN2 === nextCapacidade &&
      calc.state.percGestaoN2 === 0
    ) return;

    calc.setState((prev) => ({
      ...prev,
      custoAnalistaN2: nextCusto,
      capacidadeChamadosN2: nextCapacidade,
      percGestaoN2: 0,
    }));
  }, [n2.results.custoTotalEquipe, n2.teamState.capacidadeChamadosTotal, calc.state.custoAnalistaN2, calc.state.capacidadeChamadosN2, calc.state.percGestaoN2, calc.setState]);

  useEffect(() => {
    const nextCusto = field.results.n1f.custoTotalEquipe;
    const nextCapacidade = field.state.n1f.capacidadeChamadosTotal;
    const nextCustoUm = field.results.n1f.custoUmProfissional;
    if (
      calc.state.custoEquipeFieldN1 === nextCusto &&
      calc.state.capacidadeFieldN1 === nextCapacidade &&
      calc.state.custoUmFieldN1 === nextCustoUm
    ) return;
    calc.setState((prev) => ({ ...prev, custoEquipeFieldN1: nextCusto, capacidadeFieldN1: nextCapacidade, custoUmFieldN1: nextCustoUm }));
  }, [field.results.n1f.custoTotalEquipe, field.state.n1f.capacidadeChamadosTotal, field.results.n1f.custoUmProfissional, calc.state.custoEquipeFieldN1, calc.state.capacidadeFieldN1, calc.state.custoUmFieldN1, calc.setState]);
  useEffect(() => {
    const nextCusto = field.results.n2f.custoTotalEquipe;
    const nextCapacidade = field.state.n2f.capacidadeChamadosTotal;
    const nextCustoUm = field.results.n2f.custoUmProfissional;
    if (
      calc.state.custoEquipeFieldN2 === nextCusto &&
      calc.state.capacidadeFieldN2 === nextCapacidade &&
      calc.state.custoUmFieldN2 === nextCustoUm
    ) return;
    calc.setState((prev) => ({ ...prev, custoEquipeFieldN2: nextCusto, capacidadeFieldN2: nextCapacidade, custoUmFieldN2: nextCustoUm }));
  }, [field.results.n2f.custoTotalEquipe, field.state.n2f.capacidadeChamadosTotal, field.results.n2f.custoUmProfissional, calc.state.custoEquipeFieldN2, calc.state.capacidadeFieldN2, calc.state.custoUmFieldN2, calc.setState]);
  useEffect(() => {
    const nextCusto = field.results.n3f.custoTotalEquipe;
    const nextCapacidade = field.state.n3f.capacidadeChamadosTotal;
    const nextCustoUm = field.results.n3f.custoUmProfissional;
    if (
      calc.state.custoEquipeFieldN3 === nextCusto &&
      calc.state.capacidadeFieldN3 === nextCapacidade &&
      calc.state.custoUmFieldN3 === nextCustoUm
    ) return;
    calc.setState((prev) => ({ ...prev, custoEquipeFieldN3: nextCusto, capacidadeFieldN3: nextCapacidade, custoUmFieldN3: nextCustoUm }));
  }, [field.results.n3f.custoTotalEquipe, field.state.n3f.capacidadeChamadosTotal, field.results.n3f.custoUmProfissional, calc.state.custoEquipeFieldN3, calc.state.capacidadeFieldN3, calc.state.custoUmFieldN3, calc.setState]);

  const loadPreset = useCallback((preset: PricingPreset) => {
    // Em uma aba que já está editando uma precificação, "carregar" não faz
    // sentido (poderia sobrescrever silenciosamente o preset aberto).
    if (isPresetActive()) {
      toast.info("Esta aba já está editando uma precificação. Abra a nova em outra aba.");
      return;
    }
    // Se o preset trouxer o snapshot completo de parâmetros (presets novos),
    // restaura tudo (equipes Field, rotinas, GMUDs, cortes Smart Perf, escopo)
    // via mesmo mecanismo dos Perfis de Parâmetros.
    if (preset.allParams && Object.keys(preset.allParams).length > 0) {
      void applyParamsPayload(preset.allParams);
      return;
    }
    calc.setState(preset.calculator);
    n1.setTeamState(preset.n1Team);
    if (preset.n2Team) n2.setTeamState(preset.n2Team);
    // Restaura também os parâmetros de Escopo (proposição, restrições gerais
    // e itens adicionais ao contrato), quando presentes no preset.
    const escopo = preset.escopo;
    if (escopo && typeof window !== "undefined") {
      const entries: Array<[string, unknown]> = [];
      if (escopo.proposicao) entries.push(["escopo:proposicao", escopo.proposicao]);
      if (escopo.restricoesGerais) entries.push(["escopo:restricoesGerais", escopo.restricoesGerais]);
      if (escopo.itensAdicionais) entries.push(["escopo:itensAdicionais", escopo.itensAdicionais]);
      for (const [rawKey, value] of entries) {
        const key = SMART_ITO_NS + rawKey;
        try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
        notifyPersistentStateRestored(key, value);
      }
      // Persiste em nuvem (user_app_state) para sincronizar entre dispositivos.
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user || entries.length === 0) return;
        const rows = entries.map(([rawKey, value]) => ({
          user_id: user.id,
          key: SMART_ITO_NS + rawKey,
          value: value as never,
        }));
        void supabase.from("user_app_state").upsert(rows, { onConflict: "user_id,key" });
      });
    }
  }, [calc.setState, n1.setTeamState, n2.setTeamState]);

  const value: ITSMContextType = {
    state: calc.state,
    update: calc.update,
    updateFunnel: calc.updateFunnel,
    results: unifiedResults,
    extrasOperacionais,
    comissaoTiers,
    setComissaoTiers,
    n1Team: n1.teamState,
    updateN1Professional: n1.updateProfessional,
    addN1Professional: n1.addProfessional,
    removeN1Professional: n1.removeProfessional,
    moveN1Professional: n1.moveProfessional,
    updateN1Config: n1.updateTeamConfig,
    n1Results: n1.results,
    n2Team: n2.teamState,
    updateN2Professional: n2.updateProfessional,
    addN2Professional: n2.addProfessional,
    removeN2Professional: n2.removeProfessional,
    moveN2Professional: n2.moveProfessional,
    updateN2Config: n2.updateTeamConfig,
    n2Results: n2.results,
    fieldTeams: field.state,
    fieldResults: field.results,
    updateFieldProfessional: field.updateProfessional,
    addFieldProfessional: field.addProfessional,
    removeFieldProfessional: field.removeProfessional,
    updateFieldLevelConfig: field.updateLevelConfig,
    loadPreset,
    activePreset,
  };

  return <ITSMContext.Provider value={value}>{children}</ITSMContext.Provider>;
}

export function useITSMContext() {
  const ctx = useContext(ITSMContext);
  if (!ctx) throw new Error("useITSMContext must be used within ITSMProvider");
  return ctx;
}
