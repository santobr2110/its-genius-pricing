## Objetivo

Permitir que o usuário abra **várias precificações salvas em abas diferentes**, cada uma com seu estado isolado (clientes, equipes, financeiro, escopo). Edições vão direto para a precificação aberta naquela aba, sem cruzar com outras abas/precificações.

## Modelo conceitual

Cada aba assume um de dois modos:

| Modo | Como | Storage local | Storage cloud |
|------|------|--------------|---------------|
| **Rascunho** (atual) | Sem `?preset=` na URL | `localStorage["ito.smart-ito.<key>"]` | `user_app_state` |
| **Precificação ativa** | URL `?preset=<id>` | `sessionStorage["ito.smart-ito.preset.<id>.<key>"]` (por aba) | `pricing_presets.payload` (debounced) |

Trocar de aba/precificação **não interfere** em outras abas porque:
- `sessionStorage` é por aba (não compartilhado como `localStorage`).
- Cada preset escreve em seu próprio registro de `pricing_presets`.

## Componentes

### 1. `src/lib/activePreset.ts` (novo)
Resolve a precificação ativa a partir de `?preset=<id>` na URL e mantém em `sessionStorage`. Exporta:
- `getActivePresetId()`
- `getStorageNamespace()` → `ito.smart-ito.` ou `ito.smart-ito.preset.<id>.`
- Listener para mudanças (custom event).

### 2. `src/hooks/usePersistentState.ts` (alterar)
Quando há preset ativo:
- Usa `sessionStorage` no lugar de `localStorage`.
- Prefixa todas as chaves com `preset.<id>.`.
- **Não** lê/escreve em `user_app_state` (cloud sync ocorre via payload do preset).
- Hidrata o valor inicial a partir do payload do preset injetado pelo provider.

### 3. `src/hooks/useActivePresetSession.ts` (novo)
Hook que roda dentro do `ITSMProvider`:
- Na entrada da aba com `?preset=<id>`: carrega o preset, popula sessionStorage com cada fatia do payload (calculator, n1Team, n2Team, allParams, escopo), dispara `notifyPersistentStateRestored` para todos hooks já montados re-hidratarem.
- Observa mudanças em `sessionStorage` (via custom event disparado pelo próprio `usePersistentState`).
- Debounce 800 ms: serializa o snapshot atual e chama `pricing_presets.update({ payload })`.
- Expõe status: `{ activeId, name, savedAt, saving }`.

### 4. `src/components/ActivePresetBanner.tsx` (novo)
Banner sticky no topo das páginas Smart ITO quando há preset ativo:
- "Editando: **Nome da precificação** · salvo há Xs"
- Botões: "Salvar como novo", "Fechar precificação" (volta ao rascunho na MESMA aba — remove `?preset=`).

### 5. `src/pages/Precificacoes.tsx` (alterar)
- Botão "Carregar" continua funcionando na aba atual (modo rascunho).
- Adicionar botão **"Abrir em nova aba"** (ícone `ExternalLink`) que abre `/ito?preset=<id>` em `target="_blank"`.

### 6. `src/contexts/ITSMContext.tsx` (alterar)
- Monta `useActivePresetSession` e expõe seu status no contexto.
- `loadPreset` na aba atual continua sobrescrevendo o workspace (modo rascunho); quando há preset ativo, `loadPreset` é desabilitado (já estamos editando um).

## Detalhes técnicos

**Por que `sessionStorage` no modo ativo?** Garante que duas abas do mesmo usuário com presets diferentes não compartilhem cache local — `localStorage` é compartilhado entre abas e provocaria flicker/colisão.

**Conflito de escrita simultânea no mesmo preset:** se o usuário abrir o MESMO preset em duas abas, vale last-write-wins (mesmo comportamento que hoje no rascunho). Aceitável e raro.

**Migração:** zero — presets existentes continuam funcionando; o modo "Carregar" tradicional fica intacto.

**Auto-save:** debounce 800 ms; usa `pricing_presets.update({ payload, updated_at: now() })` direto; falha silenciosa com toast de erro se a conexão cair.

**Indicador de estado:** "salvando…" → "salvo agora" → "salvo há Xs" no banner.

## Escopo fora deste plano
- Lista visual de "abas abertas" globalmente (cada navegador gerencia).
- Trava/lock pessimista entre abas do mesmo preset.
- Histórico de versões da precificação.
