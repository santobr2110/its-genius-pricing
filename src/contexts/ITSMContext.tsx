import { createContext, useContext, ReactNode, useEffect, useCallback } from "react";
import { useITSMCalculator, ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { useN1TeamState, N1TeamState, N1TeamResults } from "@/hooks/useN1TeamState";
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
  loadPreset: (preset: PricingPreset) => void;
}

const ITSMContext = createContext<ITSMContextType | null>(null);

export function ITSMProvider({ children }: { children: ReactNode }) {
  const calc = useITSMCalculator();
  const n1 = useN1TeamState();

  useEffect(() => {
    calc.update("custoPessoaN1", n1.results.custoTotalEquipe / 4);
    calc.update("capacidadeChamadosN1", n1.teamState.capacidadeTimeTotal);
    calc.update("percGestaoN1", 0);
  }, [n1.results.custoTotalEquipe, n1.teamState.capacidadeTimeTotal]);

  const loadPreset = useCallback((preset: PricingPreset) => {
    calc.setState(preset.calculator);
    n1.setTeamState(preset.n1Team);
  }, [calc.setState, n1.setTeamState]);

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
    loadPreset,
  };

  return <ITSMContext.Provider value={value}>{children}</ITSMContext.Provider>;
}

export function useITSMContext() {
  const ctx = useContext(ITSMContext);
  if (!ctx) throw new Error("useITSMContext must be used within ITSMProvider");
  return ctx;
}
