import { createContext, useContext, ReactNode, useEffect, useCallback } from "react";
import { useITSMCalculator, ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { useN1TeamState, N1TeamState, N1TeamResults } from "@/hooks/useN1TeamState";
import { useN2TeamState, N2TeamState, N2TeamResults } from "@/hooks/useN2TeamState";
import type { PricingPreset } from "@/hooks/usePricingPresets";

interface ITSMContextType {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
  updateFunnel: (level: "percN1" | "percN2" | "percN3", value: number) => void;
  results: ITSMResults;
  n1Team: N1TeamState;
  updateN1Professional: ReturnType<typeof useN1TeamState>["updateProfessional"];
  addN1Professional: ReturnType<typeof useN1TeamState>["addProfessional"];
  removeN1Professional: ReturnType<typeof useN1TeamState>["removeProfessional"];
  updateN1Config: ReturnType<typeof useN1TeamState>["updateTeamConfig"];
  n1Results: N1TeamResults;
  n2Team: N2TeamState;
  updateN2Professional: ReturnType<typeof useN2TeamState>["updateProfessional"];
  addN2Professional: ReturnType<typeof useN2TeamState>["addProfessional"];
  removeN2Professional: ReturnType<typeof useN2TeamState>["removeProfessional"];
  updateN2Config: ReturnType<typeof useN2TeamState>["updateTeamConfig"];
  n2Results: N2TeamResults;
  loadPreset: (preset: PricingPreset) => void;
}

const ITSMContext = createContext<ITSMContextType | null>(null);

export function ITSMProvider({ children }: { children: ReactNode }) {
  const calc = useITSMCalculator();
  const n1 = useN1TeamState();
  const n2 = useN2TeamState();

  useEffect(() => {
    calc.update("custoPessoaN1", n1.results.custoTotalEquipe / 4);
    calc.update("capacidadeChamadosN1", n1.teamState.capacidadeTimeTotal);
    calc.update("percGestaoN1", 0);
  }, [n1.results.custoTotalEquipe, n1.teamState.capacidadeTimeTotal]);

  useEffect(() => {
    calc.update("custoAnalistaN2", n2.results.custoTotalEquipe);
    calc.update("capacidadeServidoresN2", n2.teamState.capacidadeServidoresTotal);
    calc.update("percGestaoN2", 0);
  }, [n2.results.custoTotalEquipe, n2.teamState.capacidadeServidoresTotal]);

  const loadPreset = useCallback((preset: PricingPreset) => {
    calc.setState(preset.calculator);
    n1.setTeamState(preset.n1Team);
    if (preset.n2Team) n2.setTeamState(preset.n2Team);
  }, [calc.setState, n1.setTeamState, n2.setTeamState]);

  const value: ITSMContextType = {
    state: calc.state,
    update: calc.update,
    updateFunnel: calc.updateFunnel,
    results: calc.results,
    n1Team: n1.teamState,
    updateN1Professional: n1.updateProfessional,
    addN1Professional: n1.addProfessional,
    removeN1Professional: n1.removeProfessional,
    updateN1Config: n1.updateTeamConfig,
    n1Results: n1.results,
    n2Team: n2.teamState,
    updateN2Professional: n2.updateProfessional,
    addN2Professional: n2.addProfessional,
    removeN2Professional: n2.removeProfessional,
    updateN2Config: n2.updateTeamConfig,
    n2Results: n2.results,
    loadPreset,
  };

  return <ITSMContext.Provider value={value}>{children}</ITSMContext.Provider>;
}

export function useITSMContext() {
  const ctx = useContext(ITSMContext);
  if (!ctx) throw new Error("useITSMContext must be used within ITSMProvider");
  return ctx;
}
