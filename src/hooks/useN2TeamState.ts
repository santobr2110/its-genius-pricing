// @refresh reset
import { useCallback, useMemo } from "react";
import { usePersistentState } from "./usePersistentState";

export interface N2Professional {
  id: string;
  cargo: string;
  quantidade: number;
  salarioBase: number;
  encargosPerc: number;
  beneficiosFixo: number;
  custosIndiretosPerc: number;
  escala: string;
}

export interface N2TeamState {
  professionals: N2Professional[];
  capacidadeChamadosTotal: number; // chamados/mês que o time inteiro consegue atender
}

export interface N2TeamResults {
  custoTotalFolha: number;
  custoTotalEncargos: number;
  custoTotalBeneficios: number;
  custoTotalIndiretos: number;
  custoTotalEquipe: number;
  totalPessoas: number;
  custoPorPessoa: number;
  custoPorChamado: number;
}

let nextId = 1;
function genId() {
  return `n2-${nextId++}`;
}

const DEFAULT_PROFESSIONALS: N2Professional[] = [
  {
    id: genId(),
    cargo: "Analista N2 Pleno",
    quantidade: 1,
    salarioBase: 5500,
    encargosPerc: 68,
    beneficiosFixo: 1100,
    custosIndiretosPerc: 15,
    escala: "8x5",
  },
  {
    id: genId(),
    cargo: "Especialista de Infraestrutura",
    quantidade: 1,
    salarioBase: 7500,
    encargosPerc: 68,
    beneficiosFixo: 1200,
    custosIndiretosPerc: 15,
    escala: "8x5",
  },
];

const DEFAULT_STATE: N2TeamState = {
  professionals: DEFAULT_PROFESSIONALS,
  capacidadeChamadosTotal: 300,
};

export function useN2TeamState() {
  const [teamState, setTeamState] = usePersistentState<N2TeamState>("itsm:n2team:v1", DEFAULT_STATE);

  const updateProfessional = useCallback(
    (id: string, field: keyof Omit<N2Professional, "id">, value: number | string) => {
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
    const newProf: N2Professional = {
      id: genId(),
      cargo: "Novo Perfil N2",
      quantidade: 1,
      salarioBase: 5000,
      encargosPerc: 68,
      beneficiosFixo: 1100,
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
    <K extends keyof Omit<N2TeamState, "professionals">>(key: K, value: N2TeamState[K]) => {
      setTeamState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const results: N2TeamResults = useMemo(() => {
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
    const custoPorChamado = teamState.capacidadeChamadosTotal > 0
      ? custoTotalEquipe / teamState.capacidadeChamadosTotal
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
