## Objetivo

Hoje todos os dados editáveis (inventário do cliente, métricas, equipes N1/N2/N3, Field, Rotinas, GMUDs, Smart Performance, presets de precificação) ficam no `localStorage` do navegador. Em outra janela/navegador a informação some. Vamos centralizar tudo no backend (Lovable Cloud), por usuário autenticado.

## Escopo das chaves a migrar

Chaves hoje em `localStorage` que viram dado de banco:

- `itsm:calculator:v1` — estado principal (inventário, métricas, flags de complexidade, tiers, % N0/N1/N2/N3 etc.)
- `itsm:n1team:v1` — equipe N1
- `itsm:n2team:v1` — equipe N2
- `itsm:fieldteams:v1` — Field Service
- `gestao-ti:rotinas` — rotinas (Operation/Performance + Padrão/Complexo)
- `gestao-ti:gmuds` — GMUDs
- `gestao-ti:smartPerf:n3Cortes` — cortes de Smart Performance
- `itsm:pricingPresets:v1` — precificações salvas
- Snapshots de "Salvar Parâmetros" (atualmente `<key>:default` no localStorage)

Ficam locais (preferência de UI por dispositivo): tema (`ThemeToggle`) e ordem de navegação (`SortableNav`).

## Modelo de dados

Uma tabela genérica chave→JSON por usuário, e outra para defaults globais (admin define o "padrão" da empresa).

```text
user_app_state
  user_id  uuid   (auth.uid)
  key      text   (ex.: 'itsm:calculator:v1')
  value    jsonb
  updated_at timestamptz
  PK (user_id, key)
  RLS: usuário só lê/escreve as próprias linhas

app_defaults
  key      text PK
  value    jsonb
  updated_at timestamptz
  updated_by uuid
  RLS: leitura por authenticated; escrita só admin (has_permission 'params.save_defaults')
```

Vantagem: nenhuma mudança de schema futura quando surgir uma nova chave de estado.

## Hook `useCloudState`

Substitui `usePersistentState` mantendo a mesma assinatura `(key, initial) → [state, setState]`:

1. Primeira renderização: retorna `initial`, marca `loading=true`.
2. Em `useEffect`, busca `user_app_state` para a chave. Se não houver linha do usuário, busca `app_defaults`. Se nenhum dos dois, usa `initial`.
3. Cada `setState` faz upsert debounced (~500 ms) em `user_app_state`.
4. Cache local em `localStorage` apenas para acelerar a primeira pintura ("optimistic"), com revalidação contra a nuvem.
5. Expor também `loading` para esconder telas inconsistentes onde necessário.

Para `usePricingPresets` (lista) a API muda para CRUD direto na tabela (presets viram linhas próprias).

## Refactor por arquivo

- `src/hooks/usePersistentState.ts` → vira fino wrapper que delega para `useCloudState` quando há usuário autenticado, mantendo fallback offline.
- `src/hooks/useITSMCalculator.ts`, `useN1TeamState.ts`, `useN2TeamState.ts`, `useFieldTeamsState.ts` — sem mudanças de API (continuam usando `usePersistentState`).
- `src/pages/GestaoTI.tsx`, `Detalhamento.tsx`, `components/itsm/SmartTiersPanel.tsx` — idem.
- `src/hooks/usePricingPresets.ts` — reescrever para usar tabela `pricing_presets` (linha por preset, RLS por user_id).
- `src/components/SaveDefaultsButton.tsx` — em vez de gravar `<key>:default` no localStorage, faz upsert em `app_defaults` para todas as chaves relevantes (incluindo `gestao-ti:rotinas` e `gestao-ti:gmuds`, hoje fora da lista). Visível só para quem tem `params.save_defaults`.
- `src/components/SavePresetButton.tsx` — insere/atualiza linha em `pricing_presets`.

## Migração de dados existentes

Na primeira vez que o usuário autenticado abrir o app após o deploy:
- Se houver dados em `localStorage` e não houver linha equivalente em `user_app_state`, fazemos um seed automático (upsert) e marcamos `user_app_state:migrated=true` no localStorage para não repetir.
- Isso preserva o trabalho que já existe no navegador atual de cada usuário.

## Tabelas e RLS (resumo)

```text
user_app_state (user_id, key, value jsonb, updated_at)
  - select/insert/update/delete: user_id = auth.uid()

app_defaults (key pk, value jsonb, updated_at, updated_by)
  - select: authenticated
  - insert/update/delete: has_permission(auth.uid(), 'params.save_defaults')

pricing_presets (id, user_id, name, payload jsonb, created_at, updated_at)
  - select/insert/update/delete: user_id = auth.uid()
  - opcional: flag `shared boolean` + policy que libera leitura quando shared=true
```

## Entregáveis

1. Migração SQL criando as três tabelas + RLS.
2. Hook `useCloudState` e adaptação de `usePersistentState`.
3. Refactor de `usePricingPresets`, `SaveDefaultsButton`, `SavePresetButton`.
4. Seed automático a partir do localStorage existente.
5. Indicador de "Salvando…/Salvo" no header (opcional, mas recomendado para o usuário ter feedback).

## Fora do escopo

- Compartilhar precificações entre usuários (pode entrar numa fase 2 com `shared=true`).
- Histórico/versão dos dados.
- Tema e ordem da navegação continuam locais.

## Passo a passo de execução

1. Criar migração das tabelas (`user_app_state`, `app_defaults`, `pricing_presets`) com RLS.
2. Criar `useCloudState` e plugar em `usePersistentState`.
3. Refatorar presets e botões de salvar.
4. Implementar seed do localStorage → nuvem.
5. Testar em duas janelas/navegadores diferentes para confirmar sincronização.
