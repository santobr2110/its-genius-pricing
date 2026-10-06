# Observabilidade em Níveis (M1–M4) convivendo com o modelo clássico

## Objetivo
Adicionar um segundo modelo de custo de monitoramento (níveis M1–M4 + carga NVPS), escolhido por precificação. O modelo clássico (UM + faixas 25/18/12/9/6,5) fica congelado e continua sendo o padrão, então as precificações salvas não mudam de valor.

## O que muda para o usuário
- **Tela de Camadas:** dois cartões no topo: "Monitoramento clássico" e "Observabilidade em níveis (M1–M4)". Ao trocar aparece um aviso de recálculo. Os dados do outro modelo ficam guardados e voltam intactos.
- **Nova página "Níveis de Observabilidade"** no menu de parâmetros do Smart ITO (endereço próprio, separado da área "Observabilidade" que já existe), com seis blocos:
  1. Nível contratado (M1–M4) com aviso de piso por camada (Monitor/Flow M1, Operation M2, Performance/Enterprise M3; M4 opcional em todas).
  2. Inventário (somente leitura, com link para o Perfil do Cliente) + pesos editáveis e UM por tipo.
  3. NVPS: tabela por tipo, campo "NVPS medido/real", badge de porte, fator de carga e tabela dos 7 portes.
  4. Curva base por faixa (editável, cálculo marginal).
  5. Fatores M1–M3, M4 como linha informativa; horas, proxies, custo/hora e custo/proxy.
  6. Memória de cálculo passo a passo, no formato do documento enviado.
  - Botão "Restaurar padrão". No modelo clássico a página mostra como ativar o modelo.
- No modelo de níveis, os controles de proxies e de Automação/Manutenção N3 do Monitor/Flow ficam ocultos e passam a vir dos campos da nova página.
- O Resumo de Cotação e o relatório de proposição mostram o modelo usado e, no modelo de níveis, o nível contratado ao lado da camada.

## Detalhes técnicos
- `src/lib/custoObservabilidadeNiveis.ts` (novo, funções puras): tipos e defaults exatamente como no documento. Funções: `computeObsUMTotal`, `computeNvpsPrevisto`, `classificaPorte`, `computeCustoObservabilidadeNiveis` (regras 1–8; o fator de carga não se aplica a horas e proxies; M4 zera o monitoramento) e `computeCustoPorUMMarginalNiveis` (tarifa da faixa × fatorPlataforma + piso, × fatorCarga) para itens adicionais.
- `useITSMCalculator.ts`: novos campos de estado (`modeloObservabilidade` com padrão "classico", `nivelObservabilidade` com padrão "M2", `obs*`), com valores padrão para registros antigos. A troca de modelo fica neste ponto: em `niveis`, `custoMonitoramentoUM` = custo do monitoramento no novo modelo + horas + proxies, e os proxies e `horasN3MonitorManut`/`horasN3FlowManut` deixam de somar no Monitor/Flow, para nada ser cobrado duas vezes. As horas de acionamento N3 (fora do monitoramento) continuam como hoje. Em `classico`, nenhum campo `obs*` é lido.
- `itensAdicionais.ts`: escolhe a função de custo marginal conforme o modelo ativo.
- `permissions.ts`: `page.niveis_observabilidade` (+ `.write`); rota `/niveis-observabilidade` em `App.tsx`; item no menu de parâmetros; `WriteFence` para quem só tem leitura.
- Persistência: os novos campos entram na lista de campos salvos da calculadora (`itsm:calculator:v1`), então vão junto em presets, perfis e precificações. Registros sem o campo carregam como "classico" e os valores padrão completam o resto.
- `SmartTiersPanel.tsx`: cartões de escolha do modelo e ocultação condicional. `ResumoCotacao.tsx` e `Detalhamento.tsx` (incluindo a exportação Word): rótulo do modelo e do nível.
- Testes em `src/test/custoObservabilidadeNiveis.test.ts`: benchmark (926,7 UM; NVPS 2.760; xLarge 1,55; faixas ≈4.603,74; M2 ≈9.310,35; M3 ≈10.239,39), M4, NVPS medido 1.500 → Large, não regressão do clássico e isolamento entre os modelos.
