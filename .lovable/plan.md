# Fluxo de Aprovação de Precificações por Rentabilidade

## Visão Geral
Mecanismo de aprovação atrelado à **rentabilidade** da precificação salva. Faixas configuráveis por calculadora (offering), aprovação por **link em e-mail** (sem login), e marca d'água **"PENDENTE APROVAÇÃO"** nos relatórios exportados (PPTX e PDF) enquanto não houver aprovação completa.

---

## 1. Faixas de aprovação (configuráveis no Admin)

Defaults:
- `> 15%` → sem aprovação (especialista livre).
- `entre 10% e 15%` → 1 aprovador: **Gestor Comercial**.
- `< 10%` → 2 aprovadores em paralelo: **Diretor da BU** + **Diretor de Crescimento**.

Em **Administração → Aprovações de Precificação**:
- CRUD de faixas (min%, max%, papéis exigidos, modo: `qualquer` / `todos`).
- CRUD de papéis (Gestor Comercial, Diretor BU, Diretor de Crescimento, etc.).
- Atribuição de pessoas aos papéis.
- Configuração **por calculadora (offering)** — começamos por Smart ITO; as demais reutilizam.

## 2. Botão e status no painel de Rentabilidade (Smart ITO)

Ao lado do quadro de Rentabilidade no `SmartTiersPanel`:
- Badge: **Não enviado / Pendente (n/N) / Aprovado / Rejeitado / Liberado (>15%)**.
- Botão **"Solicitar aprovação"** habilitado quando a precificação foi salva e a rentabilidade exige aprovação.
- Link "Histórico" com aprovadores, decisões, datas e comentários.

## 3. E-mail de aprovação (Lovable Emails)

Para cada aprovador requerido:
- Resumo da proposição (cliente, oferta, preço, custo, rentabilidade, validade) — derivado do Resumo de Cotação.
- Botões **APROVAR** e **REJEITAR** com token único por aprovador (sem login).
- Edge function pública valida token, grava decisão, recalcula status agregado (modo "todos" / "qualquer") e notifica o solicitante.

## 4. Marca d'água nos relatórios exportados (PPTX e PDF)

Enquanto a precificação estiver **pendente** ou **rejeitada** e exigir aprovação:
- **PPTX** (`exportarApresentacao.ts` e `exportarApresentacaoModelo2.ts`): em **cada slide**, adicionar um shape de texto rotacionado ~-30°, centralizado, fonte grande (~120pt), cor cinza com transparência, conteúdo **"PENDENTE APROVAÇÃO"**, posicionado por cima do conteúdo.
- **PDF** (Resumo de Cotação e demais relatórios em PDF): renderizar texto diagonal **"PENDENTE APROVAÇÃO"** no centro de cada página, semitransparente. Implementação:
  - Se for export via `window.print()`/HTML→PDF: CSS `@media print` com pseudo-elemento fixo (`position: fixed`, `transform: rotate(-30deg)`, `opacity: .15`, repetido em cada página via `@page`).
  - Se for PDF gerado por biblioteca (jsPDF/pdf-lib): após escrever cada página, desenhar string rotacionada no centro com opacidade reduzida.
- **TXT de proposta**: cabeçalho `*** PENDENTE APROVAÇÃO ***`.
- Marca d'água sai automaticamente quando o status vira **Aprovado** ou quando rentabilidade > 15%.

Todas as funções de export passam a receber uma flag `watermark?: string` derivada do status da aprovação. A camada de UI que dispara o export consulta `usePricingApproval` e injeta `"PENDENTE APROVAÇÃO"` quando aplicável.

## 5. Escopo desta entrega

- Smart ITO ponta a ponta (UI + backend + e-mail + marca d'água em PPTX e PDF).
- Estrutura genérica por `offering`, reutilizável pelas demais calculadoras.
- Admin já preparado para múltiplas calculadoras.

---

## Detalhes técnicos

### Backend (Lovable Cloud)
Novas tabelas (com `GRANT` + RLS):
- `approval_roles` (slug, label).
- `approval_role_members` (role_id, user_id).
- `approval_tiers` (offering, min_pct, max_pct, mode `any|all`, ativo).
- `approval_tier_roles` (tier_id, role_id).
- `approval_requests` (cotacao_id, offering, rentabilidade_pct, tier_id, status `pending|approved|rejected|not_required`, requester_id, timestamps).
- `approval_decisions` (request_id, role_id, approver_user_id, token_hash, decision, decided_at, comment).

RLS: admins gerenciam configuração; solicitante vê seus pedidos; aprovadores veem pedidos atribuídos; edge function usa service role para validar tokens.

### Edge functions
- `request-pricing-approval` — calcula faixa, cria request + decisions com tokens únicos, dispara e-mails via `send-transactional-email`.
- `decide-pricing-approval` — endpoint público com `?token=…&action=approve|reject`, grava decisão, recalcula status e notifica solicitante.
- Templates: `pricing-approval-request` e `pricing-approval-result`.
- Pré-requisitos de e-mail (`setup_email_infra` + domínio) tratados na execução.

### Frontend
- `src/components/itsm/SmartTiersPanel.tsx`: badge + botão; hook `usePricingApproval(cotacaoId, offering, rentabilidadePct)`.
- `src/lib/exportarApresentacao.ts`, `exportarApresentacaoModelo2.ts`: aceitar `watermark?: string`, desenhar shape diagonal em cada slide.
- Export de PDF (Resumo de Cotação e demais): aplicar marca d'água diagonal centralizada em cada página (CSS `@media print` para HTML→PDF; chamada por página para PDF programático).
- `src/lib/profissionais/exportProposta.ts`: cabeçalho de marca d'água no TXT.
- Página `src/pages/admin/AprovacoesPrecificacao.tsx` com CRUD de papéis, membros e faixas por calculadora; entrada no menu Admin.
- Rota pública `/aprovacao/:token` mostrando resultado (aprovado / rejeitado / inválido / já decidido).

### Não incluso nesta entrega
- Fiação visual nas demais calculadoras (Profissionais, Field Service) — estrutura suporta, virá em entregas seguintes.
