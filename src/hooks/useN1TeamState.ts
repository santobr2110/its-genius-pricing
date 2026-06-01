// @refresh reset
import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePersistentState } from "./usePersistentState";

export interface N1Professional {
  id: string;
  cargo: string;
  quantidade: number;
  salarioBase: number;
  encargosPerc: number;
  beneficiosFixo: number;
  custosIndiretosPerc: number;
  escala: string; // ex: "12x36", "8x5", "6x1"
}

export interface N1TeamState {
  professionals: N1Professional[];
  capacidadeTimeTotal: number; // chamados/mês que o time inteiro atende
}

export interface N1TeamResults {
  custoTotalFolha: number;
  custoTotalEncargos: number;
  custoTotalBeneficios: number;
  custoTotalIndiretos: number;
  custoTotalEquipe: number;
  totalPessoas: number;
  custoPorPessoa: number;
  custoPorChamado: number;
}

function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `n1-${crypto.randomUUID()}`;
  }
  return `n1-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_PROFESSIONALS: N1Professional[] = [
  {
    id: genId(),
    cargo: "Analista de Suporte Jr",
    quantidade: 4,
    salarioBase: 2200,
    encargosPerc: 68,
    beneficiosFixo: 900,
    custosIndiretosPerc: 15,
    escala: "12x36",
  },
  {
    id: genId(),
    cargo: "Analista de Suporte Pleno",
    quantidade: 1,
    salarioBase: 3200,
    encargosPerc: 68,
    beneficiosFixo: 900,
    custosIndiretosPerc: 15,
    escala: "8x5",
  },
  {
    id: genId(),
    cargo: "Supervisor de Operações",
    quantidade: 1,
    salarioBase: 5000,
    encargosPerc: 68,
    beneficiosFixo: 1100,
    custosIndiretosPerc: 15,
    escala: "8x5",
  },
];

const DEFAULT_STATE: N1TeamState = {
  professionals: DEFAULT_PROFESSIONALS,
  capacidadeTimeTotal: 1500,
};

export function useN1TeamState() {
  const [teamState, setTeamState] = usePersistentState<N1TeamState>("itsm:n1team:v1", DEFAULT_STATE);

  // Migração: corrige ids duplicados criados por versões antigas do gerador.
  const dedupedRef = useRef(false);
  useEffect(() => {
    if (dedupedRef.current) return;
    const ids = teamState.professionals.map((p) => p.id);
    const hasDup = new Set(ids).size !== ids.length;
    if (!hasDup) { dedupedRef.current = true; return; }
    dedupedRef.current = true;
    setTeamState((prev) => {
      const seen = new Set<string>();
      return {
        ...prev,
        professionals: prev.professionals.map((p) => {
          if (seen.has(p.id)) return { ...p, id: genId() };
          seen.add(p.id);
          return p;
        }),
      };
    });
  }, [teamState.professionals, setTeamState]);

  const updateProfessional = useCallback(
    (id: string, field: keyof Omit<N1Professional, "id">, value: number | string) => {
      setTeamState((prev) => ({
        ...prev,
        professionals: prev.professionals.map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      }));
    },
    []
  );

  const addProfessional = useCallback(() => {
    const newProf: N1Professional = {
      id: genId(),
      cargo: "Novo Perfil",
      quantidade: 1,
      salarioBase: 2500,
      encargosPerc: 68,
      beneficiosFixo: 900,
      custosIndiretosPerc: 15,
      escala: "8x5",
    };
    setTeamState((prev) => ({
      ...prev,
      professionals: [...prev.professionals, newProf],
    }));
  }, []);

  const removeProfessional = useCallback((id: string) => {
    setTeamState((prev) => ({
      ...prev,
      professionals: prev.professionals.filter((p) => p.id !== id),
    }));
  }, []);

  const moveProfessional = useCallback((id: string, dir: -1 | 1) => {
    setTeamState((prev) => {
      const list = prev.professionals;
      const idx = list.findIndex((p) => p.id === id);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= list.length) return prev;
      const next = list.slice();
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return { ...prev, professionals: next };
    });
  }, []);

  const updateTeamConfig = useCallback(
    <K extends keyof Omit<N1TeamState, "professionals">>(key: K, value: N1TeamState[K]) => {
      setTeamState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const results: N1TeamResults = useMemo(() => {
    let custoTotalFolha = 0;
    let custoTotalEncargos = 0;
    let custoTotalBeneficios = 0;
    let custoTotalIndiretos = 0;
    let totalPessoas = 0;

    for (const p of teamState.professionals) {
      const folha = p.salarioBase * p.quantidade;
      const encargos = folha * (p.encargosPerc / 100);
      const beneficios = p.beneficiosFixo * p.quantidade;
      const indiretos = (folha + encargos + beneficios) * (p.custosIndiretosPerc / 100);

      custoTotalFolha += folha;
      custoTotalEncargos += encargos;
      custoTotalBeneficios += beneficios;
      custoTotalIndiretos += indiretos;
      totalPessoas += p.quantidade;
    }

    const custoTotalEquipe = custoTotalFolha + custoTotalEncargos + custoTotalBeneficios + custoTotalIndiretos;
    const custoPorPessoa = totalPessoas > 0 ? custoTotalEquipe / totalPessoas : 0;
    const custoPorChamado = teamState.capacidadeTimeTotal > 0
      ? custoTotalEquipe / teamState.capacidadeTimeTotal
      : 0;

    return {
      custoTotalFolha,
      custoTotalEncargos,
      custoTotalBeneficios,
      custoTotalIndiretos,
      custoTotalEquipe,
      totalPessoas,
      custoPorPessoa,
      custoPorChamado,
    };
  }, [teamState]);

  return {
    teamState,
    setTeamState,
    updateProfessional,
    addProfessional,
    removeProfessional,
    moveProfessional,
    updateTeamConfig,
    results,
  };
}
