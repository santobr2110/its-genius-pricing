# Custo Unificado por UM — Faixas Marginais

## Objetivo
Substituir os três campos atuais de "custo por ativo monitorado por camada" (`custoAtivoMonitorado`, `custoAtivoFlow`, `custoAtivoOperacao`) por **um único mecanismo** baseado em:
- **Pesos por tipo de ativo** → convertem inventário em **UM** (Unidade de Medida).
- **Faixas marginais progressivas** de **CUSTO/UM** (estilo IR).
- O custo é cobrado **uma única vez** na composição, independente de quantas camadas estejam ativas.
- O campo **"Custo por Atendente no ITSM"** (Smart Flow) permanece intacto.

## Modelo de dados (novo estado global persistente)

```text
monitorPesos: { servidores: 1, bancoDados: 1.2, firewall: 0.7, ativosRede: 0.5 }
monitorFaixas: [
  { de: 0,   ate: 50,     custoPorUM: 13.62 },
  { de: 50,  ate: 150,    custoPorUM: 9.80 },
  { de: 150, ate: 300,    custoPorUM: 6.54 },
  { de: 300, ate: 600,    custoPorUM: 4.90 },
  { de: 600, ate: 100000, custoPorUM: 3.54 },
]
monitorPisoMensal: 750   // piso de VENDA (opcional, aplicado no custo equivalente)
```

Armazenado como bloco em `ITSMState` e incluído no snapshot dos Perfis de Parâmetros / Presets.

## Cálculo (utilitário `src/lib/custoMonitoramentoUM.ts`)

```text
UM_total = Σ (qtd_tipo × peso_tipo)
custo_faixa_i = max(0, min(UM_total, faixa.ate) − faixa.de) × faixa.custoPorUM
custoMonitoramentoTotal = Σ custo_faixa_i
```

- Piso mensal aplicado como custo equivalente mínimo (opcional, desliga com 0).
- Função pura + memoização em `useITSMCalculator`.

## Integração com o cálculo existente

Em `useITSMCalculator.ts`:
- Remover uso de `state.custoAtivoMonitorado`, `state.custoAtivoOperacao`, `state.custoAtivoFlow` na composição de custo.
- Substituir por `custoMonitoramentoTotal` (calculado 1x) somado à composição quando **qualquer** camada (Monitor, Flow, Operation ou Performance) estiver ativa.
- Manter os campos antigos no estado por compatibilidade de presets antigos, mas marcados como *legacy* (não são mais lidos).

## UI — Métricas e Parâmetros

Novo card em `src/components/itsm/MetricsPanel.tsx` (abaixo/no lugar do card "Monitoramento" atual do Smart Monitor):

- **Pesos por tipo** (4 inputs): Servidores · Banco de Dados · Firewall · Ativos de Rede.
- **Faixas de custo por UM** (tabela editável de 5 linhas — "de", "até", "custo/UM"), com botão para adicionar/remover linha.
- **Piso mensal (R$)** — 1 input.
- **Painel de resultado** (readonly): UM total do inventário atual, custo total do monitoramento calculado, custo médio por UM, comparação com modelo flat.

O card antigo com "Custo por Atendente no ITSM" e sliders de "Qtd atendentes" **permanece** (Smart Flow — inalterado).
Os inputs de "Custo por ativo — Monitor/Operation/Flow" existentes em `TaxasDemanda.tsx` são **removidos**.

## Presets e Perfis de Parâmetros

- Novos campos entram no payload salvo (`parameter_profiles.payload` e `pricing_presets.calculator`).
- Presets antigos que carreguem os campos legacy continuam funcionando (compatibilidade), mas exibem aviso ao usuário para revisar as faixas.

## Impactos em relatórios/apresentações

- `Detalhamento.tsx`, `ResumoCotacao.tsx`, exportações PPTX: onde hoje se exibe "Custo do monitoramento por camada", passar a exibir uma única linha "Monitoramento (por UM)" com UM total e custo consolidado.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useITSMCalculator.ts` | Novo estado (`monitorPesos`, `monitorFaixas`, `monitorPisoMensal`), cálculo, remoção do uso legacy |
| `src/lib/custoMonitoramentoUM.ts` | **NOVO** — cálculo puro de UM/faixas |
| `src/components/itsm/MetricsPanel.tsx` | Novo card de faixas + pesos + piso |
| `src/pages/TaxasDemanda.tsx` | Remover inputs `custoAtivoMonitorado`/`custoAtivoOperacao`/`custoAtivoFlow` |
| `src/pages/Detalhamento.tsx`, `ResumoCotacao.tsx` | Ajuste na linha de custo de monitoramento |
| `src/lib/exportarApresentacaoTemplate.ts` | Ajuste da linha de monitoramento no PPT |
| `src/lib/clientProfileFields.ts` / `paramKeys.ts` | Incluir novos campos no snapshot de parâmetros |

Todos os cálculos permanecem **mensais** e o markup divisor (impostos + comissão + lucro) continua sendo aplicado pelo motor existente — a tabela de faixas fornece apenas **CUSTO/UM**.
