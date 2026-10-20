# Vinculação fiscal Smart ITO

- [x] Confirmar divergências: 17 SKUs, camada mais alta e M2 liberado nas superiores.
- [x] Criar os 17 produtos provisórios vinculados ao código de serviço 1.07.
- [x] Implementar vínculos editáveis e seleção fiscal automática por composição, preservando snapshots e modelo clássico.
- [x] Remover o quadro fiscal antigo somente após substituir sua função.
- [x] Testar seleção, tributação, não regressão e fluxo autenticado (124 testes; aplicação fiscal e reabertura verificadas).

# BodyShop — Fase 3
- [x] Motor mensal, herança, cascata/chegada e testes dos casos fornecidos (diferença de R$ 0,02 no contrato B documentada: precisão integral versus mensal arredondado).
- [x] Configurador com condições, memorial, seleção pela função IA existente e aprovação calculada do snapshot.
- [x] Cotações isoladas, transferência pela função existente e abertura em nova aba (verificada).
- [x] Snapshots e reavaliação comparativa confirmada (salário alterado, cancelamento preservou v1 e confirmação gravou v2).
- [x] Validar testes e fluxo autenticado de salvar/reabrir/reavaliar (176 testes, telas antigas intocadas, dados temporários excluídos, largura 390 sem corte).
- [ ] Validar inserção de perfil pela IA: depende da base salarial antiga por usuário e de um cargo correspondente no catálogo BodyShop vigente; catálogo oficial está vazio.