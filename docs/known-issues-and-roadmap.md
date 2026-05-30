# Known Issues and Roadmap - Lensys Care

## Objetivo

Centralizar pendências conhecidas e próximos passos do Lensys Care durante a validação com o primeiro cliente real.

## Estado atual

O produto já está funcional nos fluxos principais:

- cadastro e login
- pacientes
- ficha do paciente
- exames
- impressão de receita
- alertas e recalls
- conta
- assinatura
- exclusão segura
- rotas principais corrigidas
- visual principal padronizado

## Bugs e ajustes conhecidos de baixa prioridade

- a sidebar colapsada ainda pode receber mais respiro visual na aba lateral
- monitorar possíveis textos com acentuação ou mojibake que ainda escapem em fluxos menos usados
- observar performance real em produção com mais volume de dados
- observar se alertas e recalls continuam claros no uso real

## Melhorias curtas pós-validação

- refinar a sidebar colapsada
- melhorar empty states onde necessário
- melhorar mensagens de feedback ao usuário
- ajustar impressão da receita se o cliente apontar necessidade
- revisar o dashboard após entrada de dados reais

## Melhorias importantes próximas

- arquivar paciente em vez de excluir
- melhorar filtros em pacientes e alertas se o cliente sentir falta
- permissões básicas
- gestão de equipe e recepcionista
- agenda e calendário
- relatórios simples

## Features futuras

- WhatsApp e SMS avançados
- automações de recall
- campanhas para horários ociosos
- tráfego pago premium
- relatórios de ocupação
- plano premium com foco em crescimento da clínica

## O que não fazer agora

- não implementar tráfego pago agora
- não implementar billing complexo agora
- não mexer em RLS/Auth sem necessidade real
- não criar permissões completas antes de validar o fluxo real
- não reescrever dashboard sem dados reais
- não otimizar performance baseada apenas no localhost dev

## Critério para priorizar próximos commits

- bug que bloqueia cliente real vem primeiro
- fluxo clínico vem antes de visual fino
- performance em produção vem antes de performance local dev
- feedback do cliente vem antes de ideias novas
- segurança e ownership vêm antes de conveniência
