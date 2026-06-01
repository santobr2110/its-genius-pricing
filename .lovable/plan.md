# Persistência e histórico de parâmetros padrão

## Diagnóstico do caso "61% virou 40%"

Consultei `app_defaults` e `user_app_state` para todas as chaves de equipes (N1, N2, Field Teams). Em **nenhuma versão** existe `encargosPerc: 61` — só `40`, em todas as datas (24/05, 25/05 e 01/06). Conclusão: a alteração para 61% nunca chegou ao banco. Provavelmente ficou só no `localStorage` da aba (sem clicar em "Salvar como padrão") e se perdeu quando o cache local foi limpo ou a migração de namespace (`itsm:` → `ito.smart-ito.itsm:`) puxou o valor antigo da nuvem.

A Etapa 2 abaixo elimina essa classe de problema: passamos a guardar **todas as versões** dos defaults no servidor, com autor, data e botão de reverter.

---

## Etapa 1 — Histórico visível dos defaults atuais

Painel na aba Admin > nova seção "Parâmetros padrão" listando cada chave de `app_defaults` com:

- Nome amigável da chave (mapeamento ex.: `ito.smart-ito.itsm:n1team:v1` → "Equipe N1")
- Última atualização (`updated_at`)
- Quem alterou (`updated_by` → join com `profiles.full_name/email`)
- Botão "Ver JSON" abrindo um modal com o `value` completo (read-only, formatado)

Sem mudanças de schema. Já dá visibilidade imediata de quem mexeu e quando.

## Etapa 2 — Versionamento server-side dos defaults

Toda alteração em `app_defaults` gera automaticamente uma linha na nova tabela `app_defaults_history`, permitindo auditoria e reversão a qualquer versão anterior.

### Mudanças de banco

Nova tabela `app_defaults_history`:

- `key` (text)
- `value` (jsonb) — snapshot completo
- `version` (bigint, autoincrement por key)
- `changed_by` (uuid)
- `changed_at` (timestamptz default now())
- `change_kind` (text: `insert` | `update` | `revert`)

Trigger `AFTER INSERT OR UPDATE` em `app_defaults` que insere a linha de snapshot.

RLS: leitura para `authenticated` (mesmo critério do `app_defaults`); insert só via trigger (sem policy de insert direto para usuários comuns); admin pode deletar entradas (limpeza).

GRANTs: `SELECT` para `authenticated`, `ALL` para `service_role`.

Backfill inicial: para cada linha atual de `app_defaults`, criar a versão 1 no histórico, com `changed_by = updated_by` e `change_kind = 'insert'`.

### UI no Admin

Na lista da Etapa 1, cada chave passa a ter botão "Histórico" abrindo um drawer:

- Tabela com colunas: Versão · Data/hora · Autor · Tipo · Ações
- Ação "Ver" abre o JSON formatado da versão
- Ação "Comparar com atual" mostra diff (campo a campo, só dos valores diferentes)
- Ação "Reverter para esta versão" pede confirmação e faz `UPDATE app_defaults SET value = <versão> WHERE key = ...`. A trigger registra automaticamente uma nova entrada no histórico marcada como `revert`.

Só admins (`is_admin`) podem reverter; demais usuários autenticados apenas visualizam (já é o comportamento do `app_defaults`).

### Aviso ao usuário no salvamento

No botão "Salvar como padrão" (`SaveDefaultsButton`), adicionar toast de sucesso com texto explícito: "Padrão atualizado e arquivado na versão N — pode ser revertido em Admin > Parâmetros padrão". Garante que o usuário entenda que a persistência foi efetivada.

---

## Detalhes técnicos

Arquivos novos:

- `supabase/migrations/<timestamp>_app_defaults_history.sql` — tabela, índice por `(key, version desc)`, trigger, backfill, GRANTs, RLS
- `src/components/admin/DefaultsHistoryDrawer.tsx` — drawer com lista de versões + ações
- `src/components/admin/DefaultsAdminTab.tsx` — nova aba/seção em `Admin.tsx`
- `src/hooks/useAppDefaultsHistory.ts` — fetch + revert (com `supabase.from('app_defaults_history')` e `app_defaults`)

Arquivos alterados:

- `src/pages/Admin.tsx` — adicionar `TabsTrigger` "Parâmetros padrão" e renderizar `DefaultsAdminTab`
- `src/components/SaveDefaultsButton.tsx` — texto do toast (mensagem com nº de versão criada — opcional, pode buscar `MAX(version)` depois do upsert)
- `src/integrations/supabase/types.ts` — regenerado automaticamente após a migration

Mapeamento de chaves para nomes amigáveis fica em um único `Record<string,string>` em `src/lib/defaultsLabels.ts` (reaproveitando os labels que já existem em `GROUP_LABELS`/`OFFERING_LABELS`).

A trigger usa `SECURITY DEFINER` para conseguir escrever no histórico mesmo quando o usuário só tem permissão de update via `has_permission('params.save_defaults')`.

## Fora de escopo

- Versionamento de `user_app_state` (estado pessoal por usuário) — pode entrar em uma etapa futura se necessário.
- Versionamento de `pricing_presets` — já têm soft-delete; histórico de payload pode ser adicionado depois.
