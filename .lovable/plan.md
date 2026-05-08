## Objetivo

Separar conceitualmente a **abrangência** da rotina (descrição do escopo) dos **itens de inventário** (drivers de quantidade) e garantir que rotinas desapareçam da oferta quando o inventário vinculado estiver zerado. Em paralelo, redesenhar a tela de Rotinas usando **cards por rotina** no lugar das tabelas densas.

## Mudanças no modelo de dados (`src/data/rotinas.ts`)

Adicionar campo `abrangencia` ao tipo `Rotina`:

- `abrangencia: string` — rótulo livre que descreve o escopo (ex.: "Por servidor", "Por banco de dados", "Ambiente inteiro"). Apenas informativo.
- `ativo: AtivoTipo` — continua sendo o **driver de inventário** (quantos itens multiplicam a frequência).

Ajustar `inventarioMultiplicador` / `rotinaMultiplicador`:

- Quando `ativo === "Ambiente"`, retornar `1` somente se houver qualquer inventário > 0 (soma de usuários + equipamentos + servidores + ativos de rede + bancos + firewalls > 0). Caso contrário, **0** (some da oferta).
- Para os demais tipos a regra atual já zera quando a contagem é 0 — mantida.
- Para Performance Complexo via `complexFlag`, comportamento atual mantido (0 quando flag desativa).

Migração: ao carregar rotinas persistidas sem `abrangencia`, preencher com um rótulo derivado de `unidade`/`ativo`.

Defaults em `ROTINAS_DEFAULT`: incluir `abrangencia` apropriada para cada item.

## Redesenho da tela de Rotinas (`src/pages/GestaoTI.tsx`)

Substituir `RotinaGroupTable` por **`RotinaGroupCards`**:

- Cabeçalho do grupo igual ao atual (nome, badge de quantidade, totais à direita).
- Grid responsivo `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` de cards.
- Cada card de rotina mostra:
  - Topo: nome editável (input compacto) + badges (Oferta, Automação on/off, "Sem demanda" quando multiplicador = 0).
  - Linha 1: **Abrangência** (input texto livre).
  - Linha 2: **Vínculo de inventário** (select de `AtivoTipo` ou item de complexidade quando Performance Complexo) com a contagem atual ao lado (ex.: `Servidor (8)`).
  - Linha 3: Frequência (select) + Freq/mês (input numérico).
  - Linha 4: Demanda/mês destacada + CAC + (quando aplicável) Horas/exec.
  - Rodapé: Switch automação, botão mover Padrão↔Complexo (em Performance), botão excluir.
- Cards com `mult === 0` ficam com `opacity-60` e badge "Sem demanda no inventário" para deixar claro que não entram na oferta.

Atualizar o diálogo `NovaRotinaDialog` com o campo `abrangencia` (input de texto, opcional, default sugerido a partir do ativo).

## Observações técnicas

- Os cálculos em `SmartTiersPanel.tsx` já filtram por `demanda > 0`, então a mudança em `inventarioMultiplicador` automaticamente exclui rotinas "Ambiente" da oferta quando o inventário está zerado.
- Não alterar lógica de preço/markup, apenas o gating por inventário.
- `EscalaRotinasPanel`, painel de % automação e aba de GMUDs ficam intactos.

## Resumo da entrega

1. `src/data/rotinas.ts`: novo campo `abrangencia`, ajuste do `inventarioMultiplicador` para "Ambiente", abrangências preenchidas no catálogo padrão.
2. `src/pages/GestaoTI.tsx`: novo componente `RotinaGroupCards` substituindo `RotinaGroupTable`, dialog com campo de abrangência, badge de "sem demanda".