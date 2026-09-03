# Desabilitar exportação de Apresentação (PPTX) no Smart ITO

## Objetivo
Impedir que qualquer usuário gere a apresentação em PowerPoint enquanto o modelo está sendo reformulado, sem apagar o código de geração (para reativar depois).

## O que muda
Único ponto de saída existente: o menu "Exportar" da tela de Proposição (Relatório de Proposição). Não há outro botão de PPTX no app.

- O item "Apresentação (PPTX)" passa a ficar sempre desabilitado, com o texto complementar "em reformulação" e tooltip explicando que a exportação está temporariamente indisponível.
- Se por qualquer caminho a ação for disparada, ela retorna imediatamente com um aviso ("Exportação de apresentação temporariamente desabilitada"), sem gerar arquivo.
- A exportação "Anexo Contratual (PDF)" continua funcionando normalmente, com as regras atuais de bloqueio (precificação salva e aprovada).

## Detalhes técnicos
- `src/pages/Detalhamento.tsx`: introduzir uma flag `APRESENTACAO_PPTX_DISABLED = true`; aplicar em `disabled` e `title` do `DropdownMenuItem` da apresentação e como guarda no início de `handleExportPresentation`.
- Manter intactos `src/lib/exportarApresentacaoTemplate.ts` e demais exportadores, para reativação futura trocando a flag para `false`.
