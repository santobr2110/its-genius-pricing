# Reestruturação: Grupos, Ofertas e Permissionamento Hierárquico

Objetivo: organizar todo o sistema em três níveis — **Grupo** (ITO, Datacenter, Cloud, Observabilidade) → **Oferta** (ex.: Smart ITO) → **Página/Recurso** — com dados isolados por oferta e permissões granulares em cada nível. **Sem alterar nenhuma regra de cálculo do Smart ITO.**

---

## 1. Modelo conceitual

```
Business Unit: IT Solutions
└── Grupo: ITO
    └── Oferta: Smart ITO
        ├── Página: Início (calculadora)
        ├── Página: Proposição / Detalhamento
        ├── Página: Equipes N1/N2/N3
        ├── Página: Financeiro
        ├── Página: Métricas e Parâmetros
        ├── Página: Precificações salvas
        ├── Página: Field Service
        ├── Página: Gestão de TI
        ├── Página: Relatório de Demanda
        └── Recursos: editar preços, salvar preset, exportar PDF, salvar defaults...
└── Grupo: Datacenter (vazio)
└── Grupo: Cloud (vazio)
└── Grupo: Observabilidade (vazio)
```

Cada oferta tem **seu próprio escopo de dados** (presets, perfis de parâmetros, estado persistido). Hoje tudo está em chaves globais — passaremos a usar chaves namespaceadas por oferta.

---

## 2. Isolamento de dados (frontend + backend)

### 2.1 Convenção de namespace
Todo dado passa a ser identificado por `groupSlug` + `offeringSlug`:
- `ito/smart-ito/...` para o Smart ITO atual
- Futuras ofertas usarão seu próprio namespace

### 2.2 Persistência local (`localStorage` / `usePersistentState`)
- Prefixar todas as chaves com `ito.smart-ito.` (ex.: `itsm-state` → `ito.smart-ito.itsm-state`).
- Adicionar **migração one-shot** que copia chaves antigas para o novo namespace na primeira carga (sem perder dados de usuários atuais).

### 2.3 Persistência no banco (tabelas existentes)
Acrescentar colunas `group_slug text` e `offering_slug text` (com default `'ito'` / `'smart-ito'`) em:
- `pricing_presets`
- `parameter_profiles`
- `user_app_state`
- `app_defaults`

E ajustar índices únicos por `(user_id, offering_slug, key/name)`. Hooks (`usePricingPresets`, `useParameterProfiles`, etc.) passam a filtrar e gravar sempre com o offering ativo.

### 2.4 Contexto de Oferta ativa
Novo `OfferingContext` (`src/contexts/OfferingContext.tsx`) determina grupo/oferta correntes a partir da rota (`/ito/*` → ITO/Smart ITO) e expõe `{ groupSlug, offeringSlug }` para hooks de persistência. `ITSMContext` continua existindo, apenas consome esse namespace.

---

## 3. Permissionamento hierárquico

### 3.1 Novas tabelas
```
groups        (id, slug, name, order)
offerings     (id, group_id, slug, name, order, status)  -- status: active | coming_soon
permissions   (key, group_slug, offering_slug, scope, label)
              -- scope: 'group' | 'offering' | 'page' | 'action'
```
As permissões existentes (`page.home`, `pricing.edit`, etc.) serão **migradas** para chaves namespaceadas:
- `page.home` → `ito.smart-ito.page.home`
- `pricing.edit` → `ito.smart-ito.pricing.edit`
- etc.

Novas chaves de nível superior:
- `group.ito.access`, `group.datacenter.access`, `group.cloud.access`, `group.observabilidade.access`
- `offering.ito.smart-ito.access`

Regra de avaliação (em `has_permission`): acesso a uma página exige **acesso ao grupo E à oferta E à página**. Admin continua bypass total.

### 3.2 Seed
Migration popula `groups` e `offerings` com os 4 grupos e a oferta Smart ITO; replica as `role_permissions` atuais para as novas chaves namespaceadas, preservando os acessos já concedidos.

### 3.3 Camada de código
- `src/lib/permissions.ts`: passa a expor `PermissionKey` namespeada + helpers (`groupAccessKey(slug)`, `offeringAccessKey(group,offering)`, `pageKey(group,offering,page)`).
- `AuthContext.can(key)`: inalterado na API, mas usa as novas chaves.
- `ProtectedRoute`: para rotas do Smart ITO passa a verificar o trio (grupo+oferta+página) via um único helper `canPage('ito','smart-ito','home')`.
- `Hub` esconde cards de grupos sem `group.<slug>.access`; `BUMenu` filtra ofertas pelo acesso.

### 3.4 Tela de Admin
`src/pages/Admin.tsx` / `PerfisParametros` ganham um seletor **Grupo → Oferta** e exibem as permissões agrupadas em três blocos: **Grupo**, **Oferta**, **Páginas/Ações da oferta**. Estrutura preparada para futuras ofertas aparecerem automaticamente assim que registradas.

---

## 4. Compatibilidade e segurança

- **Sem mudanças em cálculos**: nenhum arquivo em `src/hooks/useITSMCalculator.ts`, `src/lib/buildAreas.ts`, painéis e componentes de cálculo será alterado em lógica — apenas a camada de persistência/leitura.
- Migração SQL idempotente, com defaults e backfill para não quebrar dados existentes.
- RLS mantida; políticas continuam por `user_id`, com filtro adicional implícito por offering nas queries do frontend.

---

## 5. Detalhamento técnico (arquivos)

**Novos**
- `src/contexts/OfferingContext.tsx`
- `src/lib/offerings.ts` (catálogo estático de grupos/ofertas + helpers de chaves)
- Migration SQL: tabelas `groups`, `offerings`; colunas `offering_slug`/`group_slug`; backfill; novas permission keys.

**Editados**
- `src/lib/permissions.ts` — novas chaves namespaceadas + helpers
- `src/App.tsx` — envolver com `OfferingProvider`
- `src/components/auth/ProtectedRoute.tsx` — aceitar `{ group, offering, page }`
- `src/hooks/usePersistentState.ts`, `usePricingPresets.ts`, `useParameterProfiles.ts` — prefixar por offering + migração one-shot
- `src/pages/Hub.tsx`, `src/components/BUMenu.tsx` — filtrar por acesso
- `src/pages/Admin.tsx`, `src/pages/PerfisParametros.tsx` — UI hierárquica de permissões

**Intocados (regras de cálculo)**
- `src/hooks/useITSMCalculator.ts`, `useN1TeamState.ts`, `useN2TeamState.ts`, `useFieldTeamsState.ts`
- `src/contexts/ITSMContext.tsx` (apenas namespace de persistência muda, lógica não)
- Todos os componentes em `src/components/itsm/*`
- `src/lib/buildAreas.ts`

---

## 6. Entrega em ordem

1. Migration SQL (tabelas, colunas, seed, backfill de permissões).
2. `OfferingContext` + `lib/offerings.ts` + permissões namespaceadas.
3. Refator dos hooks de persistência (com migração one-shot de chaves).
4. Atualização de `ProtectedRoute`, `Hub`, `BUMenu`.
5. UI de Admin/Perfis hierárquica.
6. Verificação: build limpo, Smart ITO segue calculando idêntico, dados antigos visíveis.
