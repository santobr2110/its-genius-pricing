# Nova oferta: Smart Service Desk

Adiciona uma calculadora de precificação independente para Service Desk de usuário final, dentro do grupo ITO, sem tocar em nenhum arquivo do Smart ITO já em produção (exceto três pontos de registro central, listados no fim).

## Princípio

Namespace de dados próprio: `ito.smart-service-desk.`
Tudo que é lógica de negócio do Service Desk vive em `src/lib/servicedesk/`, `src/hooks/servicedesk/` e `src/pages/servicedesk/`. Nenhum import de `useITSMCalculator`, `tierPricing`, `CamadaKey` ou `exportarApresentacao*`.

## 1. Registro da oferta

- `src/lib/offerings.ts`: nova oferta no grupo `ito` — slug `smart-service-desk`, nome "Smart Service Desk", routePrefix `/service-desk`, com a lista de rotas. (adição pura, não altera Smart ITO)
- `src/lib/permissions.ts`: novo bloco `page.sd.*`, `page.sd.*.write`, `sd.pricing.save|delete|export`, `sd.params.save_defaults`, `sd.financeiro.edit`, `sd.teams.edit`, `offering.ito.smart-service-desk.access`, no grupo "ITO › Smart Service Desk". A tela de Admin já renderiza dinamicamente.
- `src/App.tsx`: rotas novas sob `/service-desk` protegidas por `ProtectedRoute` + `WriteFence`, no mesmo padrão do BodyShop.
- `src/lib/paramKeys.ts`: `ParamOffering` ganha `"smart-service-desk"`, com `SERVICE_DESK_PARAM_KEYS` e `SERVICE_DESK_PRICING_OWNED_KEYS`.
- Aprovações: nenhuma mudança de código; as faixas são cadastradas em Admin com offering `smart-service-desk`.
- Banco: nenhuma migração. `pricing_presets`, `parameter_profiles`, `app_defaults` e `approval_*` já são genéricos.

## 2. Motor de cálculo (`src/lib/servicedesk/`)

`custoAtendimentoUM.ts` — cópia adaptada do modelo de faixas marginais: pesos por `usuarioPadrao`, `usuarioVIP`, `estacaoTrabalho`; faixas progressivas de custo/UM idênticas em mecânica.

`regimeCusto.ts` — regra confirmada:
```text
remoto + selbetti               -> pool
remoto + cliente-integrado      -> pool (+ integração one-time)
remoto + cliente-sem-integracao -> semidedicado (fator de ineficiência, default 1.3x)
presencial | hibrido            -> dedicado (headcount fixo por site)
```
Fator de ineficiência configurável em Parâmetros.

`funilAtendimento.ts` — volume bruto por canal -> autoatendimento/triagem (redução) -> N1 -> % escalonado para N2/N3.

`coberturaFTE.ts` — piso mínimo de FTE por janela (comercial / estendida / 24x7). FTE vinculante = MAIOR(FTE por volume, piso da janela). Campos Min/Max no mesmo padrão das horas N3.

`bolsaHoras.ts` — reusa `computeN3Distribution` de `src/lib/n3Distribution.ts` (import direto, sem alterar o arquivo) para distribuir a bolsa de escalonamento em cascata.

`calcServiceDesk.ts` — orquestra: custo de equipe (regime) + custo por UM + canais + SLA + rotinas avançadas -> custo total -> cascata financeira (PIS/COFINS/ISS/Comissão/IRPJ-CSLL/Enc.Financ./Lucro) replicada em `financeiroServiceDesk.ts`, usando `comissaoRentabilidade.ts` sem alteração.

`itensAdicionaisSD.ts` — catálogo próprio: canal-adicional, hora-escalonamento-n2, integracao-itsm-cliente (one-time), base-conhecimento-setup (one-time), site-presencial, usuario-adicional, chatbot-ia-setup. Mesma mecânica de valor de venda = custo × fatorVenda, com ordenação manual e on/off por proposta.

`rotinasSD.ts` + `src/data/rotinasServiceDesk.ts` — catálogo semente de 12 rotinas de microinformática (grupo, frequência -> chamados/mês, CAC 0.2, automação, horasExecução). Rotinas "Base" consomem a bolsa de horas do gate de Escalonamento; "Avançado" são cobradas à parte (demanda × horas × valorHora × fatorAutomação). Como o documento de referência não chegou, o catálogo entra com valores padrão editáveis na tela de Rotinas e salvos no perfil de parâmetros.

## 3. Estado e persistência

- `useServiceDeskCalculator.ts` — estado + resultados, persistido via `usePersistentState` no namespace da oferta.
- `useServiceDeskTeamState.ts` — cadastro próprio e isolado de profissionais (cargo, salarioBase, encargosPerc, beneficiosFixo, custosIndiretosPerc, escala), no padrão do `useN1TeamState`.
- `useServiceDeskPricingPresets.ts` — interface `ServiceDeskPricingPreset` própria sobre a tabela `pricing_presets` existente (payload jsonb), com o mesmo fluxo Salvar/Restaurar/Excluir.
- `useRotinasSelecao` reaproveitado com chave própria do namespace.
- Contexto `ServiceDeskContext` para compartilhar estado entre gates e relatórios.

## 4. Telas (`/service-desk`)

Header no padrão documentado (BUMenu + grupos de navegação com DropdownMenu + botão "Precificações" com Salvar / Restaurar / Visualizar).

Calculadora em gates sequenciais, cada um destravando o próximo:
```text
1 Modalidade -> 2 ITSM -> 3 Cobertura -> 4 Volume -> 5 Escalonamento
-> 6 Base de Conhecimento -> 7 Multicanal -> 8 SLA
-> 8B Rotinas Preventivas (opcional) -> 9 Sites (só se modalidade != remoto)
```
Demais páginas:
- Equipe Service Desk
- Métricas e Parâmetros (pesos/faixas de UM, pisos de cobertura, fator de ineficiência, valor-hora)
- Financeiro (Resultado / Impostos & Markup / Comissões) — mesmas telas visuais, namespace próprio
- Escopo & Itens Adicionais
- Precificações salvas e Perfis de Parâmetros (réplica visual apontando para os hooks do Service Desk)

## 5. Relatórios e apresentação (módulo autônomo)

- `ResumoCotacaoServiceDesk.tsx` e `RelatorioDemandaServiceDesk.tsx` — mesmo layout visual do Smart ITO, tipos próprios.
- `exportarApresentacaoServiceDesk.ts` — pptxgenjs, tipo `GateSlideData`, mesma identidade visual/logo.
- Integração com `usePricingApproval` / `useApprovalConfig` usando `offering: "smart-service-desk"`; mesmo bloqueio de exportação para precificação não salva ou não aprovada.

## Arquivos existentes que serão tocados

Somente registros centrais, todos por adição: `src/lib/offerings.ts`, `src/lib/permissions.ts`, `src/lib/paramKeys.ts`, `src/App.tsx` e o menu do Hub/BUMenu. Nenhum arquivo de lógica do Smart ITO é alterado; `n3Distribution.ts`, `comissaoRentabilidade.ts` e as telas financeiras são consumidos como estão.

## Pendências que você pode ajustar depois

O documento de referência (seções 3.3 e 3.7) não chegou. A matriz de regime segue exatamente a função que você colou. As 12 rotinas e os fatores default (1.3x, pisos de cobertura, pesos e faixas de UM) entram com valores iniciais razoáveis e todos editáveis na tela de Parâmetros.
