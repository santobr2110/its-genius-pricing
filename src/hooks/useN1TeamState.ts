import { useState, useCallback, useMemo } from "react";

export interface N1Professional {
  id: string;
  cargo: string;
  quantidade: number;
  salarioBase: number;
  encargosPerc: number; // % sobre salário (INSS, FGTS, 13º, férias etc.)
  beneficiosFixo: number; // valor fixo por pessoa (VR, VT, plano saúde)
  custosIndiretosPerc: number; // % overhead (infra, gestão)
}

export interface N1TeamState {
  professionals: N1Professional[];
  capacidadePorPessoa: number; // chamados/mês per capita
  capacidadePorPosicao: number; // chamados/mês por posição (4 pessoas em 12x36)
  pessoasPorPosicao: number; // quantas pessoas compõem uma posição (turno)
}

export interface N1TeamResults {
  custoTotalFolha: number;
  custoTotalEncargos: number;
  custoTotalBeneficios: number;
  custoTotalIndiretos: number;
  custoTotalEquipe: number;
  totalPessoas: number;
  custoPorPessoa: number;
  custoPorChamadoPessoa: number;
  custoPorChamadoPosicao: number;
  custoPosicao: number;
}

let nextId = 1;
function genId() {
  return `n1-${nextId++}`;
}

const DEFAULT_PROFESSIONALS: N1Professional[] = [
  {
    id: genId(),
    cargo: "Analista de Suporte Jr",
    quantidade: 3,
    salarioBase: 2200,
    encargosPerc: 68,
    beneficiosFixo: 900,
    custosIndiretosPerc: 15,
  },
  {
    id: genId(),
    cargo: "Analista de Suporte Pleno",
    quantidade: 1,
    salarioBase: 3200,
    encargosPerc: 68,
    beneficiosFixo: 900,
    custosIndiretosPerc: 15,
  },
  {
    id: genId(),
    cargo: "Supervisor de Operações",
    quantidade: 1,
    salarioBase: 5000,
    encargosPerc: 68,
    beneficiosFixo: 1100,
    custosIndiretosPerc: 15,
  },
];

const DEFAULT_STATE: N1TeamState = {
  professionals: DEFAULT_PROFESSIONALS,
  capacidadePorPessoa: 400,
  capacidadePorPosicao: 1500,
  pessoasPorPosicao: 4,
};

export function useN1TeamState() {
  const [teamState, setTeamState] = useState<N1TeamState>(DEFAULT_STATE);

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

    const custoPosicao = custoPorPessoa * teamState.pessoasPorPosicao;
    const custoPorChamadoPessoa =
      teamState.capacidadePorPessoa > 0 ? custoPorPessoa / teamState.capacidadePorPessoa : 0;
    const custoPorChamadoPosicao =
      teamState.capacidadePorPosicao > 0 ? custoPosicao / teamState.capacidadePorPosicao : 0;

    return {
      custoTotalFolha,
      custoTotalEncargos,
      custoTotalBeneficios,
      custoTotalIndiretos,
      custoTotalEquipe,
      totalPessoas,
      custoPorPessoa,
      custoPorChamadoPessoa,
      custoPorChamadoPosicao,
      custoPosicao,
    };
  }, [teamState]);

  return {
    teamState,
    updateProfessional,
    addProfessional,
    removeProfessional,
    updateTeamConfig,
    results,
  };
}
