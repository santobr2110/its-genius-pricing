import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import TreinamentoProposta from "@/pages/treinamento/Proposta";

const mocks = vi.hoisted(() => ({ update: vi.fn(), error: vi.fn() }));
vi.mock("@/pages/treinamento/useTreinamentoResultado", () => ({ useTreinamentoResultado: () => ({ loading:false,congeladoIntacto:false,cad:{params:[],contents:[],courses:[]},st:{linhas:[],config:{resultadoCongelado:{assinatura:"anterior"}},atual:{id:"1",cliente:"Cliente",codigo:null}},res:{linhas:[{curso:{nome:"Curso"},linha:{modalidade:"turma_aberta",alunos:1},precoFinal:1000,precoFinalPorAluno:1000,preco:null}],precoFinalTotal:1000} }) }));
vi.mock("@/hooks/useTreinamentoCotacoes", () => ({ useTreinamentoCotacoes: () => ({lista:[{id:"1",payload:{}}]}) }));
vi.mock("@/contexts/AuthContext", () => ({useAuth:()=>({can:()=>true})}));
vi.mock("@/hooks/usePersistentState", () => ({usePersistentState:(_key:string,initial:unknown)=>[initial,vi.fn()]}));
vi.mock("@/hooks/useReformaCBS", () => ({useReformaCBS:()=>({cbsPerc:null})}));
vi.mock("@/integrations/supabase/client", () => ({supabase:{from:()=>({update:mocks.update})}}));
vi.mock("@/pages/treinamento/Resumo", () => ({default:()=>null,exportarResumoPdf:vi.fn()}));
vi.mock("@/lib/treinamento/propostaDocx", () => ({gerarPropostaDocx:vi.fn()}));
vi.mock("sonner", () => ({toast:{error:mocks.error}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("bloqueia nova emissão quando uma edição invalidou as alíquotas congeladas",()=>{
  render(<MemoryRouter><TreinamentoProposta/></MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:"Emitir (congelar valores)"}));
  expect(mocks.error).toHaveBeenCalledOnce();
  expect(mocks.update).not.toHaveBeenCalled();
});