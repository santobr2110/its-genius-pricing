# Remover Field Service do Smart ITO

Remoção completa da estrutura de Field Service de Microinformática da calculadora Smart ITO, incluindo o inventário de usuários/desktops e a demanda de chamados de usuários, com limpeza de código morto.

## O que sai da aplicação

- **Página Field Service** (`/field-service`), seu item de menu, permissões (`page.field_service` e `page.field_service.write`) e rota.
- **Equipes Field** (N1F/N2F/N3F): estado, custos, capacidade e integração com o contexto global.
- **Sub-camada "Field Service"** dentro do Smart Operation: toggle, percentuais de distribuição, modo de alocação (proporcional/direto), limites e quantidades diretas.
- **Inventário de Usuários e Desktops**: campos de quantidade, taxas de chamados por usuário/equipamento, e toda a demanda de "chamados de usuários" que hoje entra no funil N1/N2/N3.
- **Rotinas do grupo Microinformática** (mi-1 a mi-12) do catálogo de Gestão de TI e o cálculo de custo dessas rotinas.
- **Escopo**: camada `fieldService` (título, itens, restrições) e os itens adicionais atrelados a usuários/desktops.
- **Área "Field Service de Microinformática"** dos relatórios de demanda e composição de custos.

## Relatórios e exportações a ajustar

- Relatório de Proposição: remoção do bloco/linhas de Field e da área de usuários no detalhamento de demanda.
- Resumo de Cotação: remoção das linhas de custo/venda de Field.
- Relatório de Demanda: remoção da área de usuários/Field das tabelas e totais.
- Apresentações PPTX (modelos existentes): remoção das seções e métricas de Field.
- Totalizadores (`tierPricing`): a parcela `fieldService` deixa de existir; Operation passa a somar apenas base + endpoint tooling + GMUDs + rotinas.

## Limpeza no banco

- Remover a chave de parâmetros das equipes Field (`itsm:fieldteams:v1`) dos perfis de parâmetros, dos defaults globais e do estado dos usuários.
- Remover dos snapshots das precificações salvas e dos perfis os campos de Field (toggle, percentuais, quantidades diretas, custos e capacidades) e os campos de inventário de usuários/desktops e suas taxas.
- Remover os itens adicionais de escopo referentes a usuários/desktops das listas salvas.

## Detalhes técnicos

Arquivos removidos: `src/pages/FieldService.tsx`, `src/hooks/useFieldTeamsState.ts`.

Arquivos editados:
- `src/hooks/useITSMCalculator.ts` — remover campos de estado Field e de inventário de usuários/desktops, o bloco de cálculo `custoFieldTotal`/triagem, e o objeto de resultado `fieldService`; recompor `baseFunil` sem a exceção de Field.
- `src/contexts/ITSMContext.tsx` — remover o hook de equipes Field e os três efeitos de sincronização de custo/capacidade.
- `src/lib/extrasOperacionais.ts` — remover `custoRotinasField` e seu bloco.
- `src/lib/tierPricing.ts` — remover a parcela `fieldService` de custo e venda.
- `src/lib/buildAreas.ts` — remover a área de Field/usuários.
- `src/lib/clientProfileFields.ts`, `src/lib/paramKeys.ts`, `src/lib/defaultsLabels.ts` — remover chaves e campos de Field.
- `src/data/rotinas.ts` — remover as rotinas mi-1..mi-12.
- `src/data/escopoProposicao.ts` — remover a camada `fieldService` do tipo `CamadaKey`, listas e labels.
- `src/lib/itensAdicionais.ts` — remover a opção `fieldService` e recursos de usuários/desktops.
- `src/components/itsm/SmartTiersPanel.tsx`, `ClientPanel.tsx`, `DetailPanel.tsx`, `MetricsPanel.tsx` — remover controles de Field e do inventário de usuários/desktops.
- `src/pages/TaxasDemanda.tsx`, `GestaoTI.tsx`, `Escopo.tsx`, `Detalhamento.tsx`, `ResumoCotacao.tsx`, `RelatorioDemanda.tsx` — remover campos, colunas e blocos correspondentes.
- `src/lib/exportarApresentacao*.ts` — remover seções de Field.
- `src/components/SortableNav.tsx`, `src/App.tsx`, `src/lib/permissions.ts`, `src/pages/Admin.tsx` — remover rota, item de navegação e permissões.

Limpeza no banco por operações de dados em `parameter_profiles.payload`, `pricing_presets.payload`, `app_defaults` e `user_app_state`, apagando as chaves Field e os campos de inventário de usuários/desktops.

Ao final: verificação de tipos e varredura por referências remanescentes a `field`/`Field`/`microinform`.
