import { usePersistentState } from "@/hooks/usePersistentState";
import { CONFIG_PADRAO, type ConfigCarrinho, type LinhaCarrinho } from "@/lib/treinamento/carrinho";

export interface CotacaoAtual {
  id: string | null; nome: string; cliente: string; codigo: string | null;
  gerenteConta?: string; especialistaBU?: string; salesforce?: string; arquitetoBU?: string;
}
export const COTACAO_VAZIA: CotacaoAtual = { id: null, nome: "", cliente: "", codigo: null, gerenteConta: "", especialistaBU: "", salesforce: "", arquitetoBU: "" };

/** Estado do carrinho do configurador (namespace observabilidade.treinamento.). */
export function useCarrinhoState() {
  const [linhas, setLinhas] = usePersistentState<LinhaCarrinho[]>("observabilidade.treinamento.linhas", []);
  const [config, setConfig] = usePersistentState<ConfigCarrinho>("observabilidade.treinamento.config", CONFIG_PADRAO);
  const [atual, setAtual] = usePersistentState<CotacaoAtual>("observabilidade.treinamento.atual", COTACAO_VAZIA);
  return { linhas, setLinhas, config: { ...CONFIG_PADRAO, ...config }, setConfig, atual, setAtual };
}
