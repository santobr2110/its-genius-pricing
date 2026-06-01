// @refresh reset
import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePersistentState } from "./usePersistentState";

export type FieldLevel = "n1f" | "n2f" | "n3f";

export interface FieldProfessional {
  id: string;
  cargo: string;
  quantidade: number;
  salarioBase: number;
  encargosPerc: number;
  beneficiosFixo: number;
  custosIndiretosPerc: number;
  escala: string;
}

export interface FieldLevelState {
  professionals: FieldProfessional[];
  capacidadeChamadosTotal: number;
}

export interface FieldTeamsState {
  n1f: FieldLevelState;
  n2f: FieldLevelState;
  n3f: FieldLevelState;
}

export interface FieldLevelResults {
  custoTotalFolha: number;
  custoTotalEncargos: number;
  custoTotalBeneficios: number;
  custoTotalIndiretos: number;
  custoTotalEquipe: number;
  totalPessoas: number;
  custoPorPessoa: number;
  custoPorChamado: number;
  custoUmProfissional: number;
}

export interface FieldTeamsResults {
  n1f: FieldLevelResults;
  n2f: FieldLevelResults;
  n3f: FieldLevelResults;
}

const genId = (lvl: FieldLevel) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${lvl}-${crypto.randomUUID()}`;
  }
  return `${lvl}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const DEFAULT_STATE: FieldTeamsState = {
  n1f: {
    professionals: [
      { id: genId("n1f"), cargo: "Técnico Field N1", quantidade: 2, salarioBase: 2800, encargosPerc: 68, beneficiosFixo: 1100, custosIndiretosPerc: 18, escala: "8x5" },
    ],
    capacidadeChamadosTotal: 600,
  },
  n2f: {
    professionals: [
      { id: genId("n2f"), cargo: "Analista Field N2", quantidade: 1, salarioBase: 5000, encargosPerc: 68, beneficiosFixo: 1300, custosIndiretosPerc: 18, escala: "8x5" },
    ],
    capacidadeChamadosTotal: 200,
  },
  n3f: {
    professionals: [
      { id: genId("n3f"), cargo: "Especialista Field N3", quantidade: 1, salarioBase: 8500, encargosPerc: 68, beneficiosFixo: 1500, custosIndiretosPerc: 18, escala: "8x5" },
    ],
    capacidadeChamadosTotal: 80,
  },
};

function computeLevelResults(s: FieldLevelState): FieldLevelResults {
  let folha = 0, enc = 0, ben = 0, ind = 0, total = 0;
  for (const p of s.professionals) {
    const f = p.salarioBase * p.quantidade;
    const e = f * (p.encargosPerc / 100);
    const b = p.beneficiosFixo * p.quantidade;
    const i = (f + e + b) * (p.custosIndiretosPerc / 100);
    folha += f; enc += e; ben += b; ind += i; total += p.quantidade;
  }
  const custoTotalEquipe = folha + enc + ben + ind;
  // Custo de 1 profissional (primeiro perfil cadastrado, qty=1)
  let custoUmProfissional = 0;
  const first = s.professionals[0];
  if (first) {
    const f1 = first.salarioBase;
    const e1 = f1 * (first.encargosPerc / 100);
    const b1 = first.beneficiosFixo;
    const i1 = (f1 + e1 + b1) * (first.custosIndiretosPerc / 100);
    custoUmProfissional = f1 + e1 + b1 + i1;
  }
  return {
    custoTotalFolha: folha,
    custoTotalEncargos: enc,
    custoTotalBeneficios: ben,
    custoTotalIndiretos: ind,
    custoTotalEquipe,
    totalPessoas: total,
    custoPorPessoa: total > 0 ? custoTotalEquipe / total : 0,
    custoPorChamado: s.capacidadeChamadosTotal > 0 ? custoTotalEquipe / s.capacidadeChamadosTotal : 0,
    custoUmProfissional,
  };
}

export function useFieldTeamsState() {
  const [state, setState] = usePersistentState<FieldTeamsState>("itsm:fieldteams:v1", DEFAULT_STATE);

  const dedupedRef = useRef(false);
  useEffect(() => {
    if (dedupedRef.current) return;
    const levels: FieldLevel[] = ["n1f", "n2f", "n3f"];
    const hasDup = levels.some((lvl) => {
      const ids = state[lvl].professionals.map((p) => p.id);
      return new Set(ids).size !== ids.length;
    });
    if (!hasDup) { dedupedRef.current = true; return; }
    dedupedRef.current = true;
    setState((prev) => {
      const next = { ...prev };
      for (const lvl of levels) {
        const seen = new Set<string>();
        next[lvl] = {
          ...prev[lvl],
          professionals: prev[lvl].professionals.map((p) => {
            if (seen.has(p.id)) return { ...p, id: genId(lvl) };
            seen.add(p.id);
            return p;
          }),
        };
      }
      return next;
    });
  }, [state, setState]);

  const updateProfessional = useCallback(
    (level: FieldLevel, id: string, field: keyof Omit<FieldProfessional, "id">, value: number | string) => {
      setState((prev) => ({
        ...prev,
        [level]: {
          ...prev[level],
          professionals: prev[level].professionals.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
        },
      }));
    },
    []
  );

  const addProfessional = useCallback((level: FieldLevel) => {
    const np: FieldProfessional = {
      id: genId(level),
      cargo: "Novo Perfil Field",
      quantidade: 1,
      salarioBase: 3000,
      encargosPerc: 68,
      beneficiosFixo: 1100,
      custosIndiretosPerc: 18,
      escala: "8x5",
    };
    setState((prev) => ({ ...prev, [level]: { ...prev[level], professionals: [...prev[level].professionals, np] } }));
  }, []);

  const removeProfessional = useCallback((level: FieldLevel, id: string) => {
    setState((prev) => ({
      ...prev,
      [level]: { ...prev[level], professionals: prev[level].professionals.filter((p) => p.id !== id) },
    }));
  }, []);

  const updateLevelConfig = useCallback(
    (level: FieldLevel, key: "capacidadeChamadosTotal", value: number) => {
      setState((prev) => ({ ...prev, [level]: { ...prev[level], [key]: value } }));
    },
    []
  );

  const results: FieldTeamsResults = useMemo(
    () => ({
      n1f: computeLevelResults(state.n1f),
      n2f: computeLevelResults(state.n2f),
      n3f: computeLevelResults(state.n3f),
    }),
    [state]
  );

  return { state, setState, updateProfessional, addProfessional, removeProfessional, updateLevelConfig, results };
}
