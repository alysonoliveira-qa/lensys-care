# Performance Audit - Lensys Care

## 1. Resumo executivo

Lensys Care ja melhorou bastante a separacao estrutural: dashboard, patients, exams, sidebar, plans e alerts passaram a ter fronteiras mais claras entre data access, mappers, UI e config. Isso reduz ruido, facilita medicao e corta parte da complexidade que antes misturava varios custos na mesma pagina.

Mesmo assim, a experiencia ainda pode parecer truncada por tres motivos distintos:

- custo real de dados e renderizacao em rotas autenticadas;
- custo de bundle e componentes client em formularios e navegação;
- custo percebido de feedback visual quando o usuario clica e a interface demora a responder ou preserva pouco estado intermediario.

Performance real e performance percebida nao sao a mesma coisa. Uma rota pode estar tecnicamente aceitavel e ainda parecer lenta se o usuario nao recebe sinal de progresso, skeleton, loading ou navegaÃ§ao fluida. O inverso tambem e possivel: uma rota pode parecer rapida, mas estar fazendo queries maiores do que o necessario.

O momento correto para otimizar e: medir -> identificar gargalo -> aplicar melhoria pequena -> validar -> commitar.

## 2. Rotas prioritarias para medir

| Rota | Criticidade | Publica ou autenticada | Depende de Supabase/Prisma | Pode ficar lenta por | Observacao |
| --- | --- | --- | --- | --- | --- |
| `/` | Alta para descoberta | Publica | Nao deve depender de dados sensiveis | Bundle, imagens, UX | Deve abrir quase instantaneamente. |
| `/login` | Critica | Publica | Supabase session/auth | UX, redirect, session/cookies | Percepcao importa muito aqui. |
| `/register` | Critica | Publica | Supabase + API de cadastro | Bundle, redirect, server roundtrip | Formulario pesado pode dar sensacao de travamento. |
| `/planos` | Alta para conversao | Publica | Nao deveria depender de consultas sensiveis | Bundle, cards, imagens, CTA | Ideal para benchmark de primeira interacao. |
| `/dashboard` | Critica | Autenticada | Sim, Supabase + Prisma | Cold start, query, render, async sections | E a rota mais importante para medir com precision. |
| `/patients` | Critica | Autenticada | Sim, Prisma | Query listagem, count, render | Lista e filtros tendem a acumular custo. |
| `/patients/[id]` | Critica | Autenticada | Sim, Supabase + Prisma | Query detalhada, historico, recalls | Pode ficar pesada por historico e exames. |
| `/patients/new` | Alta | Autenticada | Sim, pelo submit | Bundle do formulario, feedback de submit | Risco maior de percepcao do que de query. |
| `/exams/new` | Critica | Autenticada | Sim, pelo submit | Formulario complexo, estado, payload, submit | Uma das rotas mais provaveis de sensacao truncada. |
| `/exams/[id]/edit` | Critica | Autenticada | Sim | Estado de formulario, loading, payload | Parecida com `new`, mas com mais preenchimento inicial. |
| `/exams/[id]/print` | Alta | Autenticada | Sim | Render do print view, bundle, layout | Deve abrir rapido e com pouco ruido. |
| `/alerts` | Alta | Autenticada | Sim, Prisma + possivel service_role | Query listagem, acoes, refresh | Feedback de acao e atualizacao sao importantes. |
| `/dashboard/planos` | Alta | Autenticada | Sim, Supabase + server action | Refresh apos troca, revalidation, feedback | Mutacao aqui precisa parecer imediata. |

## 3. Gargalos provaveis por area

### Dashboard

- data access ainda e a primeira suspeita de custo real, porque a pagina puxa perfil, metricas e secoes secundarias;
- sections async podem parecer lentas mesmo quando estao bem separadas, se o fallback nao for claro;
- cards principais devem aparecer cedo, enquanto recall e pacientes recentes podem carregar depois;
- sidebar ainda busca profile/subscription e pode competir com a propria dashboard na primeira renderizacao;
- a combinacao de auth + Prisma + secondary queries pode gerar custo percebido de atraso se nao houver feedback visual.

### Patients

- listagem tende a sofrer com count, filtros e renders de tabela;
- se existir busca/filtro, ela pode parecer lenta mesmo com query aceitavel se nao houver debouncing ou loading local;
- ficha do paciente junta resumo, historico, recalls e exames, o que pode aumentar custo de render;
- historico de exames e recalls sao candidatos a se tornarem gargalo de payload e de UI se crescerem sem limite.

### Exams

- formulario e complexo e ainda e um dos maiores pontos de fluidez percebida;
- salvar exame envolve estado grande, validacao, normalizacao e submit;
- editar exame tende a carregar mais estado inicial e mais referencias do que criar;
- impressao pode parecer lenta se abrir com muito peso visual ou se a transicao de rota nao for clara;
- como o formulario e client-heavy, bundle e interacao sao suspeitos fortes.

### Sidebar

- mobile drawer pode parecer truncado se o overlay, o fechamento ou a troca de estado nao forem instantaneos;
- profile/subscription loading da sidebar pode competir com o dashboard por dados na entrada;
- uma sidebar que re-renderiza demais em navegaÃ§ao pode afetar a sensacao geral da aplicacao;
- no mobile, o problema pode ser menos CPU e mais percepcao de ocupacao de tela e atraso visual.

### Auth

- login e register sao altamente sensiveis a percepcao de velocidade;
- o tempo entre submit, autenticacao, redirect e render da proxima pagina precisa ser medido como uma unica jornada;
- Supabase session/cookies e redirecionamento podem ser o custo real, mas a sensacao ruim geralmente vem da falta de feedback ou do carregamento inicial do destino;
- register pode parecer mais lento por envolver cadastro, provisionamento e auto-login.

### Plans

- pagina publica deve ser rapida e quase inteira estavel;
- gestao interna de planos e um fluxo mutavel que precisa de feedback de sucesso muito rapido;
- troca de plano e refresh podem parecer truncados se o usuario nao perceber o estado intermediario e a nova assinatura ativa;
- qualquer revalidation excessiva pode acoplar percepcao de atraso ao fluxo.

### Alerts

- listagem e badges podem ser razoaveis, mas acoes de dismiss/resend podem gerar percepcao de latencia se o refresh nao for claro;
- envio/reenvio pode ser lento por causa de comunicacao externa, e isso deve ser tratado como fluxo assincroono e nao como clique travado;
- se a row inteira espera a acao, a tabela parece congelada;
- feedback local por linha e preferivel a bloqueio global quando for seguro.

## 4. Pontos de medicao recomendados

Medir sem implementar otimizacao ainda:

- `console.time` temporario em dev para rotas especificas;
- logs controlados em `data access` e server actions;
- tempo total de resposta das rotas no Network tab;
- tempo entre click e feedback visual do botao;
- tempo de login ate render do dashboard;
- tempo de salvar paciente;
- tempo de salvar exame;
- tempo de abrir ficha do paciente;
- tempo de voltar ao dashboard;
- tempo de abrir `/dashboard/planos` e confirmar o plano atual;
- tempo de abrir o drawer mobile e navegar;
- Vercel logs para diferenciar cold start de query lenta;
- Cypress timings futuramente para rotas e journeys criticas.

## 5. Performance percebida

Melhorias possiveis sem mexer em regra de negocio:

- feedback imediato ao clicar;
- skeleton por secao em vez de pagina inteira em branco;
- botao com loading claro em acoes criticas;
- optimistic navigation quando for seguro;
- nao bloquear a pagina inteira por uma secao secundaria;
- evitar a sensacao de cliquei e nada aconteceu;
- preservar layout enquanto dados carregam.

## 6. Performance tecnica

Melhorias possiveis se os numeros confirmarem o gargalo:

- reduzir `select` e `include` para o minimo necessario;
- usar `count` quando so precisa total;
- limitar listas com `take`;
- paralelizar queries independentes;
- evitar queries duplicadas entre sidebar e dashboard;
- usar cache/revalidate com cuidado;
- separar dados criticos e secundarios;
- lazy load de blocos pesados quando o custo justificar;
- revisar componentes client grandes que concentram estado e UI.

## 7. Matriz de priorizacao

| Area | Sintoma percebido | Possivel causa | Como medir | Risco de mexer | Prioridade | Tipo de melhoria recomendada |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Abre "quebrado" ou incompleto | Query de perfil + metricas + sections async | Timer de rota, Network, Vercel logs | Medio | P0 | Separar criticos de secundarios e melhorar fallback. |
| Auth | Login parece demorar demais | Redirect + session + carga do dashboard destino | Tempo do submit ate render da dashboard | Baixo | P0 | Melhorar feedback de submit e medir jornada inteira. |
| Patients | Lista/ficha parecem pesadas | Count/lista/historico/exams | Tempo de rota e render por secao | Medio | P1 | Limitar payloads e adiar secoes secundarias. |
| Exams | Formulario trava ou demora a responder | Estado complexo + bundle + submit | Click-to-feedback, submit duration | Medio | P0 | Loading claro, feedback imediato e payload menor. |
| Sidebar | Navegacao parece "puxada" | Busca de profile/subscription + re-render | Tempo de navegaÃ§ao, re-renders observados | Baixo | P1 | Reduzir fetch duplicado e melhorar responsividade local. |
| Plans | Troca de plano parece lenta | Refresh/revalidation + UI de sucesso | Tempo do click ate badge atualizado | Medio | P1 | Feedback visual forte e medicao da troca. |
| Alerts | Acao parece congelar | AÃ§ao por linha + refresh global | Tempo de click ate feedback e refresh | Medio | P1 | Loading por linha e reduzir bloqueio global. |
| Billing / Stripe | Fluxo pode ficar imprevisivel | Integracao externa e webhook | Logs, tempos de resposta, simulacao segura | Alto | P2 | Medir antes, nao otimizar no chute. |
| Mobile navigation | Drawer e navegaÃ§ao parecem truncados | Overlay, drawer e transicao | Tempo de abrir/fechar drawer e click-through | Baixo | P1 | Melhorar feedback e preservar layout. |

## 8. Quick wins seguros

- loading mais claro em botoes criticos;
- skeletons melhores para sections secundarias;
- feedback visual de navegaÃ§ao e submissao;
- medir login e dashboard antes de mexer em arquitetura;
- revisar queries duplicadas entre sidebar e dashboard se a medicao confirmar;
- manter cards principais carregando antes de secoes secundarias;
- reduzir a sensacao de bloqueio em acoes de tabela e formulario.

## 9. O que nao otimizar agora

- nao mexer em auth ou middleware sem medicao objetiva;
- nao alterar RLS;
- nao criar cache global perigoso;
- nao mexer em billing ou Stripe;
- nao fazer reescrita ampla do dashboard;
- nao trocar arquitetura de dados sem teste;
- nao otimizar baseado so em sensacao;
- nao misturar performance com refactor estrutural grande sem baseline.

## 10. Plano incremental recomendado

1. `docs(performance): add route measurement checklist`
2. `perf(dashboard): add development-only timing logs`
3. `perf(sidebar): avoid duplicate subscription/profile fetches if confirmed`
4. `perf(patients): optimize patient detail data payloads`
5. `perf(exams): improve save feedback and submission UX`
6. `perf(auth): measure login redirect latency`
7. `test(e2e): add navigation timing smoke for critical routes`

## 11. Checklist de medicao manual

- tempo de login;
- tempo para abrir dashboard;
- tempo para abrir pacientes;
- tempo para abrir ficha;
- tempo para salvar paciente;
- tempo para criar exame;
- tempo para editar exame;
- tempo para abrir impressao;
- tempo para abrir planos;
- tempo de navegacao mobile.

## 12. Conclusao

A proxima fase deve seguir uma ordem simples:

medir -> identificar gargalo -> aplicar melhoria pequena -> validar -> commitar.

O ganho mais provavel, no curto prazo, nao e uma reescrita grande. E reduzir a sensacao de travamento com feedback visual melhor, enquanto os gargalos reais vao sendo medidos por rota e por fluxo critico.

---

## 13. Medicao de 22/08/2026 — a causa e geografia

A auditoria mediu, em producao, o que ate entao era suposicao.

| Medida | Valor | Como |
| --- | --- | --- |
| Regiao da funcao Vercel | `iad1` (Virginia) | header `X-Vercel-Id: gru1::iad1::...` |
| Regiao do banco Supabase | `us-west-2` (Oregon) | IPv6 `2600:1f14::/34` casado contra `ip-ranges.amazonaws.com` |
| TTFB de `/dashboard` -> 307, sem tocar o banco | ~200 ms | curl, 3 amostras |
| Cold start em rota de API | 1,10 s (quente: 0,32 s) | curl repetido |
| Volume de dados | 1319 pacientes, 1134 exames | `list_tables` |

Com esse volume nenhuma query e lenta. O custo e a **soma dos round-trips**: cada ida ao banco
atravessa o continente (~70 ms), e o usuario no Brasil paga ~120 ms so para alcancar iad1.

Isso reordena o diagnostico das secoes anteriores: os gargalos de codigo listados ali ou ja foram
resolvidos (streaming com Suspense, indice trgm, sidebar recebendo dados por props) ou sao
pequenos perto da latencia de rede.

### Decisao: co-locar em dois tempos

1. **`pdx1` agora** (`apps/web/vercel.json`) — funcao na mesma regiao do banco. Cada query cai de
   ~70 ms para ~2 ms. O usuario no Brasil paga ~60 ms a mais para alcancar Oregon, mas paga **uma
   vez**, nao por query. Uma linha, sem downtime, reversivel.
2. **`gru1` depois** — quando o banco estiver em `sa-east-1`. Ai as duas pontas ficam no Brasil e
   o total cai para a casa dos 25 ms.

**Ordem importa:** apontar para `gru1` antes de o banco mudar de regiao **piora** tudo — gru1 ->
us-west-2 e ~180 ms por query, contra os ~70 ms de hoje.

### Ressalva sobre a medicao

O que da para medir de fora e a rota publica e o redirect do middleware. As paginas autenticadas
do dashboard — que sao as que acumulam round-trips e onde o ganho e maior — precisam de sessao
para medir. A regua de verdade e o `@vercel/speed-insights` e os logs `[perf]` com `PERF_LOGS=1`,
que continuam desligados em producao.
