import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useServiceDeskItensAdicionais,
  useServiceDeskRotinasOff,
  useServiceDeskState,
} from "@/hooks/servicedesk/useServiceDeskState";
import { useServiceDeskTeamState } from "@/hooks/servicedesk/useServiceDeskTeamState";
import { calcServiceDesk, type ServiceDeskResults } from "@/lib/servicedesk/calcServiceDesk";
import {
  createItemAdicionalSDCalculator,
  type ItemAdicionalSD,
  type ItemSDValor,
} from "@/lib/servicedesk/itensAdicionaisSD";

type StateHook = ReturnType<typeof useServiceDeskState>;
type TeamHook = ReturnType<typeof useServiceDeskTeamState>;

interface ServiceDeskContextValue {
  state: StateHook["state"];
  setState: StateHook["setState"];
  update: StateHook["update"];
  reset: StateHook["reset"];
  team: TeamHook;
  results: ServiceDeskResults;
  itens: ItemAdicionalSD[];
  setItens: (v: ItemAdicionalSD[] | ((p: ItemAdicionalSD[]) => ItemAdicionalSD[])) => void;
  valorItem: (item: ItemAdicionalSD) => ItemSDValor;
  rotinasOff: string[];
  toggleRotina: (id: string) => void;
  toggleTodasRotinas: (ids: string[], ativar: boolean) => void;
}

const ServiceDeskContext = createContext<ServiceDeskContextValue | null>(null);

export function ServiceDeskProvider({ children }: { children: ReactNode }) {
  const { state, setState, update, reset } = useServiceDeskState();
  const team = useServiceDeskTeamState();
  const { itens, setItens } = useServiceDeskItensAdicionais();
  const { rotinasOff, toggleRotina, toggleTodas } = useServiceDeskRotinasOff();

  const results = useMemo(
    () =>
      calcServiceDesk({
        state,
        custoTotalEquipe: team.results.custoTotalEquipe,
        totalPessoas: team.results.totalPessoas,
        rotinasOff: new Set(rotinasOff),
      }),
    [state, team.results.custoTotalEquipe, team.results.totalPessoas, rotinasOff],
  );

  const valorItem = useMemo(
    () =>
      createItemAdicionalSDCalculator({
        state,
        custoPorFTE: results.custoPorFTE,
        fatorVenda: results.cascata.fatorVenda,
      }),
    [state, results.custoPorFTE, results.cascata.fatorVenda],
  );

  const value: ServiceDeskContextValue = {
    state,
    setState,
    update,
    reset,
    team,
    results,
    itens,
    setItens,
    valorItem,
    rotinasOff,
    toggleRotina,
    toggleTodasRotinas: toggleTodas,
  };

  return <ServiceDeskContext.Provider value={value}>{children}</ServiceDeskContext.Provider>;
}

export function useServiceDesk() {
  const ctx = useContext(ServiceDeskContext);
  if (!ctx) throw new Error("useServiceDesk deve ser usado dentro de ServiceDeskProvider");
  return ctx;
}