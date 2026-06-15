# Replicar padrão Smart ITO em Profissionais Alocados

Objetivo: padronizar a oferta **Profissionais Alocados** para usar exatamente os mesmos componentes visuais e funcionais de **Smart ITO**, mantendo namespace de dados isolado.

## 1. Navegação — padrão Smart ITO (SortableNav)

Substituir o `TopNav` atual (chips agrupados) pelo mesmo padrão `SortableNav` do Smart ITO:
- Botões com drag handle (GripVertical), ícone, label e ChevronDown
- Agrupamentos via DropdownMenu (Configurações, Seleção)
- Responsivo (mobile/icon/short/full)
- BUMenu à esquerda + ThemeToggle/UserMenu à direita

Criar `src/components/ProfSortableNav.tsx` reaproveitando o layout de `SortableNav.tsx` mas com slots/páginas da oferta Profissionais Alocados.

## 2. Botão "Precificações" (Salvar / Restaurar / Visualizar)

Criar `src/components/profissionais/PrecificacoesProfMenu.tsx` espelhando `SavePresetButton`:
- **Salvar**: abre dialog com Cliente/Validade/Observações; emite `CustomEvent("prof:save-cotacao")` capturado pelo `PainelResultado` (que detém o perfil selecionado e os cálculos). Se nenhum perfil estiver selecionado, exibe toast.
- **Restaurar**: submenu lista as últimas cotações; ao clicar, navega para `/profissionais-alocados/cotacoes` com `?open=<id>` (abre Sheet de detalhe).
- **Visualizar**: navega para `/profissionais-alocados/cotacoes`.

Adicionar ao header do `ProfissionaisLayout`.

## 3. Tela "Cotações Salvas" no padrão Smart ITO

Reescrever `src/pages/profissionais/CotacoesSalvas.tsx` no padrão de `src/pages/Precificacoes.tsx`:
- `Table` com colunas: Código, Cliente, Cargo/Nível/Área, Origem, Validade, Status, Valor Venda, Ações
- Ações: Visualizar (Sheet de detalhe), Exportar (.txt), Excluir (AlertDialog)
- Cards de KPIs no topo (Total / Válidas / Valor médio do mês) — mantidos
- Filtros mantidos em uma barra acima

Mantém integração com `useCotacoes(scope="profissionais")`.

## 4. Configurações Financeiras idênticas ao Smart ITO

Criar três telas autônomas usando os mesmos componentes do Smart ITO:

- `/profissionais-alocados/financeiro` → cópia de `ConfiguracoesFinanceiras.tsx` (Resultado da Operação)
- `/profissionais-alocados/financeiro/impostos` → cópia de `ConfiguracoesImpostos.tsx` (com lista de Códigos de Produto para Faturamento + município ISS + componentes do markup divisor)
- `/profissionais-alocados/financeiro/comissoes` → cópia de `ConfiguracoesComissoes.tsx` (tabela progressiva de comissão por faixa de rentabilidade)

### Detalhes técnicos

- Reaproveitar componentes existentes (`ProdutosImpostoManager`, `CIDADES_ISS`, `getIssPercByCidade`, `DEFAULT_COMISSAO_TIERS`, `comissaoFromRent`) — são genéricos.
- Substituir dependência de `useITSMContext` por um novo hook **`useProfFinanceiroState`** que expõe a mesma API (state, update, comissaoTiers, setComissaoTiers, results.composicaoPreco, custoTotalOperacao) mas:
  - Persiste em `app_defaults` na chave `profissionais.financial.state` e `profissionais.financial.comissaoTiers`
  - Calcula composição usando um "custo de exemplo" configurável (R$ 10.000 padrão) já que não há equipes Smart ITO acopladas — o custo real virá do salário do profissional na hora da precificação
- Refatorar `ConfiguracoesImpostos`, `ConfiguracoesComissoes` e `ConfiguracoesFinanceiras` para aceitarem um prop opcional `scope: "smart-ito" | "profissionais"` ou criar versões espelho em `src/pages/profissionais/financeiro/`. **Decisão:** criar versões espelho em `src/pages/profissionais/financeiro/` que importam os mesmos blocos JSX, parametrizadas por hook (sem duplicação de UI). Implementação: extrair o corpo de cada tela Smart ITO em componentes `FinanceiroResultadoView`, `FinanceiroImpostosView`, `FinanceiroComissoesView` que recebem o hook como prop.
- `FinanceiroSubNav` ganha prop `basePath` para apontar para `/financeiro/...` ou `/profissionais-alocados/financeiro/...`.

### Integração com cálculo de venda

O `PainelResultado` passa a usar o `state` do novo hook para extrair `pisPerc + cofinsPerc + issPerc + irpjCsllPerc + encFinancPerc + comissaoPerc + lucroPerc` como markup divisor — mesmo cálculo do Smart ITO. O atual `useFinanceiroProfissionais` é descontinuado em favor do novo hook unificado.

## 5. Rotas

Adicionar em `App.tsx`:
```
/profissionais-alocados/financeiro              → FinanceiroResultadoProf
/profissionais-alocados/financeiro/impostos     → FinanceiroImpostosProf
/profissionais-alocados/financeiro/comissoes    → FinanceiroComissoesProf
```

Todas protegidas por `permission="page.prof.financeiro"`.

## 6. Memória de regra

Salvar `mem://design/precificacao-nav-pattern` registrando que toda ferramenta de precificação nova deve usar o padrão `SortableNav` + botão **Precificações** (Salvar/Restaurar/Visualizar).

## Arquivos afetados

**Novos**
- `src/components/ProfSortableNav.tsx`
- `src/components/profissionais/PrecificacoesProfMenu.tsx`
- `src/components/financeiro/FinanceiroResultadoView.tsx`
- `src/components/financeiro/FinanceiroImpostosView.tsx`
- `src/components/financeiro/FinanceiroComissoesView.tsx`
- `src/hooks/useProfFinanceiroState.ts`
- `src/pages/profissionais/financeiro/Resultado.tsx`
- `src/pages/profissionais/financeiro/Impostos.tsx`
- `src/pages/profissionais/financeiro/Comissoes.tsx`

**Editados**
- `src/pages/profissionais/Layout.tsx` (nav + botão Precificações)
- `src/pages/profissionais/CotacoesSalvas.tsx` (padrão tabela)
- `src/pages/profissionais/PainelResultado.tsx` (usa novo hook + listener "prof:save-cotacao")
- `src/pages/ConfiguracoesFinanceiras.tsx`, `ConfiguracoesImpostos.tsx`, `ConfiguracoesComissoes.tsx` (extraem views)
- `src/components/itsm/FinanceiroSubNav.tsx` (prop `basePath`)
- `src/App.tsx` (rotas novas)
- `mem://index.md` + novo arquivo de memória

## Observações

- O `useFinanceiroProfissionais.ts` atual será substituído (mantido temporariamente até a migração estar pronta para evitar quebra).
- Sem migração de banco — `app_defaults` já existe e as chaves novas (`profissionais.financial.state`, `profissionais.financial.comissaoTiers`) usam-no diretamente.
- A tabela de Códigos de Produto é compartilhada (mesmo `useCodigosProdutoImposto`); não há necessidade de duplicar dados.