
## Objetivo

Quebrar o bloco "Horas Técnicas" (sobra do pool N3) em duas faixas: **Horas de Melhoria** (nova) e **Horas Técnicas** (resíduo). Sem alterar o total contratado nem o preço — apenas redistribuição visual e analítica.

## Regras de alocação (prioridade)

- **Operation:** Chamados → Rotinas → **Horas de Melhoria** → Horas Técnicas (resíduo).
- **Performance:** Chamados → Rotinas → TAM → Owner → **Horas de Melhoria** → Horas Técnicas (resíduo).

O slider novo controla **quanto da sobra após as faixas obrigatórias** vira "Melhoria". O que ainda restar permanece como "Horas Técnicas". Se não houver sobra, ambas ficam em 0 (alerta de estouro continua nas mesmas condições atuais).

## Estado e persistência

Dois novos sliders persistidos via `usePersistentState` (não entram no `ITSMContext`/cálculo de custo — são apenas visualizações da distribuição):

- `gestao-ti:smartOp:horasMelhoria` (horas absolutas, 0..sobraOperation)
- `gestao-ti:smartPerf:horasMelhoria` (horas absolutas, 0..sobraPerformance)

Clamp automático quando a sobra cai (`useEffect` ajustando o valor para `min(atual, sobra)`), garantindo que o slider nunca trave em valor inválido.

## UI — `src/components/itsm/SmartTiersPanel.tsx`

### Operation (linha de quadros atual: 3 cards em uma linha)
Reorganizar em **grid 2x2** (Chamados/Rotinas na primeira linha; Melhoria/Técnicas na segunda).
Adicionar slider "Horas de Melhoria" abaixo dos quadros, com max = sobra disponível.
Barra horizontal segmentada passa a ter 4 segmentos coloridos.

### Performance (linha atual: 5 quadros)
Reorganizar em **grid 3x2** (Chamados/Rotinas/TAM em cima; Owner/Melhoria/Técnicas embaixo).
Manter os sliders TAM e Owner lado a lado (como hoje) e adicionar o slider "Horas de Melhoria" ao lado, em coluna própria — três sliders em grid 3 colunas.
Barra segmentada com 6 cores.

### Robustez de interação
- Sliders usam `value={[clamp(min,max,val)]}` e `onValueChange` único.
- Quando `max` muda dinamicamente, `useEffect` re-clampa o estado uma única vez.
- Evitar re-render loops: sliders ficam controlados, sem `defaultValue`.

## Cálculo — `src/hooks/useITSMCalculator.ts`

Adicionar ao retorno do hook campos derivados (sem alterar preço):

```
n3Distribuicao: {
  chamados, rotinas, tam, owner, melhoria, tecnicas, total
}
```

Calculado a partir de `horasN3Mensais`, `horasAtendimentoN3`, rotinas N3 (já existentes no painel — mover lógica do panel para o hook), e os percentuais TAM/Owner + horas de Melhoria lidas via parâmetros recebidos por novo argumento opcional do hook **ou** via leitura direta de localStorage no Resumo/PPT (preferimos novo argumento: `useITSMCalculator({ horasMelhoriaOp, horasMelhoriaPerf, pctTam, pctOwner })`).

Como o cálculo de rotinas N3 hoje vive só no `SmartTiersPanel`, manteremos a derivação **lá** e exporemos via `ITSMContext` um helper read-only `n3Breakdown` (objeto memoizado) consumido pelos relatórios e PPT.

## Relatório — `src/pages/ResumoCotacao.tsx`

Bloco "Distribuição das Horas N3" (linhas 583–...) já só aparece com Performance. Acrescentar:

- Operation: bloco análogo com 4 segmentos (Chamados/Rotinas/Melhoria/Técnicas), exibido quando `tierOperation && !tierPerformance && horasN3 > 0`.
- Performance: substituir "Livre" pela dupla "Melhoria + Técnicas" (6 segmentos).

Sem mudança em colunas ou totais — apenas a faixa de detalhamento abaixo.

## PPTs — `src/lib/exportarApresentacao.ts` e `exportarApresentacaoModelo2.ts`

Localizar slides que descrevem a distribuição de N3 (procurar por `TAM`, `Owner`, `Livre`, `Horas Técnicas`) e substituir "Livre/Horas Técnicas" por duas linhas: "Horas de Melhoria" e "Horas Técnicas", com as horas correspondentes. Mesmo comportamento condicional por camada.

## Garantias

- Total contratado (`horasN3Mensais`) inalterado.
- Custos, preço de venda, composição financeira inalterados (Melhoria/Técnicas são apenas particionamento do resíduo já contabilizado).
- Mensagem de estouro continua quando soma das faixas obrigatórias > total.

## Verificação

1. Build/typecheck automático.
2. Inspecionar `ResumoCotacao` na rota `/ito` com Operation e com Performance ativos para conferir distribuição.
3. Conferir totais idênticos antes/depois (preço mensal não muda).
