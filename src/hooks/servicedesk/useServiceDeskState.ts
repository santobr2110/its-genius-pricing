import { useCallback } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { SD_KEY } from "@/lib/servicedesk/namespace";
import {
  DEFAULT_SERVICE_DESK_STATE,
  type ServiceDeskState,
} from "@/lib/servicedesk/types";
import {
  ITENS_ADICIONAIS_SD_SEED,
  type ItemAdicionalSD,
} from "@/lib/servicedesk/itensAdicionaisSD";

export function useServiceDeskState() {
  const [state, setState] = usePersistentState<ServiceDeskState>(
    SD_KEY("sd:state:v1"),
    DEFAULT_SERVICE_DESK_STATE,
  );

  const update = useCallback(
    <K extends keyof ServiceDeskState>(field: K, value: ServiceDeskState[K]) => {
      setState((prev) => ({ ...prev, [field]: value }));
    },
    [setState],
  );

  const reset = useCallback(() => setState(DEFAULT_SERVICE_DESK_STATE), [setState]);

  return { state, setState, update, reset };
}

export function useServiceDeskItensAdicionais() {
  const [itens, setItens] = usePersistentState<ItemAdicionalSD[]>(
    SD_KEY("sd:itensAdicionais"),
    ITENS_ADICIONAIS_SD_SEED,
  );
  return { itens, setItens };
}

export function useServiceDeskRotinasOff() {
  const [rotinasOff, setRotinasOff] = usePersistentState<string[]>(
    SD_KEY("sd:rotinasOff"),
    [],
  );

  const toggleRotina = useCallback(
    (id: string) => {
      setRotinasOff((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    },
    [setRotinasOff],
  );

  const toggleTodas = useCallback(
    (ids: string[], ativar: boolean) => {
      setRotinasOff((prev) =>
        ativar ? prev.filter((x) => !ids.includes(x)) : Array.from(new Set([...prev, ...ids])),
      );
    },
    [setRotinasOff],
  );

  return { rotinasOff, setRotinasOff, toggleRotina, toggleTodas };
}