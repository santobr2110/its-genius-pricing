# Replicar itens adicionais para o Perfil padrão de ITO e para as precificações salvas

## O que a verificação mostrou

- O perfil "Selbetti Padrão · Smart ITO - Calibrado" (atualizado hoje 16:46) já contém **24 itens adicionais** e **já é o perfil padrão da oferta Smart ITO**. A parte "replicar para o Perfil padrão" já está satisfeita no banco.
- O registro global de defaults (`app_defaults`) ainda guarda a **lista antiga de 9 itens**, de 24/06 — cópia desatualizada.
- Nenhuma precificação salva guarda a chave de itens adicionais no snapshot. Como a lógica de abertura preenche chaves ausentes com o perfil padrão, elas **já herdam** a lista nova ao serem abertas.
- Os estados pessoais dos usuários ainda têm a lista antiga: Valquíria, Paulo, Cassiana e Jhones com 9 itens; Thiago com 24; o seu com 18 (mais recente que o salvamento do perfil).

## O que será feito

1. Atualizar a lista de itens adicionais em `app_defaults` para a lista de 24 itens do perfil padrão, registrando o perfil de origem (fica no histórico de defaults, revertível).
2. Sincronizar o estado pessoal de todos os usuários para a mesma lista de 24 itens, de modo que qualquer pessoa que abrir a tela de Escopo ou uma proposição salva veja exatamente os itens cadastrados.
3. Confirmar, abrindo uma precificação salva existente, que os 24 itens aparecem no Relatório de Proposição.

## Detalhe técnico

- Atualização de dados: `app_defaults` na chave `ito.smart-ito.escopo:itensAdicionais` recebe o array vindo do payload do perfil `d488a7fe-8ec4-4064-8214-802084cc3ebc`; o gatilho existente grava uma nova versão em `app_defaults_history`.
- `user_app_state` recebe upsert da mesma lista para todos os usuários que possuem a chave.
- Nenhuma alteração de código é necessária: `mergePresetParamsForPricing` já preenche chaves ausentes no snapshot a partir do perfil padrão, e precificações que **tiverem** itens próprios salvos continuam prevalecendo sobre o padrão.

## Ponto a confirmar

Seu estado pessoal atual (18 itens) é mais recente que o perfil salvo (24 itens). O plano sobrescreve esse estado com os 24 do perfil. Se os 18 forem edições posteriores que você quer preservar, avise antes de aprovar.