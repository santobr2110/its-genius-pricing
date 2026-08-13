import { useCallback, useMemo } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { SD_KEY } from "@/lib/servicedesk/namespace";

export interface SDProfessional {
  id: string;
  cargo: string;
  quantidade: number;
  salarioBase: number;
  encargosPerc: number;
  beneficiosFixo: number;
  custosIndiretosPerc: number;
  escala: string;
}

export interface SDTeamState {
  professionals: SDProfessional[];
}

export interface SDTeamResults {
  custoTotalFolha: number;
  custoTotalEncargos: number;
  custoTotalBeneficios: number;
  custoTotalIndiretos: number;
  custoTotalEquipe: number;
  totalPessoas: number;
  custoPorPessoa: number;
}

function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `sd-${crypto.randomUUID()}`;
  }
  return `sd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_SD_TEAM: SDTeamState = {
  professionals: [
    { id: "sd-team-1", cargo: "Analista de Service Desk Jr", quantidade: 6, salarioBase: 2300, encargosPerc: 68, beneficiosFixo: 900, custosIndiretosPerc: 15, escala: "12x36" },
    { id: "sd-team-2", cargo: "Analista de Service Desk Pleno", quantidade: 2, salarioBase: 3400, encargosPerc: 68, beneficiosFixo: 900, custosIndiretosPerc: 15, escala: "8x5" },
    { id: "sd-team-3", cargo: "Supervisor de Service Desk", quantidade: 1, salarioBase: 5200, encargosPerc: 68, beneficiosFixo: 1100, custosIndiretosPerc: 15, escala: "8x5" },
  ],
};

export function useServiceDeskTeamState() {
  const [teamState, setTeamState] = usePersistentState<SDTeamState>(
    SD_KEY("team:v1"),
    DEFAULT_SD_TEAM,
  );

  const updateProfessional = useCallback(
    (id: string, field: keyof Omit<SDProfessional, "id">, value: number | string) => {
      setTeamState((prev) => ({
        ...prev,
        professionals: prev.professionals.map((p) =>
          p.id === id ? { ...p, [field]: value } : p,
        ),
      }));
    },
    [setTeamState],
  );

  const addProfessional = useCallback(() => {
    setTeamState((prev) => ({
      ...prev,
      professionals: [
        ...prev.professionals,
        {
          id: genId(),
          cargo: "Novo Perfil",
          quantidade: 1,
          salarioBase: 2500,
          encargosPerc: 68,
          beneficiosFixo: 900,
          custosIndiretosPerc: 15,
          escala: "8x5",
        },
      ],
    }));
  }, [setTeamState]);

  const removeProfessional = useCallback(
    (id: string) => {
      setTeamState((prev) => ({
        ...prev,
        professionals: prev.professionals.filter((p) => p.id !== id),
      }));
    },
    [setTeamState],
  );

  const moveProfessional = useCallback(
    (id: string, dir: -1 | 1) => {
      setTeamState((prev) => {
        const list = prev.professionals;
        const idx = list.findIndex((p) => p.id === id);
        const newIdx = idx + dir;
        if (idx < 0 || newIdx < 0 || newIdx >= list.length) return prev;
        const next = list.slice();
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        return { ...prev, professionals: next };
      });
    },
    [setTeamState],
  );

  const results: SDTeamResults = useMemo(() => {
    let custoTotalFolha = 0;
    let custoTotalEncargos = 0;
    let custoTotalBeneficios = 0;
    let custoTotalIndiretos = 0;
    let totalPessoas = 0;

    for (const p of teamState.professionals) {
      const folha = (p.salarioBase || 0) * (p.quantidade || 0);
      const encargos = folha * ((p.encargosPerc || 0) / 100);
      const beneficios = (p.beneficiosFixo || 0) * (p.quantidade || 0);
      const indiretos = (folha + encargos + beneficios) * ((p.custosIndiretosPerc || 0) / 100);
      custoTotalFolha += folha;
      custoTotalEncargos += encargos;
      custoTotalBeneficios += beneficios;
      custoTotalIndiretos += indiretos;
      totalPessoas += p.quantidade || 0;
    }

    const custoTotalEquipe =
      custoTotalFolha + custoTotalEncargos + custoTotalBeneficios + custoTotalIndiretos;

    return {
      custoTotalFolha,
      custoTotalEncargos,
      custoTotalBeneficios,
      custoTotalIndiretos,
      custoTotalEquipe,
      totalPessoas,
      custoPorPessoa: totalPessoas > 0 ? custoTotalEquipe / totalPessoas : 0,
    };
  }, [teamState]);

  return {
    teamState,
    setTeamState,
    updateProfessional,
    addProfessional,
    removeProfessional,
    moveProfessional,
    results,
  };
}