
# Reestruturação · Precificação de Profissionais Alocados

## 1. Menu Business Unit (BUMenu)
Corrigir o dropdown "IT Solutions /":
- Remover **Bodyshop** (não consta no Hub).
- Reordenar para refletir o Hub: **Smart ITO**, **Profissionais Alocados**, **Pacote de Horas**.
- Adicionar entrada **Profissionais Alocados** (faltante hoje) com permission key `offering.ito.profissionais-alocados.access`.
- Atualizar `ITO_PATHS` para incluir `/profissionais-alocados/*` e refletir oferta ativa no breadcrumb.

## 2. Navegação Profissionais Alocados (top bar)
Substituir a sidebar lateral por barra superior de botões (como Smart ITO), agrupados:

- **Configurações:** Base de Conhecimento · Financeiro
- **Seleção:** Seleção Manual · Seleção com IA
- **Precificações:** Cotações Salvas (estrutura semelhante a `/precificacoes` do Smart ITO)

`ProfissionaisLayout` passa a usar header com `BUMenu` + grupos de botões/segmented control, sem `SidebarProvider`. Conteúdo das páginas usa a largura total (remover grids restritivos).

## 3. Financeiro autônomo da oferta
Criar cópia independente do Financeiro do Smart ITO em rotas `/profissionais-alocados/financeiro`, `/financeiro/impostos`, `/financeiro/comissoes`, persistindo em namespace separado para não afetar o Smart ITO.

- Reutilizar componentes/UI (`ConfiguracoesFinanceiras`, `ConfiguracoesImpostos`, `ConfiguracoesComissoes`, `ProdutosImpostoManager`) parametrizando o escopo (`scope: "smart-ito" | "profissionais"`) ao ler/gravar em:
  - `app_defaults` (chaves prefixadas `profissionais.*`)
  - `config_precificacao` (nova coluna `scope` ou nova tabela `config_precificacao_profissionais` — escolher coluna `scope text default 'smart-ito'` com índice único `(user_id, scope)` para preservar dados atuais).
- Hooks: criar `useConfigPrecificacaoProfissionais` e variantes de hooks de impostos/comissões com namespace.

## 4. Cálculo de venda (mesmo motor do Smart ITO)
Reaplicar exatamente a regra do Smart ITO sobre o custo do profissional alocado:

```text
Custo Total = Salário (faixa C1..C6) × (1 + encargos%) × (1 + overhead%)
Preço Base  = Custo Total / (1 - margem% - impostos% - comissão%)
```

Importar de `src/lib/comissaoRentabilidade.ts` e regras de markup/impostos atuais, alimentadas pelo financeiro da oferta (item 3). Atualizar `src/lib/profissionais/calc.ts` para receber o pacote financeiro `profissionais` e retornar a composição detalhada (custos, impostos, comissões, margem). Refletir em `PainelResultado`, `PrecificacaoManual`, `PrecificacaoIA` e export de proposta.

## 5. Cotações Salvas (modelo Precificações Smart ITO)
Replicar tela `/precificacoes` para a oferta:
- Listagem, filtros, abrir, duplicar, excluir, exportar.
- Reaproveitar `cotacoes` (já existe a tabela) adicionando coluna `scope text default 'smart-ito'` para separar do Smart ITO; novos registros gravam `'profissionais'`. Migration adiciona índice por `(user_id, scope)`.
- Reusar componentes visuais do Smart ITO com adaptações de campos (cargo/faixa/senioridade).

## 6. Permissões
Adicionar em `src/lib/permissions.ts` (grupo novo: **ITO › Profissionais Alocados**):
- `page.prof.base_conhecimento` (+ `.write`)
- `page.prof.financeiro` (+ `.write`)
- `page.prof.selecao_manual` (+ `.write`)
- `page.prof.selecao_ia` (+ `.write`)
- `page.prof.cotacoes`
- `prof.pricing.edit`, `prof.pricing.save`, `prof.pricing.delete`, `prof.pricing.export_pdf`

Aplicar `ProtectedRoute permission=...` em cada rota e `Can permission=...` nos botões/ações. Esconder grupos do top menu quando sem permissão.

## 7. Migrations
- `alter table public.cotacoes add column if not exists scope text not null default 'smart-ito';` + índice.
- `alter table public.config_precificacao add column if not exists scope text not null default 'smart-ito';` + unique `(user_id, scope)` (drop antiga unique `user_id`).
- Nada novo em `app_defaults` (apenas novas chaves prefixadas via app).

## 8. Detalhes Técnicos
- Rotas novas em `App.tsx` aninhadas em `/profissionais-alocados`: `financeiro`, `financeiro/impostos`, `financeiro/comissoes`, `cotacoes-salvas`.
- Componentes financeiros refatorados para aceitar `scope` via prop ou contexto leve `ProfissionaisFinanceiroProvider`.
- Remover dependência da sidebar (`Sidebar*`) em `Layout.tsx`; manter `BUMenu`, `ThemeToggle`, `UserMenu`.
- Atualizar `Hub.tsx` (sem mudança visual) apenas se necessário para alinhar paths.
- `BackHomeButton` / breadcrumbs continuam funcionando.

## Entrega
Etapa única (mudança coordenada). Após implementação, validar:
- Menu BU correto em todas as rotas.
- Top nav da oferta funcionando.
- Cálculo Manual e IA usando markup/impostos/comissões da oferta.
- Cotações salvas isoladas do Smart ITO.
- Permissões respeitadas no Admin.
