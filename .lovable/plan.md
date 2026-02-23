

# Calculadora de Precificação ITSM

## Visão Geral
Aplicação web responsiva estilo dashboard SaaS para calcular precificação de serviços de TI e infraestrutura, com recálculo em tempo real e interface visual moderna.

## Layout Principal - 3 Painéis

### Painel Esquerdo - Motor de Configurações
Accordion com 3 seções colapsáveis:
- **Taxas de Demanda**: Inputs numéricos para taxas de chamados por ativo (usuário, servidor, rede, banco de dados)
- **Custos Operacionais**: TMA (horas) e Valor/Hora para cada nível (N1, N2, N3) + custo fixo de ferramentas
- **Configurações Financeiras**: Margem de lucro desejada e impostos/taxas (sliders com %)

### Painel Central - Cliente e Operação
- **Card de Inventário**: 4 inputs numéricos com ícones (Usuários, Servidores, Ativos de Rede, Bancos de Dados)
- **Card do Funil de Atendimento**: 
  - Slider de Automação N0 com indicador visual de chamados evitados
  - 3 sliders interligados para N1/N2/N3 que somam obrigatoriamente 100%
  - Barra visual mostrando a proporção do funil

### Painel Direito - Resumo Executivo
- **3 Cards de destaque** no topo: Preço Sugerido (R$), Custo Total (R$), Total Horas/Mês
- **Gráfico de rosca**: Chamados Infra vs Usuários
- **Gráfico de barras**: Custo por nível (N1, N2, N3, Ferramentas)
- **Mini-relatório**: Chamados Gerados, Evitados (N0) e Direcionados ao atendimento humano

## Motor Matemático
Todas as fórmulas dos 5 passos implementadas com recálculo reativo em tempo real (via React state). Qualquer alteração em qualquer input reflete instantaneamente nos resultados e gráficos.

## Detalhes de UX
- Todos os inputs iniciam com valores padrão pré-preenchidos
- Validação nos sliders N1+N2+N3 para sempre somar 100%
- Animações suaves nos cards de resultado ao recalcular
- Formatação monetária brasileira (R$) em todos os valores
- Layout responsivo: em mobile, os painéis empilham verticalmente
- Gráficos com Recharts (já instalado)
- Componentes shadcn/ui (accordion, sliders, cards, inputs)

