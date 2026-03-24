import { createContext, useContext, ReactNode } from "react";
import { useITSMCalculator, ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { useN1TeamState, N1TeamState, N1TeamResults } from "@/hooks/useN1TeamState";

interface ITSMContextType {
  state: ITSMState;
  update: <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => void;
  updateFunnel: (level: "percN1" | "percN2" | "percN3", value: number) => void;
  results: ITSMResults;
  // N1 Team
  n1Team: N1TeamState;
  updateN1Professional: ReturnType<typeof useN1TeamState>["updateProfessional"];
  addN1Professional: ReturnType<typeof useN1TeamState>["addProfessional"];
  removeN1Professional: ReturnType<typeof useN1TeamState>["removeProfessional"];
  updateN1Config: ReturnType<typeof useN1TeamState>["updateTeamConfig"];
  n1Results: N1TeamResults;
}

const ITSMContext = createContext<ITSMContextType | null>(null);

export function ITSMProvider({ children }: { children: ReactNode }) {
  const calc = useITSMCalculator();
  const n1 = useN1TeamState();

  const value: ITSMContextType = {
    ...calc,
    n1Team: n1.teamState,
    updateN1Professional: n1.updateProfessional,
    addN1Professional: n1.addProfessional,
    removeN1Professional: n1.removeProfessional,
    updateN1Config: n1.updateTeamConfig,
    n1Results: n1.results,
  };

  return <ITSMContext.Provider value={value}>{children}</ITSMContext.Provider>;
}

export function useITSMContext() {
  const ctx = useContext(ITSMContext);
  if (!ctx) throw new Error("useITSMContext must be used within ITSMProvider");
  return ctx;
}
