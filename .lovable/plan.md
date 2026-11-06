# Preço final detalhado ao cliente — todas as ofertas

## Resultado da avaliação

A separação solicitada ainda não é consistente nas cinco ofertas. Os motores já fornecem preço final e alíquotas suficientes para apresentar o detalhamento **sem alterar o preço**. A mudança deve ocorrer nas apresentações e nas novas emissões, não na fórmula de formação de preço.

| Oferta | Situação encontrada | Saídas a ajustar |
|---|---|---|
| Smart ITO — clássico e M1–M4 | Possui preço sem PIS/COFINS/ISS, mas algumas saídas mostram impostos agregados com IRPJ/CSLL. Um agregado interno inclui também encargos financeiros. | Preço selecionado, resultado, relatório de proposição, resumo e PDF/Word ativos. Preparar os geradores PowerPoint existentes, sem reativar os botões atualmente bloqueados. |
| BodyShop | Resumo agrega impostos com IRPJ/CSLL; proposta informa impostos inclusos. Há alíquotas congeladas por profissional. | Configurador, composição financeira, resumo/PDF, proposta e PowerPoint; manter compatibilidade dos emissores Word/PDF históricos. |
| Treinamento | Preços por aluno/turma disponíveis; tela e Word dizem impostos inclusos. Não há congelamento completo de alíquotas por linha nas cotações. | Configurador, composição financeira, resumo/PDF e proposta/Word, com detalhamento por aluno quando aplicável. |
| Subscrições Zabbix | Alíquotas congeladas por SKU; propostas não armazenam demonstrativo tributário. Configurador mensaliza por 12, enquanto a proposta possui vigência parametrizável. | Configurador, composição financeira, resumo/PDF, proposta e Word oficial; componentes PDF de proposta mantidos compatíveis, sem acrescentar botão removido. |
| Pacotes Consultivos Zabbix SRE | Alíquotas congeladas por pacote; proposta apresenta total e valor/hora, sem carga monetária detalhada. | Configurador, composição financeira, resumo/PDF, proposta e Word; manter compatível o emissor PDF existente, sem adicionar novos botões. |

Não foi localizado emissor comercial Excel ativo; os usos identificados são importações. Não criar exportação nova nesta mudança.

**Verificação realizada:** 247 testes passaram em 12 arquivos, cobrindo motores, não regressão, equivalência de chegada, CBS e emissores de propostas. Os modelos Word Zabbix e PowerPoint BodyShop foram inspecionados. Ainda não foi feita validação visual de todas as telas autenticadas nem de novos arquivos com o detalhamento.

## Formato aprovado

Apresentar, para o preço efetivo após descontos:

- **Preço sem impostos (ISS, PIS e COFINS)**.
- **ISS:** percentual, base de cálculo e valor em reais.
- **PIS:** percentual, base de cálculo e valor em reais.
- **COFINS:** percentual, base de cálculo e valor em reais.
- **Total de impostos destacados**.
- **Preço final com impostos** — igual ao preço final já calculado.

Os impostos já estão incluídos no preço; não serão cobrados novamente. IRPJ/CSLL permanece na composição interna, assim como comissão, retenção e encargos financeiros; nenhum desses componentes entra no destaque tributário ao cliente. O detalhamento é comercial, não uma emissão de nota fiscal.

Quando houver alíquotas diferentes, calcular e detalhar por item. O consolidado mostra os valores somados; não apresentar uma alíquota única como se fosse a alíquota fiscal de todos os itens.

## Implementação

1. **Demonstrativo único:** criar uma conta compartilhada de apresentação, baseada exclusivamente no preço final e nas alíquotas que produziram aquele resultado. Usar a mesma estrutura nas telas e nos documentos.
2. **Aplicar em todas as saídas:** itens, totais e quadros comerciais identificados na avaliação, conservando os layouts e botões atuais. Distinguir demonstrativo cliente da composição interna do ROI.
3. **Respeitar a unidade da venda:** mensal e contrato no ITO/BodyShop; total e mensalização de 12 meses no Zabbix; aluno/turma no Treinamento; hora/pacote no SRE. Sinalizar eventual vigência Zabbix divergente de 12 meses, sem alterar silenciosamente parâmetros ou preços.
4. **Novos documentos:** incorporar o demonstrativo congelado aos modelos de emissão e ajustar as áreas de investimento dos templates. Manter as páginas 1–4 e a formatação institucional do Word Treinamento intactas.
5. **Preservar históricos:** não modificar documentos já emitidos, nem completar impostos históricos com cadastro atual. Novas emissões de cotações existentes só terão detalhamento quando houver dados fiscais históricos suficientes. No Treinamento, capturar alíquotas nas novas cotações/emissões; quando ausentes no histórico, solicitar reavaliação explícita antes de uma nova emissão detalhada.
6. **CBS separada:** conservar a projeção de reforma e sua vigência, sem somar CBS ao preço atual nem mudar sua regra central.
7. **Validar:** testes de reconciliação, múltiplas alíquotas, desconto, unidades de venda e congelamento; repetir testes de não regressão sem atualizar snapshots. Conferir telas em computador/celular e emitir/abrir os documentos de cada oferta com dados reais autorizados.

## Cuidados técnicos

- Não reutilizar `valorImpostos` do ITO para o destaque: ele inclui IRPJ/CSLL e financeiro. Não subtrair o agregado dos resumos que inclui IRPJ/CSLL.
- Calcular ISS/PIS/COFINS sobre o preço final existente, seguindo os motores; não aplicar as alíquotas novamente sobre o valor líquido. Exames e subscrições de preço fixo permanecem de preço fixo.
- Arredondar somente na apresentação e reconciliar centavos para que líquido + ISS + PIS + COFINS seja exatamente o total exibido. A precisão dos motores permanece intacta.
- Revisar o Resumo ITO, que pode combinar preço do contexto e alíquotas salvas: preço e impostos devem usar a mesma fonte efetiva, preservando extras e camadas contratadas.
- Acrescentar campos opcionais/versionados aos modelos congelados; emissões antigas continuam no caminho legado. Preservar a versão dos templates para não mudar downloads anteriores, especialmente no PowerPoint BodyShop.
- Pontos centrais: `src/lib/pricing/`, `src/lib/{treinamento,zabbix,sre,bodyshop}/proposta*`, `src/pages/*/Resumo.tsx`, `ResumoCotacao.tsx`, `Detalhamento.tsx`, componentes de preço e modelos oficiais.

## Limites desta etapa

Esta etapa concluiu a avaliação e os testes do comportamento existente; **a apresentação detalhada ainda não foi implementada**. A leitura dos registros ativos encontrou 48 cotações ITO com as três alíquotas salvas, duas Zabbix com snapshot e uma BodyShop com snapshot. Não havia cotações ativas de Treinamento ou SRE nessa consulta; a avaliação dessas ofertas foi de código e testes. Ter um snapshot não comprova, sozinho, a completude de todos os campos históricos.