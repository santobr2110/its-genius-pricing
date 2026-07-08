## Objetivo

Transformar o Relatório de Proposição em uma versão única — sem alternância Color/B&W — desenhada como anexo técnico de contrato: preto e branco puro, imprimível, com ícones vetoriais dedicados por camada, sem valores monetários, e com quebras de página respeitando cada bloco de oferta.

## Escopo funcional

- Manter todas as seções e informações do relatório atual (camadas ativas, escopo incluído, restrições, inventário, componentes monitorados, rotinas preventivas, GMUDs, horas N3, itens adicionais, restrições gerais).
- Suprimir todos os valores monetários (mensal, anual, composição de valor, custo por chamado, valor hora, cards de investimento total).
- Remover toda a diagramação com gradientes, glows, blobs, anéis coloridos, `bg-clip-text`, sombras coloridas — resultado sempre chapado em preto sobre branco.
- Manter o layout geral (blocos de camada empilhados, cabeçalho, kicker "Proposta Comercial", lista de componentes, tabelas de rotinas/GMUDs, resumo de horas N3).

## Mudanças concretas

### 1. `src/pages/Detalhamento.tsx`
- Remover `reportColorMode`, `setReportColorMode`, `bwMode`, o bloco da barra de seleção "Colorido / Preto & branco" e os imports não usados (`Palette`).
- Aplicar sempre a classe `report-anexo` (renomeação semântica de `report-bw`) no `<main id="proposicao-printable">`.
- Simplificar `handleExportPDF`: sempre fundo branco, sempre classe `report-anexo`, manter lógica de quebra de página por seções (evitando cortar blocos). Aumentar prioridade das quebras nos limites de `<section>` diretos.
- Envolver cada bloco de camada e seção em `<section className="report-section">` para permitir CSS `break-inside: avoid`.
- Marcar todo elemento que exibe valores em R$ (spans, divs, `CompositionBox`, cards de "Investimento Total", `Stat` com `formatBRL`) com className `report-price` para hiding via CSS — a exibição continua no código, apenas oculta neste relatório. Isso mantém a lógica original intocada e evita risco de regressão.
- Trocar os ícones `Activity / Workflow / Rocket / TrendingUp / Crown` (por camada) por novos componentes SVG dedicados (ver item 3).

### 2. `src/index.css`
- Substituir todo o bloco `.report-bw` por `.report-anexo` com regras equivalentes de preto/branco puro (fundo branco, texto preto, bordas pretas, sem gradientes, sem sombras, sem opacidade parcial).
- Adicionar: `.report-anexo .report-price { display: none !important; }`.
- Adicionar regras de impressão / html2canvas: `.report-anexo .report-section { break-inside: avoid; page-break-inside: avoid; }` e margens internas maiores nos blocos para respirar.
- Ajustar `.report-anexo .report-kicker::before` para permanecer visível como já corrigido.
- Manter ícones (SVGs) sempre em `stroke: #000; fill: none` no modo anexo.

### 3. Novo arquivo `src/components/itsm/TierIcons.tsx`
- Cinco componentes SVG dedicados, apenas traço preto (currentColor), sem preenchimentos:
  - `MonitorIcon` — radar/pulso representando monitoramento 24x7.
  - `FlowIcon` — nós conectados por setas representando integração ITSM.
  - `OperationIcon` — headset com engrenagem representando service desk.
  - `PerformanceIcon` — velocímetro/gauge representando rotinas avançadas.
  - `EnterpriseIcon` — coroa/pilares representando governança executiva.
  - `FieldServiceIcon` — chave e maleta representando atendimento presencial.
- Cada ícone aceita `className` e `size`, herda `currentColor`, funciona em qualquer contexto (tela e PDF).

### 4. Comportamento de exportação
- Removida escolha de modo — botão de exportação PDF gera direto no formato anexo.
- Renomear label do botão de "Exportar PDF" para "Exportar Anexo Contratual (PDF)".

## Fora de escopo

- Nenhuma alteração em regras de cálculo (`useITSMCalculator`, `buildAreas`, funções de venda).
- Nenhuma alteração em `escopoProposicao.ts` (conteúdo textual).
- Não altero as exportações "Apresentação · Modelo 1/2" (PPTX). Permanecem coloridas como estão.
- Nenhuma mudança de banco/backend.

## Risco e verificação

- Risco baixo: mudanças são apresentacionais e usam CSS + classes para ocultar preços sem tocar em lógica.
- Verificação: build + inspeção visual do relatório na tela, tirando screenshot via Playwright para conferir ausência de valores, contraste preto/branco e ícones renderizando corretamente.
