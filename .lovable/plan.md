## Visão geral

Criar uma nova oferta autônoma dentro do grupo ITO chamada **Precificação de Profissionais Alocados** (substitui o card "Bodyshop"), reordenada para ficar entre Smart ITO e Pacote de Horas no Hub. A calculadora terá navegação própria (sidebar) com 4 seções e persistência completa no Supabase.

Modelo de IA confirmado: **Lovable AI — `google/gemini-2.5-pro`** via edge function (sem chave externa).

---

## 1. Hub e roteamento

- `src/pages/Hub.tsx`: renomear oferta `bodyshop` → `profissionais-alocados`, label "Precificação de Profissionais Alocados", ícone `Users`, `available: true`, reordenar para 2º lugar (Smart ITO → Profissionais Alocados → Pacote de Horas).
- `src/lib/offerings.ts`: nova `OfferingDef` `profissionais-alocados` em ITO, com `routePrefix: "/profissionais-alocados"` e rotas das 4 sub-páginas. Remover a oferta `bodyshop` (ou mantê-la sem aparecer — preferência: substituir).
- `src/lib/permissions.ts`: nova chave `offering.ito.profissionais-alocados.access` (admin liberado por padrão; demais roles via tela Admin).
- `src/App.tsx`: novas rotas protegidas (`group="ito"`, `offering="profissionais-alocados"`):
  - `/profissionais-alocados` (redireciona para `/precificacao-manual`)
  - `/profissionais-alocados/base-conhecimento`
  - `/profissionais-alocados/precificacao-manual`
  - `/profissionais-alocados/precificacao-ia`
  - `/profissionais-alocados/cotacoes`

## 2. Schema Supabase (uma migration)

Três tabelas + grants + RLS escopada por usuário (`auth.uid()`):

- `base_conhecimento` (`tipo`, `nome_arquivo`, `conteudo_texto`, `conteudo_parsed jsonb`, `total_registros`, `user_id`, timestamps).  
  Constraint `unique(user_id, tipo)` para suportar upsert "manter o mais recente por tipo por usuário".
- `cotacoes` — todos os campos do escopo + `user_id` + `excluido boolean default false` (soft delete) + `ia_*` opcionais.
- `config_precificacao` — um registro por usuário (PK composta ou `unique(user_id)`); defaults `encargos_pct=68`, `overhead_pct=15`, `margem_pct=25`, `horas_mensais=176`.

RLS: cada usuário só lê/escreve as próprias linhas. Grants padrão `authenticated`/`service_role`. Trigger `touch_updated_at` em todas.

## 3. Layout da calculadora

- `src/pages/profissionais/Layout.tsx`: `SidebarProvider` + sidebar fixa à esquerda com 4 itens (Base Conhecimento, Precificação Manual, Precificação IA, Cotações Salvas), header com `SidebarTrigger` + `BackHomeButton` + `UserMenu`/`ThemeToggle`. `<Outlet />` no main.
- Reaproveitar tokens semânticos atuais (paleta verde/emerald, fontes do projeto).

## 4. Seção: Base de Conhecimento (`/profissionais-alocados/base-conhecimento`)

- Dois slots (cards) — `cargos_salarios` e `descritivos`.
- Upload via `<input type="file">` + parse no browser:
  - XLSX/CSV → `xlsx` (já presumido ou adicionar `xlsx` lib) → `conteudo_parsed` é array de `{cargo, area, nivel, salario_base, descricao?, competencias?[]}`. Normalizar nomes de colunas (case/acentos).
  - PDF → `pdfjs-dist`; DOCX → `mammoth`; TXT → leitura direta. Texto extraído vai em `conteudo_texto`.
- Upsert no Supabase via `usePersonasKnowledge` hook (chave `(user_id, tipo)`).
- Mostrar: nome arquivo, data, total registros, prévia (5 primeiros para cargos; lista de cargos identificados para descritivos via regex/heurística simples).
- Banner amarelo se `atualizado_em > 30 dias`. Banner vermelho nas outras seções se faltar registro.
- Botão "Limpar Base" com `AlertDialog` → delete por `(user_id, tipo)`.

## 5. Seção: Precificação Manual

- Layout 2 colunas: painel de seleção (esquerda) + painel de resultado (direita, ver §7).
- Dropdowns encadeados alimentados por `conteudo_parsed`:
  1. Área (distinct das áreas presentes no arquivo)
  2. Cargo (filtrado pela área)
  3. Nível (fixo: Júnior, Pleno, Sênior, Especialista, Coordenador, Gerente)
  4. Regime (Integral 100% / Meio período 50% / Sprint quinzenal)
  5. Duração (3/6/12/24+ meses)
- Ao preencher tudo, popula salário base do registro mais aderente (mesma área+cargo, fallback para o cargo) e renderiza o painel de resultado.

## 6. Seção: Precificação por IA

- Edge function `supabase/functions/precificacao-ia/index.ts`:
  - Recebe `{descricao}` do cliente autenticado (verifica JWT via header).
  - Lê `conteudo_texto` mais recente de ambos os tipos para o `user_id`.
  - Chama Lovable AI Gateway (`google/gemini-2.5-pro`) com `Output.object` (Zod) garantindo JSON `{cargo_identificado, area, nivel_senioridade, salario_base, justificativa, competencias_chave[], indice_aderencia}`.
  - System prompt em PT-BR (texto fornecido na spec).
  - Trata 429 (rate-limit) e 402 (créditos) com mensagens claras.
  - Retorna JSON ao cliente.
- Frontend: `Textarea` grande + botão "Analisar com IA e Calcular Valor" + loading state.
- Resultado preenche painel comum + card "Por que a IA escolheu este perfil" (justificativa, chips de competências, barra de aderência verde/amarela/vermelha com thresholds 80/60).

## 7. Painel de Resultado e cálculo (componente compartilhado)

`<PainelResultado>` recebe `{perfil, origem, dadosIA?}`:

- Bloco perfil: cargo + badge nível + área + descrição + chips competências.
- Bloco parâmetros (editáveis) carregados do `config_precificacao` do usuário; alterações disparam `upsert` debounced no Supabase.
- Cálculo reativo (`useMemo`):
  - `custo = salario * (1+encargos/100) * (1+overhead/100)`
  - `valorVenda = custo * (1+margem/100)`
  - `valorHora = valorVenda / horas`
  - `valorSprint = valorHora * 80`
- Destaque visual no Valor de Venda Sugerido.
- Botão "Salvar Cotação" abre modal (cliente obrigatório, observações, validade default hoje+30 editável, origem auto). Insert em `cotacoes` com todo o snapshot. Toast de sucesso.

## 8. Seção: Cotações Salvas

- 3 cards de métricas (queries dedicadas: total; válidas `valida_ate >= today`; média do mês corrente).
- Toolbar: busca livre (`ilike` em cliente/cargo/area/nivel), selects (Área, Nível, Origem, Status), ordenação, "Exportar Todas (.csv)".
- Todas as queries filtram `excluido = false` e `user_id = auth.uid()` (via RLS automaticamente).
- Cards horizontais com badge Manual (azul) / IA (roxo), status calculado client-side a partir de `valida_ate`.
- Ações por card:
  - Ver detalhes → `Sheet`/`Dialog` lateral com breakdown completo (inclui justificativa IA se aplicável) + botão "Exportar esta Proposta".
  - Duplicar → navega para Manual/IA pré-preenchida via state.
  - Exportar → gera `.txt` estruturado conforme spec (cabeçalho, cliente, parâmetros, valores, nota IA, rodapé "Calculado via IT Pricing Hub") + cópia para clipboard.
  - Excluir → soft delete (`update excluido=true`) com `AlertDialog`.

## 9. Hooks e organização

- `src/hooks/useKnowledgeBase.ts`, `useConfigPrecificacao.ts`, `useCotacoes.ts` (CRUD + filtros).
- `src/lib/profissionais/calc.ts` (fórmulas puras + testes simples).
- `src/lib/profissionais/parsers.ts` (XLSX/PDF/DOCX → JSON/texto).
- `src/lib/profissionais/exportProposta.ts` (gera `.txt` e `.csv`).

## 10. Dependências a adicionar

`xlsx`, `pdfjs-dist`, `mammoth` para parsing client-side dos arquivos.

## 11. Permissões/Admin

- Adicionar `offering.ito.profissionais-alocados.access` à lista de permissões; admin ganha automaticamente via `is_admin`; tela Admin já gerencia atribuição.

---

## Ordem de execução

1. Migration Supabase (3 tabelas + RLS + grants + triggers).
2. Catálogo de ofertas + rotas + Hub reordenado/renomeado + permissão.
3. Layout com sidebar + 4 páginas stub.
4. Base de Conhecimento (upload, parse, persistência).
5. Painel de Resultado compartilhado + `config_precificacao`.
6. Precificação Manual ligada ao painel.
7. Edge function `precificacao-ia` + tela IA + card de justificativa.
8. Cotações Salvas (métricas, filtros, exportações, soft delete).
9. Polimento visual + verificação build/preview.

## Riscos / observações

- Parsing de XLSX/PDF/DOCX no navegador depende de heurísticas para mapear colunas — usar normalização e mostrar prévia para o usuário validar.
- Edge function precisa do `LOVABLE_API_KEY` (já presente).
- Gemini 2.5 Pro com schema estruturado tem limite de "states" — manter o schema enxuto (sem enums longos).
