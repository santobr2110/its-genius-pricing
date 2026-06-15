---
name: Padrão de navegação das ferramentas de Precificação
description: Toda nova ferramenta de precificação deve usar o padrão visual do Smart ITO (botões agrupados com drag handle + DropdownMenu) e botão "Precificações" com itens Salvar, Restaurar e Visualizar.
type: design
---
- Header com BUMenu à esquerda, grupos de navegação em botões com borda arredondada (GripVertical decorativo + Button ghost com ícone, label e ChevronDown) abrindo DropdownMenu com as páginas.
- Sempre incluir botão "Precificações" (FolderOpen) com submenu: Salvar, Restaurar (lista) e Visualizar (tela de precificações salvas).
- Tela de precificações salvas usa Table no padrão de `src/pages/Precificacoes.tsx`.
- Configurações financeiras (Resultado da Operação, Impostos & Markup com lista de Códigos de Produto, Comissões com tabela progressiva por faixa de rentabilidade) replicam exatamente o Smart ITO, isoladas por namespace.