import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import TreinamentoProposta from "@/pages/treinamento/Proposta";

const state = vi.hoisted(() => ({ loading: true }));
vi.mock("@/pages/treinamento/useTreinamentoResultado", () => ({
  useTreinamentoResultado: () => ({
    loading: state.loading,
    cad: { params: [], contents: [], courses: [] },
    st: { atual: { cliente: "Cliente", codigo: null } },
    res: { linhas: [], precoFinalTotal: 0 },
  }),
}));
vi.mock("@/hooks/useTreinamentoCotacoes", () => ({ useTreinamentoCotacoes: () => ({ lista: [] }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ can: () => true }) }));
vi.mock("@/hooks/usePersistentState", () => ({ usePersistentState: (_key: string, initial: unknown) => [initial, vi.fn()] }));
vi.mock("@/hooks/useReformaCBS", () => ({ useReformaCBS: () => ({ cbsPerc: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/pages/treinamento/Resumo", () => ({ default: () => null, exportarResumoPdf: vi.fn() }));
vi.mock("@/lib/treinamento/propostaDocx", () => ({ gerarPropostaDocx: vi.fn() }));

afterEach(() => { cleanup(); state.loading = true; });

it("preserves hook order when the training catalog finishes loading", () => {
  const view = render(<MemoryRouter><TreinamentoProposta /></MemoryRouter>);
  state.loading = false;
  expect(() => view.rerender(<MemoryRouter><TreinamentoProposta /></MemoryRouter>)).not.toThrow();
  state.loading = true;
  expect(() => view.rerender(<MemoryRouter><TreinamentoProposta /></MemoryRouter>)).not.toThrow();
});