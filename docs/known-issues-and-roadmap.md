# Known Issues and Roadmap - Lensys Care

Este documento centraliza pendências, próximos passos e limites de escopo do Lensys Care durante a validação com o primeiro cliente real.

## 1. Objetivo

- Centralizar pendências e próximos passos do Lensys Care durante a validação com o primeiro cliente.

## 2. Estado atual

- sistema funcional para cadastro/login.
- pacientes.
- ficha do paciente.
- exames.
- impressão de receita.
- alertas/recalls.
- conta.
- assinatura.
- exclusão segura.
- rotas principais corrigidas.
- visual principal padronizado.

## 3. Bugs/Ajustes conhecidos de baixa prioridade

- sidebar colapsada ainda precisa de mais respiro visual na aba lateral.
- monitorar possíveis textos com acentuação/mojibake.
- observar performance real em produção com mais dados.
- observar se alertas continuam claros no uso real.

## 4. Melhorias curtas pós-validação

- refinar sidebar colapsada.
- melhorar empty states onde necessário.
- melhorar mensagens de feedback.
- ajustar impressão da receita se o cliente apontar necessidade.
- revisar dashboard após dados reais.

## 5. Melhorias importantes próximas

- arquivar paciente em vez de excluir.
- melhorar filtros em pacientes/alertas se o cliente sentir falta.
- permissões básicas.
- gestão de equipe/recepcionista.
- agenda/calendário.
- relatórios simples.

## 6. Features futuras

- WhatsApp/SMS avançado.
- automações de recall.
- campanhas para horários ociosos.
- tráfego pago premium.
- relatórios de ocupação.
- plano premium com crescimento da clínica.

## 7. O que não fazer agora

- não implementar tráfego pago agora.
- não implementar billing complexo agora.
- não mexer em RLS/Auth sem necessidade.
- não criar permissões completas antes de validar fluxo real.
- não reescrever dashboard sem dados reais.
- não otimizar performance baseada apenas no localhost dev.

## 8. Critério para priorizar próximos commits

- bug que bloqueia cliente real vem primeiro.
- fluxo clínico vem antes de visual fino.
- performance em produção vem antes de performance local dev.
- feedback do cliente vem antes de ideias novas.
- segurança/ownership vem antes de conveniência.
