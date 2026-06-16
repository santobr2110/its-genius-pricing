## Diagnóstico atual

- `parameter_profiles` já tem `offering_slug`, mas a tela `/perfis-parametros` filtra somente `smart-ito` e o snapshot grava chaves das **duas** ofertas no mesmo registro (o perfil "Base Zero - Selbetti Padrão" mistura `ito.smart-ito.*` + `prof.fin.*`).
- `useParameterProfiles.PARAM_KEYS` é uma lista única — não há separação por oferta.
- `app_defaults` não guarda nenhuma referência ao perfil que originou os valores; não há como saber qual perfil é o "padrão em uso".

## Mudanças

### 1. Banco (nova migração)

- Adicionar em `app_defaults`:
  - `source_profile_id uuid REFERENCES parameter_profiles(id) ON DELETE SET NULL` (nullable)
  - `source_profile_name text` (nullable, snapshot do nome no momento da aplicação)
- Nova tabela singleton `app_default_profile` (1 linha por `offering_slug`):
  - `offering_slug text PRIMARY KEY`
  - `profile_id uuid REFERENCES parameter_profiles(id) ON DELETE SET NULL`
  - `profile_name text NOT NULL`
  - `applied_at timestamptz`, `applied_by uuid`
  - RLS: leitura `authenticated`; escrita só admin (`public.is_admin`)
  - GRANT SELECT para `authenticated`, ALL para `service_role`

### 2. `src/lib/paramKeys.ts` (novo) + refator de `useParameterProfiles`

- Separar em dois arrays: `SMART_ITO_PARAM_KEYS` e `BODYSHOP_PARAM_KEYS`.
  - Smart ITO: chaves `ito.smart-ito.*` (calculator, n1team, n2team, fieldteams, gestao-ti, escopo)
  - BodyShop: `prof.fin.state.v1`, `prof.fin.comissaoTiers.v1`, `ito.smart-ito.prof.financeiro.codigoProduto`, `ito.smart-ito.prof.financeiro.cidadeIss` (mover namespace para `bodyshop.*` causaria migração de dados — manter nome atual, apenas classificar como "bodyshop")
- `useParameterProfiles({ offering })` passa a aceitar a oferta como filtro:
  - `save(name, offering)` snapshota só as chaves daquela oferta e grava `offering_slug` correspondente.
  - `apply` aplica somente as chaves do payload (já é o que faz).
  - `refresh` filtra por `offering` se informado, senão traz todos.
- `snapshotCurrentParams(userId, offering)` passa a aceitar oferta.

### 3. Tela `/perfis-parametros`

- Header indica origem (Smart ITO ou BodyShop) com tabs.
- Cada tab usa o hook filtrado pela oferta correspondente. O botão "Salvar" grava no `offering_slug` da tab ativa.
- `from` da rota (state) define qual tab abre por padrão.
- Badge mostrando "Padrão do sistema" no perfil que estiver vinculado em `app_default_profile`.

### 4. Migração de dados do perfil legado

- Para "Base Zero - Selbetti Padrão": criar dois perfis (um por oferta), dividindo o payload pelas chaves. Manter o original ou marcá-lo deprecated? **Opção escolhida:** dividir em dois (`... · Smart ITO` e `... · BodyShop`) via INSERT, manter o original intacto para histórico (admin pode apagar manualmente depois).

### 5. Painel `Administração › Parâmetros padrão` (`DefaultsAdminTab`)

- Cabeçalho novo "Perfil padrão em uso" por oferta:
  - Mostra nome do perfil ativo (de `app_default_profile`) ou "Nenhum perfil vinculado" (caso `app_defaults` tenha sido populado via "Salvar Status").
  - Botão "Definir perfil padrão" → dialog lista perfis daquela oferta → ao confirmar:
    1. Lê `payload` do perfil
    2. Upsert em `app_defaults` para cada chave (com `source_profile_id`, `source_profile_name`)
    3. Upsert em `app_default_profile`
    4. Toast + reload
- Coluna existente "Última alteração" passa a mostrar também "Origem: <perfil>" quando houver `source_profile_name`.

### 6. `SaveDefaultsButton` ("Salvar Status")

- Continua funcionando, mas limpa `source_profile_id`/`source_profile_name` (NULL) e remove a linha de `app_default_profile` da oferta correspondente — sinalizando que o padrão atual é "ad hoc" e não veio de um perfil.

## Fora de escopo

- Não mexer no `useActivePresetSession` (precificações abertas em aba) — sistema diferente, já isolado.
- Não renomear chaves `prof.fin.*` para `bodyshop.*` (evita migração arriscada de localStorage e de perfis existentes); apenas reclassificá-las.

## Arquivos afetados

- **Migração nova** `supabase/migrations/<ts>_app_defaults_source_profile.sql`
- **Insert de dados** dividindo o perfil "Base Zero - Selbetti Padrão"
- `src/lib/paramKeys.ts` (novo)
- `src/hooks/useParameterProfiles.ts` (refatorado, aceita `offering`)
- `src/components/SaveDefaultsButton.tsx` (limpa vínculo)
- `src/components/admin/DefaultsAdminTab.tsx` (cabeçalho + dialog "Definir padrão")
- `src/pages/PerfisParametros.tsx` (tabs por oferta, badge "Padrão")
- `src/integrations/supabase/types.ts` será regenerado pela migração