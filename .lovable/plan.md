# Mudança no plano de rotinas

## Objetivo
1. Permitir que **qualquer rotina** (não só Performance/Complexo) tenha `horasExecucao` opcional.
   - Com horas → atendimento pelo N3, descontando das horas N3 contratadas e contabilizando volume.
   - Sem horas → entra no funil normal (N1/N2/N3 conforme distribuição de rotinas), sem descontar das horas contratadas.
2. **Rotinas Gerenciais Selbetti** deixam de ser automáticas em todas as ofertas:
   - Viram uma **categoria adicional** (flag `gerencial: true`) que é vinculada a **uma oferta específica** escolhida pelo usuário.
   - Sempre contabilizadas para cobrança (horas × valor/hora N3 × fator de automação), porém **não descontam** das horas contratadas pelo cliente.

## Mudanças no modelo (`src/data/rotinas.ts`)
- Remover `"Todos"` de `Oferta` e de `OFERTAS_ALL` (oferta passa a ser uma das 5 reais: Monitor, Flow, Operation, Performance, Enterprise).
- Remover `OFERTA_LABELS["Todos"]` e a função `rotinaAplicaA` (ou simplificar para `r.oferta === alvo`).
- Adicionar `gerencial?: boolean` em `Rotina`. Quando `true`, a rotina é tratada como "Gerencial Selbetti" vinculada à `oferta` informada.
- `horasExecucao?: number` permanece, mas agora válido para **qualquer** rotina (não apenas Performance/Complexo).
- Migrar dados padrão: rotinas que antes eram `oferta: "Todos"` mantêm `gerencial: true` e recebem oferta default (ex.: Operation) — usuário pode reatribuir.
- Manter `complexFlag` apenas para Performance/Complexo (gating de execução por flag do ambiente).

## Cálculo (`src/lib/extrasOperacionais.ts`, `useITSMCalculator`, etc.)
Para cada rotina ativa (multiplicador > 0):
- **Demanda mensal** = `chamadosMes × multiplicador` (mantém-se sempre, para contagem de volume).
- **Se `horasExecucao` definido (> 0)** → custo da rotina = `demanda × horas × valorHoraN3 × fatorAutomação`.
  - Horas consumidas são **somadas em `horasAtendimentoN3`** (descontam das horas N3 contratadas) — exceto quando `gerencial = true`.
  - Quando `gerencial = true`: o custo é somado em `custoRotinasGerenciais` (cobrado separadamente na camada dominante) e **não** desconta horas contratadas.
- **Se sem horas** → entra no funil de rotinas (distribuição `percRotinaN1/N2/N3`) como volume de chamados, custeada pelo custo/chamado de cada nível (com fator de automação no custo) — comportamento atual para rotinas sem horas.

## UI — `src/pages/GestaoTI.tsx`
- Remover oferta "Todos" dos selects.
- Adicionar **toggle "Gerencial Selbetti"** na linha/edição da rotina (independente da oferta) — quando marcado, a rotina aparece destacada e segue regra de "não desconta horas".
- Campo **Horas/execução** disponível para todas as rotinas (input opcional; vazio/0 = sem horas).
- Manter campo `complexFlag` apenas quando Performance + Complexo.
- Drawer de criação (`AddRotinaDrawer`): mesma lógica.

## UI de exibição (Detalhamento, SmartTiersPanel, RelatorioDemanda, ResumoCotacao)
- Substituir todos os filtros `r.oferta === "Todos"` por `r.gerencial === true` (filtro adicional por oferta vinculada).
- Quadro "Rotinas Gerenciais Selbetti" passa a ser exibido **na oferta vinculada** da rotina (não mais na camada dominante automaticamente).
- `extrasResumo.custoRotinasGerenciais` agora é somado por oferta, não atribuído à dominante.

## Migração de dados em memória
- Persistência local (`usePersistentState` chave de rotinas): adicionar um passo de migração que converte rotinas com `oferta === "Todos"` em `{ oferta: "Operation", gerencial: true }`.

## Arquivos impactados
- `src/data/rotinas.ts` — tipos, defaults, helpers.
- `src/pages/GestaoTI.tsx` — UI de edição/criação, multiplicadores e somatórios.
- `src/lib/extrasOperacionais.ts` — recálculo de custos.
- `src/hooks/useITSMCalculator.ts` — integração das horas das rotinas em `horasAtendimentoN3`/funil.
- `src/components/itsm/SmartTiersPanel.tsx`, `src/pages/Detalhamento.tsx`, `src/pages/RelatorioDemanda.tsx`, `src/pages/ResumoCotacao.tsx` — exibição.

## Pontos a confirmar
1. Para rotinas **gerenciais com horas**, o custo é cobrado pelo `valorHoraN3` (como hoje) — confirmar.
2. Para rotinas **não-gerenciais sem horas**, mantemos o comportamento atual de entrar no funil de rotinas pelo `percRotinaN1/N2/N3` — confirmar.
3. A oferta default para migrar as rotinas hoje marcadas como "Todos" deve ser **Operation**? Ou prefere outra (ex.: Performance)?
