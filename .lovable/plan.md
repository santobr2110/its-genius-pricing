## Visão geral

Vamos construir um sistema completo de autenticação e controle de acesso (RBAC) sobre Lovable Cloud. A ideia central: **permissões ficam no perfil**, e cada usuário recebe um perfil. Admin pode criar/editar perfis, criar/remover usuários, trocar senhas e atribuir perfis.

Perfis iniciais: `admin` (acesso total e imutável), `arquiteto` (sem permissões iniciais), `gestor_operacao` (sem permissões iniciais). Admin poderá criar outros perfis depois.

O primeiro usuário cadastrado vira automaticamente Administrador.

---

## Estrutura de dados (Lovable Cloud)

**Enum `app_role`** — não usado para permissões diretas, apenas como rótulo de sistema (`admin`, `arquiteto`, `gestor_operacao`, `custom`).

**Tabela `profiles`** — dados básicos do usuário (id = auth.users.id, nome, email, role_id, created_at).

**Tabela `roles`** — perfis nomeados:
- `id`, `name` (ex: "Administrador"), `slug` (`admin`), `is_system` (true para admin, bloqueia edição/exclusão), `description`.

**Tabela `role_permissions`** — permissões por perfil (uma linha por par perfil + permissão):
- `role_id`, `permission_key` (string), `allowed` (bool).

**Tabela `user_roles`** — vínculo perfil↔usuário (1:1 inicialmente, mas modelado N:N para extensão futura):
- `user_id`, `role_id`.

**Função `has_permission(_user_id, _permission_key) returns boolean`** — SECURITY DEFINER que retorna true se o perfil do usuário tem a permissão liberada. Admin sempre retorna true.

**Função `is_admin(_user_id) returns boolean`** — atalho para checagens RLS.

**Trigger no signup**:
- Cria linha em `profiles`.
- Se não existir nenhum usuário ainda → cria perfil admin (se não existir) e atribui ao novo usuário. Caso contrário, fica sem perfil até admin atribuir.

**RLS**:
- `profiles`: cada usuário lê o próprio; admin lê/edita tudo.
- `roles`, `role_permissions`, `user_roles`: leitura para autenticados; escrita só admin. Perfis `is_system=true` não podem ser deletados/renomeados.

---

## Catálogo de permissões

Definido em código (`src/lib/permissions.ts`) para que admin marque caixas no painel. Estrutura:

```text
Páginas (acesso de visualização)
  page.home, page.detalhamento, page.equipe_n1, page.equipe_n2,
  page.equipe_n3, page.financeiro, page.taxas_demanda,
  page.precificacoes, page.operacao, page.field_service, page.gestao_ti

Ações finas
  pricing.edit              editar parâmetros de precificação
  pricing.save_preset       salvar/atualizar precificações (presets)
  pricing.delete_preset     remover precificações salvas
  params.save_defaults      salvar parâmetros padrão (botão "Salvar Parâmetros")
  pricing.export_pdf        exportar PDF / proposta
  teams.edit                editar equipes N1/N2/N3
  financeiro.edit           editar configurações financeiras
  admin.users.manage        criar/editar/remover usuários e trocar senhas
  admin.roles.manage        criar/editar perfis e permissões
```

Admin tem todas implícitas.

---

## Fluxo no frontend

**Autenticação**
- Rota pública `/auth` com tabs Login / Cadastro.
- `useAuth` hook expõe `user`, `session`, `loading`, `signIn`, `signUp`, `signOut`. Usa `onAuthStateChange` antes de `getSession`.
- Sem perfil atribuído → tela "Aguardando aprovação do administrador".

**Contexto de permissões**
- `AuthProvider` carrega perfil + permissões após login e disponibiliza `can(permissionKey)`.
- Componente utilitário `<Can permission="...">children</Can>` e `<ProtectedRoute permission="...">`.

**Rotas**
- Cada rota em `App.tsx` é envolvida por `ProtectedRoute` com a permissão de página correspondente. Sem permissão → redireciona para a primeira rota permitida ou para `/sem-acesso`.

**Navegação (`SortableNav`)**
- Filtra itens pelo `can('page.*')`. Itens sem permissão ficam ocultos.

**Botões sensíveis**
- `SaveDefaultsButton` → `can('params.save_defaults')` (desabilitado/ocultado).
- `SavePresetButton` → `can('pricing.save_preset')`.
- Botão de export PDF → `can('pricing.export_pdf')`.
- Inputs de precificação → `disabled` quando `!can('pricing.edit')`.

**Área de administração** (`/admin`, somente admin):
1. **Usuários** — tabela com nome, email, perfil; ações: criar usuário (email + senha temporária), trocar senha, remover, atribuir/trocar perfil.
2. **Perfis** — tabela de roles; criar, renomear, excluir (exceto `is_system`); editar permissões via lista de checkboxes agrupadas (Páginas, Ações).

Operações sensíveis (criar usuário, trocar senha de outro, deletar usuário) precisam de **edge function** `admin-users` autenticada que valida `is_admin(auth.uid())` e usa o Service Role para chamar `supabase.auth.admin.*`.

---

## Edge function `admin-users`

`supabase/functions/admin-users/index.ts` com ações:
- `create` → cria usuário com email/senha, opcionalmente atribui role.
- `update_password` → reseta senha de qualquer usuário.
- `delete` → remove usuário.
- `assign_role` → upsert em `user_roles`.

Valida JWT, confere `is_admin`, valida payload com Zod, retorna CORS.

---

## Detalhes técnicos

- **Migrations**: enum, tabelas, RLS, funções `has_permission`/`is_admin`, trigger `on_auth_user_created`, seed dos 3 perfis e das permissões do admin.
- **Frontend**: novas páginas `Auth.tsx`, `SemAcesso.tsx`, `Admin.tsx` (com sub-tabs Usuários / Perfis). Header recebe avatar + menu (logout, admin).
- **Estado**: `AuthProvider` global em `App.tsx`, acima do `ITSMProvider`.
- **Tipos**: `Permission` union string para autocomplete.
- **UX**: toasts de sucesso/erro, confirmação para exclusões, validação de senha mínima 8 caracteres com Zod.

---

## Entregáveis desta etapa

1. Ativar Lovable Cloud.
2. Criar migrations (schema + funções + trigger + seed).
3. Criar edge function `admin-users`.
4. Criar `AuthProvider`, `useAuth`, `usePermissions`, `<Can>`, `<ProtectedRoute>`.
5. Páginas `Auth`, `SemAcesso`, `Admin` (Usuários + Perfis).
6. Aplicar `ProtectedRoute` em todas as rotas e filtros em `SortableNav`, `SaveDefaultsButton`, `SavePresetButton` e inputs/áreas de precificação.

Após sua aprovação, prossigo na ordem acima.
