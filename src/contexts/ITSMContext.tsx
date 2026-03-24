import { createContext, useContext, ReactNode, useEffect } from "react";
import { useITSMCalculator, ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { useN1TeamState, N1TeamState, N1TeamResults } from "@/hooks/useN1TeamState";

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
}

const ITSMContext = createContext<ITSMContextType | null>(null);

export function ITSMProvider({ children }: { children: ReactNode }) {
  const calc = useITSMCalculator();
  const n1 = useN1TeamState();

  // Sync: custo total equipe e capacidade do time → calculador principal
  useEffect(() => {
    // custoPessoaN1 no motor antigo era "custo por pessoa" × 4 × (1+gestão%)
    // Agora: custoPessoaN1 = custo total equipe (já inclui tudo)
    // percGestaoN1 = 0, pois custos indiretos já estão inclusos
    // capacidadeChamadosN1 = capacidade total do time
    // Fórmula antiga: custoPosicaoN1 = custoPessoaN1 * 4 * (1 + 0/100) = custoPessoaN1 * 4
    // Para que custoPosicaoN1 = custoTotalEquipe, setamos custoPessoaN1 = custoTotalEquipe / 4
    // Mas isso é um hack. Melhor: setar custoPessoaN1 = custoTotalEquipe e ajustar fórmula.
    // Simplest: custoPessoaN1 recebe custoTotalEquipe/4 para manter a fórmula *4 inalterada
    calc.update("custoPessoaN1", n1.results.custoTotalEquipe / 4);
    calc.update("capacidadeChamadosN1", n1.teamState.capacidadeTimeTotal);
    calc.update("percGestaoN1", 0);
  }, [n1.results.custoTotalEquipe, n1.teamState.capacidadeTimeTotal]);

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
