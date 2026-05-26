# Auditoria Arquitetural - Lensys Care

**Projeto:** Lensys Care - Sistema de gestao para optometria clinica  
**Data da auditoria:** 25 de maio de 2026  
**Escopo:** Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, Supabase, Cypress, Vercel e workspace pnpm  
**Natureza da auditoria:** analise read-only do repositorio local

## 1. Resumo executivo

O Lensys Care possui um fluxo clinico funcional e uma base tecnica suficiente para demonstracao e evolucao incremental. A arquitetura, no entanto, comecou a concentrar responsabilidades em componentes grandes, duplicar regras e expor lacunas relevantes no harness de seguranca e testes.

As prioridades identificadas sao:

1. Corrigir limites de autorizacao multi-tenant em operacoes criticas antes de refactors cosmeticos.
2. Estabelecer baseline de testes para planos, autorizacao e fluxo clinico principal.
3. Centralizar configuracoes repetidas, especialmente planos, recursos premium, navegacao e opcoes de formulario.
4. Modularizar gradualmente componentes grandes, sem reescrever dominios funcionais de uma vez.

Os dois riscos tecnicos mais relevantes encontrados sao:

- Acoes de alertas usando `service_role` sem filtro visivel de `clinicId`, com risco de operacao entre clinicas caso um usuario autenticado conheca um `alertId` externo.
- Criacao de exame por Prisma sem verificacao explicita, na camada da aplicacao, de que o paciente pertence a clinica do usuario autenticado.

Durante esta auditoria nao foram feitas alteracoes em codigo, schema, migrations, RLS, dados ou configuracao. Tambem nao foram executados build ou testes, pois o escopo solicitado foi exclusivamente de analise.

## 2. Escopo funcional observado

O repositorio contem implementacoes para:

- landing publica;
- pagina publica de planos em `/planos`;
- dashboard autenticado;
- login e cadastro;
- sidebar responsiva e mobile drawer;
- pacientes;
- ficha do paciente;
- criacao, edicao e exclusao de exames;
- receita/exame imprimivel;
- referencia ao exame anterior;
- observacoes e opcoes rapidas de receita;
- gestao interna de planos em modo de validacao;
- nome de exibicao preferido editavel;
- testes Cypress de smoke/fluxo clinico.

## 3. Principais problemas encontrados

### 3.1. Alto risco: acao de alerta potencialmente cross-tenant

**Arquivo:** [`apps/web/app/api/alerts/[id]/route.ts`](../apps/web/app/api/alerts/%5Bid%5D/route.ts)

Evidencias:

- A rota cria cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY`.
- Operacoes de `dismiss` e `resend` localizam o alerta por `id`.
- Nao foi identificado filtro adicional por clinica ou verificacao explicita de ownership antes da acao.

Impacto:

- O uso de `service_role` ignora RLS.
- Se a rota apenas exigir login, um usuario autenticado pode potencialmente atuar em um alerta de outra clinica ao obter seu identificador.
- O `resend` pode resultar em envio de comunicacao para paciente fora do tenant correto.

Recomendacao futura:

- Antes de qualquer modularizacao ampla, proteger a rota com verificacao explicita de clinica/ownership e adicionar teste negativo entre clinicas.

### 3.2. Alto risco: criacao de exame sem ownership explicito na camada API

**Arquivo:** [`apps/web/app/api/exams/route.ts`](../apps/web/app/api/exams/route.ts)

Evidencias:

- A rota autentica o usuario.
- Recebe `patientId`.
- Obtem o perfil do examinador pelo usuario autenticado.
- Cria `exam` via Prisma usando o `patientId` recebido.
- Nao foi localizada validacao explicita de que o paciente pertence a clinica do examinador antes do `create`.

Observacao tecnica:

- Existem politicas RLS relacionadas a exames/pacientes nas migrations Supabase.
- Entretanto, uma conexao Prisma direta ao Postgres nao necessariamente opera sob o contexto JWT usado pelas politicas Supabase.
- Portanto, ate que o papel/conexao runtime do Prisma seja validado, a API deve ser tratada como tendo uma lacuna de autorizacao na borda da aplicacao.

Impacto:

- Possivel associacao indevida de exame a paciente de outra clinica.
- O alerta posterior ao exame tambem pode propagar o erro de tenancy.

Recomendacao futura:

- Confirmar o modelo real de RLS/role usado pelo Prisma em runtime.
- Adicionar verificacao de ownership do paciente e teste cross-clinic antes de refatorar o dominio de exames.

### 3.3. Alto risco operacional: seed destrutivo e testes mutaveis em producao

**Arquivos:**

- [`packages/db/seed.ts`](../packages/db/seed.ts)
- [`README.md`](../README.md)

Evidencias:

- O seed exclui dados de alertas, exames, pacientes, pagamentos, clientes Stripe, subscriptions, perfis e clinicas antes de recriar dados.
- O README descreve execucao do Cypress contra URL publicada, inclusive ambiente de producao.
- Os specs Cypress criam pacientes e exames e nao representam uma estrategia de isolamento/limpeza segura para dados reais.

Impacto:

- Risco elevado de contaminar ou excluir dados de demonstracao/producao.
- Resultados de testes nao deterministas em ambiente compartilhado.

Recomendacao futura:

- Proibir formalmente E2E mutavel e seed em producao.
- Criar ambiente/branch de teste isolado e fixtures previsiveis.

### 3.4. Medio/alto risco: coexistencia de checkout real e ativacao gratuita

**Arquivos:**

- [`apps/web/app/api/stripe/checkout/route.ts`](../apps/web/app/api/stripe/checkout/route.ts)
- [`apps/web/app/dashboard/planos/actions.ts`](../apps/web/app/dashboard/planos/actions.ts)

Evidencias:

- Ha rota capaz de criar checkout de assinatura Stripe.
- A pagina interna de planos ativa plano diretamente no Supabase sem cobranca, conforme o modo atual de validacao.

Impacto:

- Existem duas estrategias de ativacao no mesmo produto.
- Uma ligacao UI futura ou regressao pode abrir cobranca real durante a fase de validacao.

Recomendacao futura:

- Documentar e proteger a politica de billing em validacao.
- Manter checkout inacessivel ao fluxo atual ate decisao explicita de produto.

### 3.5. Medio risco: fonte de verdade duplicada para planos e recursos

**Arquivos:**

- [`apps/web/app/planos/page.tsx`](../apps/web/app/planos/page.tsx)
- [`apps/web/app/dashboard/planos/PlanActivationCards.tsx`](../apps/web/app/dashboard/planos/PlanActivationCards.tsx)
- [`apps/web/lib/stripe/products.ts`](../apps/web/lib/stripe/products.ts)
- [`apps/web/lib/features.ts`](../apps/web/lib/features.ts)

Evidencias:

- Nomes, precos e listas de features dos planos aparecem em mais de um arquivo.
- A configuracao Stripe ainda contem metadados divergentes do texto atual das paginas de planos, incluindo representacao de preco gratuito.
- A liberacao de features Conecta esta em outra camada.

Impacto:

- Facilidade de divergencia entre marketing, dashboard, permissao de recurso e billing.
- Mudanca de preco/copy exige revisao manual espalhada.

Recomendacao futura:

- Centralizar exibicao e entitlement em configuracoes claramente separadas, sem alterar comportamento.

### 3.6. Medio risco: cache de features com ciclo de vida ambiguo

**Arquivo:** [`apps/web/lib/features.ts`](../apps/web/lib/features.ts)

Evidencias:

- Existe `Map` em escopo de modulo descrito como cache por request.
- Nao foi identificado reset automatico por request.

Impacto:

- Em processo Node reutilizado, uma troca de plano pode nao refletir imediatamente em acesso premium.
- Pode causar estado de entitlement desatualizado no dashboard ou em gates.

Recomendacao futura:

- Definir explicitamente escopo e invalidacao; cobrir ativacao/troca de plano com teste.

### 3.7. Medio risco: rotas e layouts duplicados com divergencia

**Arquivos:**

- [`apps/web/app/login/page.tsx`](../apps/web/app/login/page.tsx)
- [`apps/web/app/auth/login/page.tsx`](../apps/web/app/auth/login/page.tsx)
- [`apps/web/app/register/page.tsx`](../apps/web/app/register/page.tsx)
- [`apps/web/app/auth/register/page.tsx`](../apps/web/app/auth/register/page.tsx)
- [`apps/web/app/dashboard/layout.tsx`](../apps/web/app/dashboard/layout.tsx)
- [`apps/web/app/(dashboard)/layout.tsx`](../apps/web/app/%28dashboard%29/layout.tsx)

Evidencias:

- Ha duas paginas de login e duas de cadastro com comportamento semelhante e pequenas diferencas de UI/data-cy.
- Ha dois layouts de dashboard que compoem elementos semelhantes, com espacamentos diferentes.

Impacto:

- Correcao feita em uma rota pode nao atingir a equivalente.
- Testes cobrem uma variante e deixam outra sem garantia.

Recomendacao futura:

- Consolidar somente depois de inventariar URLs usadas, links existentes e cobertura Cypress.

### 3.8. Medio risco: teste Cypress deixa de verificar campo por seletor divergente

**Arquivos:**

- [`apps/web/components/exams/ExamForm.tsx`](../apps/web/components/exams/ExamForm.tsx)
- [`cypress/e2e/clinical/create-edit-print-exam.cy.ts`](../cypress/e2e/clinical/create-edit-print-exam.cy.ts)

Evidencias:

- O formulario utiliza convencao de seletor para acuidade visual de OE.
- O teste procura seletor `exam-os-visual-acuity-input`.
- O teste condiciona preenchimentos a existencia do elemento, de modo que uma divergencia de seletor pode pular a verificacao silenciosamente.

Impacto:

- Falsa confianca na cobertura de criacao/edicao do exame.
- Regressao no campo pode passar sem falhar no E2E.

Recomendacao futura:

- Corrigir a assercao e substituir skips condicionais por verificacoes explicitas onde o elemento for requisito do fluxo.

## 4. Arquivos mais criticos

### 4.1. Maiores arquivos de codigo

| Linhas | Arquivo | Dominio | Sinal arquitetural |
| ---: | --- | --- | --- |
| 595 | `apps/web/components/layout/Sidebar.tsx` | Navegacao/perfil/plano/auth | Concentracao excessiva de estado, queries e UI responsiva |
| 581 | `apps/web/components/exams/ExamForm.tsx` | Exames | Formulario, regras, transformacao, API e navegacao no mesmo componente |
| 367 | `apps/web/components/dashboard/DashboardAsyncSections.tsx` | Dashboard | Multiplas secoes e queries no mesmo modulo |
| 339 | `apps/web/app/dashboard/page.tsx` | Dashboard | Fetch, metricas, status de plano e apresentacao |
| 278 | `apps/web/app/api/webhooks/stripe/route.ts` | Billing | Integracao sensivel; alto custo de mudanca |
| 277 | `apps/web/components/patients/PatientForm.tsx` | Pacientes | Estado, validacao, chamada API e redirect |
| 273 | `apps/web/app/register/page.tsx` | Auth | Duplicado de rota equivalente |
| 259 | `apps/web/app/auth/register/page.tsx` | Auth | Duplicado de rota equivalente |
| 258 | `apps/web/app/(dashboard)/patients/[id]/page.tsx` | Pacientes | View detalhada crescente |
| 258 | `apps/web/app/(dashboard)/patients/page.tsx` | Pacientes | Listagem e operacoes |
| 247 | `apps/web/lib/alerts.ts` | Alertas | Logica transversal sensivel |
| 235 | `packages/db/prisma/schema.prisma` | Dados | Modelo central; alteracoes de alto risco |
| 224 | `apps/web/app/api/auth/register/route.ts` | Auth/provisionamento | Fluxo sensivel |
| 199 | `apps/web/components/alerts/AlertActionsList.tsx` | Alertas | UI ligada a acoes criticas |
| 198 | `apps/web/app/login/page.tsx` | Auth | Duplicado de rota equivalente |
| 192 | `cypress/e2e/clinical/create-edit-print-exam.cy.ts` | Harness | E2E principal com verificacoes frageis |
| 188 | `apps/web/app/exams/[id]/print/page.tsx` | Impressao | Saida clinica importante |
| 185 | `apps/web/app/auth/login/page.tsx` | Auth | Duplicado de rota equivalente |
| 184 | `packages/db/seed.ts` | Dados/testes | Seed destrutivo |
| 179 | `apps/web/app/api/patients/route.ts` | Pacientes | Borda de acesso a dados |
| 177 | `apps/web/components/exams/PatientExamHistory.tsx` | Exames | Historico/referencia anterior |
| 152 | `apps/web/app/planos/page.tsx` | Planos publico | Marketing/preco |
| 150 | `apps/web/app/dashboard/planos/PlanActivationCards.tsx` | Planos interno | Gestao/ativacao |
| 143 | `apps/web/lib/features.ts` | Feature gates | Entitlements e cache |

### 4.2. Arquivos prioritarios para rastreabilidade

| Prioridade | Arquivo | Motivo |
| --- | --- | --- |
| Critica | `apps/web/app/api/alerts/[id]/route.ts` | Bypass de RLS por `service_role` exige ownership explicito |
| Critica | `apps/web/app/api/exams/route.ts` | Criacao clinica precisa garantir isolamento por tenant |
| Critica | `packages/db/seed.ts` | Potencial destrutivo em ambiente errado |
| Alta | `apps/web/components/layout/Sidebar.tsx` | Navegacao, plano, perfil e auth misturados |
| Alta | `apps/web/components/exams/ExamForm.tsx` | Principal agregador de regras clinicas e UI |
| Alta | `apps/web/lib/features.ts` | Fonte de gate premium e cache |
| Alta | `apps/web/app/api/stripe/checkout/route.ts` | Billing real coexistindo com modo validacao |

## 5. Componentes com responsabilidade misturada

### 5.1. `Sidebar`

**Arquivo:** [`apps/web/components/layout/Sidebar.tsx`](../apps/web/components/layout/Sidebar.tsx)

Responsabilidades atualmente agrupadas:

- navegacao desktop/mobile;
- drawer e estado collapsed;
- persistencia local de estado visual;
- consulta do usuario autenticado;
- consulta de perfil/clinica/subscription;
- exibicao do plano atual;
- logout;
- modal e atualizacao de nome preferido;
- renderizacao de menu;
- vinculacao de `data-cy`.

Candidatos de extracao futura:

- `NAV_ITEMS` em configuracao compartilhada;
- `SidebarNavigation`;
- `SidebarPlanStatus`;
- `SidebarProfileMenu`;
- `PreferredDisplayNameDialog`;
- hook/controlador de drawer/collapse.

### 5.2. `ExamForm`

**Arquivo:** [`apps/web/components/exams/ExamForm.tsx`](../apps/web/components/exams/ExamForm.tsx)

Responsabilidades atualmente agrupadas:

- definicao de opcoes de acuidade visual;
- definicao de observacoes e templates de receita;
- campos visuais internos;
- estado completo de formulario;
- logica de adicao sugerida;
- importacao de exame anterior;
- montagem de payload;
- transformacao numerica;
- validacao;
- POST/PATCH;
- mensagens;
- navegacao apos salvar.

Candidatos de extracao futura:

- `VISUAL_ACUITY_OPTIONS`;
- `PRESCRIPTION_NOTE_OPTIONS`;
- `QUICK_PRESCRIPTION_OPTIONS`;
- `ExamRefractionFields`;
- `ExamPrescriptionNotes`;
- `PreviousExamReferencePanel`;
- mapper/validator puro de payload;
- camada de submissao independente da UI.

### 5.3. `PatientForm`

**Arquivo:** [`apps/web/components/patients/PatientForm.tsx`](../apps/web/components/patients/PatientForm.tsx)

Responsabilidades atualmente agrupadas:

- estado do formulario;
- regra de data/idade;
- mensagem de erro;
- criacao/edicao via API;
- redirecionamento;
- UI.

Candidatos de extracao futura:

- mapper de payload;
- validacao pura;
- `PatientDemographicsFields`;
- controlador de submissao reutilizavel.

### 5.4. Dashboard

**Arquivos:**

- [`apps/web/app/dashboard/page.tsx`](../apps/web/app/dashboard/page.tsx)
- [`apps/web/components/dashboard/DashboardAsyncSections.tsx`](../apps/web/components/dashboard/DashboardAsyncSections.tsx)

Responsabilidades agrupadas:

- auth e contexto de clinica;
- metricas e consultas;
- configuracao de cards;
- status do plano;
- copy de upgrade;
- secoes assincronas de indicadores e pacientes.

Candidatos de extracao futura:

- `DASHBOARD_CARD_CONFIG`;
- `DashboardPlanStatusCard`;
- secoes por painel/consulta;
- servico de metricas de dashboard.

## 6. Regras de negocio espalhadas

| Regra | Locais identificados | Risco atual |
| --- | --- | --- |
| Planos Essencial/Conecta | `/planos`, `/dashboard/planos`, `lib/stripe/products.ts`, `lib/features.ts`, schema/seed | Copy, preco e entitlement divergirem |
| Validacao gratuita | paginas/acao interna de planos e coexistencia do checkout | Cobranca acidental ou comunicacao inconsistente |
| Features premium do Conecta | `lib/features.ts`, consumo em UI/sidebar/dashboard | Gate desatualizado por cache/config duplicada |
| Status de subscription | schema, acao de planos, features, sidebar/dashboard | Interpretacoes diferentes de plano ativo |
| Observacoes padrao de receita | `ExamForm.tsx` | Dificil manutencao e testes |
| Opcoes rapidas de receita | `ExamForm.tsx` | Dificil reuso/evolucao |
| Opcoes de acuidade visual | `ExamForm.tsx` | Regras de UI embutidas no componente |
| Referencia do exame anterior | `ExamForm.tsx`, historico de exames | Acoplamento UI/regra |
| Calculo de adicao/idade | `lib/refraction.ts` e seed | Seed pode divergir da regra de produto |
| Papel/cargo do usuario | schema, policies, rotas/perfil | Autorizacao dificil de auditar globalmente |
| `clinicId`/ownership | RLS, APIs, Prisma, Supabase clients | Principal fronteira de isolamento multi-tenant |
| Alertas/recall | `lib/alerts.ts`, APIs, migrations/cron | Status e disparo distribuidos |

## 7. Hardcoded e candidatos data-driven

Ja existe um bom ponto de centralizacao em [`apps/web/lib/refraction.ts`](../apps/web/lib/refraction.ts), onde tabelas e funcoes puras suportam testes unitarios em [`apps/web/__tests__/refraction.test.ts`](../apps/web/__tests__/refraction.test.ts). O mesmo modelo pode ser adotado progressivamente em outros dominios.

| Configuracao proposta | Conteudo a centralizar | Origem atual |
| --- | --- | --- |
| `PLAN_PRICING_CONFIG` | nome exibido, preco mensal, badge/copy de preco | paginas publica/interna e Stripe metadata |
| `PLAN_CONFIG` | identificador de plano, descricao e lista de beneficios exibidos | cards de plano duplicados |
| `FEATURE_CONFIG` | features liberadas por plano e labels de UI | `lib/features.ts` e consumidores |
| `VALIDATION_PHASE_COPY` | aviso de ativacao gratuita/sem cobranca | planos publico/interno |
| `NAV_ITEMS` | itens da sidebar, rotas e gates | `Sidebar.tsx` |
| `VISUAL_ACUITY_OPTIONS` | opcoes de acuidade visual | `ExamForm.tsx` |
| `PRESCRIPTION_NOTE_OPTIONS` | observacoes/templates padrao | `ExamForm.tsx` |
| `QUICK_PRESCRIPTION_OPTIONS` | marcacoes rapidas de receita | `ExamForm.tsx` |
| `DASHBOARD_CARD_CONFIG` | labels, icones e estilos de metricas | dashboard |
| `ALERT_STATUS_CONFIG` | labels/badges/acoes por status | alertas |
| `ROLE_LABEL_CONFIG` | exibicao de cargos/papeis | auth/perfil/policies relacionadas |
| `RECALL_RULE_CONFIG` | prazos e tipos de alerta | alertas/seed |
| `DATA_CY_CATALOG` | seletores criticos documentados | componentes e specs Cypress |

Principio recomendado:

- Centralizar configuracao de exibicao nao deve automaticamente centralizar regras de autorizacao.
- Preco mostrado, entitlement de feature e integracao de cobranca devem ser coerentes, mas permanecer com fronteiras explicitas e testaveis.

## 8. Duplicacoes relevantes

### 8.1. Autenticacao

| Duplicacao | Risco |
| --- | --- |
| `/login` e `/auth/login` | UI e `data-cy` divergirem; correcoes parciais |
| `/register` e `/auth/register` | Fluxo de cadastro e coverage divergirem |

### 8.2. Layout autenticado

| Duplicacao | Risco |
| --- | --- |
| `app/dashboard/layout.tsx` e `app/(dashboard)/layout.tsx` | Estrutura e espacamento diferentes para experiencias internas |

### 8.3. Planos

| Duplicacao | Risco |
| --- | --- |
| Cards em `/planos` e `/dashboard/planos` | Precos/features/copy divergirem |
| Configuracao visual e metadata Stripe | Fluxo de validacao conflitar com billing |

### 8.4. Formularios e operacoes de dominio

| Area | Observacao |
| --- | --- |
| Exames | Criacao, edicao, transformacao e referencias estao concentradas em formulario/API; exigem cobertura antes de separar |
| Pacientes | Formularios e APIs devem ser mapeados quanto a create/update e ownership |
| Sidebar | Estados desktop/mobile/collapsed/perfil/plano pertencem a subcomponentes distintos |

## 9. Organizacao futura por dominio

Uma organizacao gradual por feature faz sentido, desde que seja aplicada por extracao incremental e nao por movimentacao ampla inicial:

```text
apps/web/
  features/
    exams/
    patients/
    plans/
    dashboard/
    profile/
    navigation/
  shared/
    ui/
    lib/
    config/
```

Diretrizes:

- `features/exams`: componentes, configuracoes e regras do formulario/exames, mantendo acesso sensivel coberto por testes.
- `features/patients`: formularios, views e validacoes de paciente.
- `features/plans`: cards, config visual, mensagens de validacao e gates relacionados.
- `features/dashboard`: cards/paineis de indicadores.
- `features/profile`: edicao do nome preferido e apresentacao de perfil.
- `features/navigation`: menu, sidebar, mobile drawer e configuracao de navegacao.
- `shared/ui`: componentes sem regra de dominio.
- `shared/lib`: funcoes puras transversais.
- `shared/config`: configuracao exibivel e estavel compartilhada.

Nao recomendado como primeiro passo:

- mover arquivos em massa sem melhorar coverage;
- misturar reorganizacao de pastas com mudancas de auth, RLS, schema ou subscription;
- transformar regras de autorizacao em simples configuracoes de UI.

## 10. Estado atual do harness

### 10.1. Elementos existentes

| Area | Estado observado |
| --- | --- |
| Cypress | Specs para landing, login/logout, criacao de paciente e fluxo criar/editar/imprimir exame |
| `data-cy` | Presente em rotas importantes; cobertura inconsistente entre paginas duplicadas e specs |
| Teste unitario | `refraction.test.ts` cobre logica pura de refracao/adicao |
| Build/lint/test scripts | Workspace possui scripts Turbo e build do app web |
| README | Documento raiz contem setup e instrucoes; README do app web permanece generico |
| Migrations | Estrutura versionada de schema/RLS/ajustes |
| Seed | Existe, mas e destrutivo e requer ambiente controlado |
| CI/CD | Nao foi localizado workflow CI versionado no repositorio auditado |

### 10.2. Fluxos Cypress demonstrados

- navegacao inicial da landing;
- login e logout;
- criacao de paciente;
- criacao, edicao e abertura de impressao de exame.

### 10.3. Lacunas de coverage

- CTA publico de `/planos` sempre indo para `/register`;
- acesso e troca de plano em `/dashboard/planos`;
- persistencia de plano apos reload e novo login;
- feature gates associados ao Conecta;
- cadastro/provisionamento completo;
- edicao de nome de exibicao preferido;
- drawer mobile e estado collapsed da sidebar;
- edicao de paciente;
- exclusao de exame;
- referencia ao exame anterior;
- observacoes/opcoes rapidas da receita com asserts obrigatorios;
- dismiss/resend de alertas;
- autorizacao negativa entre clinicas;
- garantia de que billing/checkout nao e acessado no modo validacao.

### 10.4. Fragilidades de seletores e helpers

- Existe helper `cy.getByCy()`, mas os specs ainda usam seletores CSS brutos em diversos pontos.
- Ha teste com seletor divergente para acuidade visual e logica condicional que pode pular assercoes.
- Os `data-cy` criticos devem ter catalogo minimo e convencao consistente por dominio.

### 10.5. Risco de ambiente de teste

Testes que criam, editam ou excluem dados nao devem rodar contra producao. A combinacao de Cypress mutavel e seed destrutivo exige:

- ambiente de teste isolado;
- dados de fixture/seed dedicados;
- documentacao clara de comandos seguros;
- bloqueio operacional para URL de producao em suites mutaveis.

## 11. Persistencia, Supabase e limite da auditoria

### 11.1. Estrutura local observada

**Arquivos:**

- [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)
- [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql)
- [`supabase/migrations/002_rls_policies.sql`](../supabase/migrations/002_rls_policies.sql)
- [`supabase/migrations/003_pgcron_alerts.sql`](../supabase/migrations/003_pgcron_alerts.sql)
- [`supabase/migrations/004_harden_schema_and_defer_pg_net.sql`](../supabase/migrations/004_harden_schema_and_defer_pg_net.sql)
- [`supabase/migrations/005_add_preferred_name_to_profiles.sql`](../supabase/migrations/005_add_preferred_name_to_profiles.sql)

Observacoes:

- O schema Prisma contem entidades e enums relacionados a perfis, clinicas, planos e subscriptions.
- As migrations Supabase incluem politicas RLS para isolamento por clinica.
- A subscription e a base ja usada para persistir o plano interno em modo de validacao.
- `preferred_name` ja esta contemplado no schema/migration local observado.

### 11.2. Limitacao de validacao remota

Na sessao de auditoria, a configuracao local do aplicativo indicava o projeto Supabase `offdfwseqiinxcgzmwnv`, mas as ferramentas MCP carregadas na sessao respondiam para outro projeto. Portanto:

- as conclusoes sobre Supabase/RLS foram baseadas em codigo e migrations locais;
- nao foi feita auditoria de dados remotos nem aplicacao de comandos SQL;
- antes de uma intervencao futura no banco, deve-se reiniciar/recarregar a sessao MCP e confirmar o projeto correto.

## 12. Classificacao de riscos de refactor

### 12.1. Baixo risco

| Refactor | Pre-condicao |
| --- | --- |
| Extrair constantes visuais e opcoes hardcoded | Preservar valores e `data-cy` |
| Extrair componentes puramente apresentacionais | Nao mover consultas/side effects inicialmente |
| Documentar arquitetura, rotas e ownership | Nenhuma mudanca comportamental |
| Padronizar uso de helper Cypress para seletores existentes | Garantir que specs realmente falhem quando requerido |
| Catalogar configuracoes repetidas | Nao unificar ainda autorizacao/billing |

### 12.2. Medio risco

| Refactor | Motivo |
| --- | --- |
| Separar controladores de formulario de UI | Pode alterar payload, validacao e mensagens |
| Separar server actions/route handlers | Pode modificar cache, auth e erro percebido |
| Consolidar rotas duplicadas de login/cadastro | Impacta links, redirect e cobertura existente |
| Consolidar layouts autenticados | Pode alterar estrutura visual e rotas agrupadas |
| Melhorar helpers/fixtures Cypress | Pode expor falhas antes mascaradas |
| Ajustar lifecycle de cache de feature gates | Pode afetar performance e entitlement |

### 12.3. Alto risco

| Refactor | Motivo |
| --- | --- |
| Alterar schema ou migrations | Impacta dados e deploy |
| Modificar RLS/policies | Impacta isolamento multi-tenant |
| Mexer em auth/middleware | Impacta todas as rotas privadas |
| Alterar subscription/billing/Stripe | Risco financeiro e de acesso |
| Reescrever fluxo de exames/pacientes sem coverage | Dados clinicos e ownership sensiveis |
| Usar seed/teste mutavel em producao | Risco de perda/corrupcao de dados |

## 13. Quick wins seguros

Os seguintes passos podem ser executados em commits pequenos, apos definir o baseline de testes apropriado:

1. Documentar fronteiras de auth, tenant e dados para APIs sensiveis.
2. Corrigir o seletor Cypress da acuidade visual e tornar obrigatorias as verificacoes do fluxo principal.
3. Registrar politica de nao executar E2E mutavel/seed contra producao.
4. Cobrir o CTA publico de planos e a gestao interna de planos com testes dedicados.
5. Extrair opcoes puramente estaticas de exames, sem alterar o comportamento do formulario.
6. Extrair configuracao visual de planos, separando-a explicitamente da autorizacao e do billing.
7. Extrair configuracao do menu/sidebar sem alterar seus efeitos ou queries.

Nota de prioridade:

- Embora alguns itens sejam de baixo risco, as lacunas de autorizacao em alertas e criacao de exames devem ser tratadas como prioridade de seguranca antes de ampliar funcionalidades.

## 14. Refactors que devem esperar

Nao e recomendado iniciar imediatamente:

- consolidacao ampla das rotas de auth;
- reorganizacao completa de pastas por dominio;
- reescrita do `ExamForm` ou `PatientForm`;
- alteracoes em schema, RLS ou middleware;
- qualquer mudanca em Stripe/billing;
- reimplementacao de subscription;
- grandes alteracoes na navegacao autenticada.

Esses trabalhos devem aguardar:

- teste de isolamento entre clinicas;
- coverage minima de planos e fluxo clinico;
- confirmacao do modelo runtime Prisma/Supabase;
- documentacao de ambientes seguros para E2E/seed.

## 15. Plano incremental de commits pequenos

### Fase 0 - Seguranca e baseline antes do refactor

Objetivo: saber o que existe, impedir regressoes graves e fechar lacunas criticas.

Commits sugeridos:

1. `docs(architecture): record current data-access and auth boundaries`
2. `docs(testing): prohibit mutable e2e flows against production`
3. `test(e2e): fix visual acuity selector assertions`
4. `test(e2e): add plans and profile navigation baseline coverage`
5. `fix(security): scope alert actions to authenticated clinic`
6. `fix(security): enforce patient ownership when creating exams`

### Fase 1 - Convencoes arquiteturais

Objetivo: definir organizacao futura sem movimentacao arriscada.

Commits sugeridos:

1. `docs(architecture): define feature module boundaries`
2. `docs(testing): define selector and fixture conventions`
3. `docs(plans): document validation-mode billing policy`

### Fase 2 - Extracao data-driven

Objetivo: remover duplicacao estatica preservando comportamento.

Commits sugeridos:

1. `refactor(exams): centralize visual acuity and prescription options`
2. `refactor(plans): centralize display pricing and plan labels`
3. `refactor(navigation): centralize sidebar item configuration`
4. `refactor(dashboard): centralize summary card display config`
5. `refactor(alerts): centralize status display configuration`

### Fase 3 - Modularizacao leve de componentes grandes

Objetivo: diminuir arquivos de UI sem mover regras criticas cedo demais.

Alvos:

- subcomponentes visuais da sidebar;
- campos/secoes visuais do formulario de exames;
- cards e secoes do dashboard;
- paineis visuais da ficha/formulario de paciente.

### Fase 4 - Refactor do dominio Exams

Objetivo: separar regra, transformacao e persistencia somente apos cobertura adequada.

Pre-condicoes:

- teste cross-clinic da criacao de exame;
- testes confiaveis do formulario e impressao;
- decisao clara sobre Prisma versus Supabase/RLS na camada de acesso.

### Fase 5 - Refactor de Patients, Plans e Dashboard

Objetivo: aplicar o padrao validado em Exams aos demais dominios.

Alvos:

- formularios e APIs de pacientes;
- plano/status/gates;
- layout e metricas do dashboard;
- eventual convergencia de rotas auth/layouts duplicados.

### Fase 6 - Expansao do harness Cypress

Objetivo: sustentar evolucao continua com fixtures e cobertura de negocio.

Alvos:

- testes de planos publico e interno;
- testes de autorizacao multi-tenant;
- testes de alerts;
- testes de perfil/sidebar responsiva;
- fixtures/seed de ambiente isolado;
- integracao CI para build, testes unitarios e E2E apropriado.

## 16. Primeira tarefa recomendada apos a auditoria

A primeira tarefa nao deve ser uma extracao visual. Deve ser criar o baseline de seguranca e harness das operacoes multi-tenant criticas:

1. Documentar o modelo real de acesso a dados das APIs que usam Prisma e das que usam Supabase.
2. Adicionar testes negativos que provem que uma clinica nao pode atuar sobre alerta ou paciente/exame de outra clinica.
3. Corrigir o endpoint de acoes de alertas para exigir ownership da clinica antes de usar operacao privilegiada.
4. Corrigir a criacao de exames para validar ownership do paciente na borda da aplicacao.
5. Somente depois iniciar extracoes data-driven de baixo risco.

Motivo:

- Extrair constantes reduz complexidade local, mas nao reduz o risco central atual: alteracao ou comunicacao sobre dados clinicos de outro tenant.

## 17. Referencias de arquivos inspecionados

### Produto e planos

- [`apps/web/app/planos/page.tsx`](../apps/web/app/planos/page.tsx)
- [`apps/web/app/dashboard/planos/PlanActivationCards.tsx`](../apps/web/app/dashboard/planos/PlanActivationCards.tsx)
- [`apps/web/app/dashboard/planos/actions.ts`](../apps/web/app/dashboard/planos/actions.ts)
- [`apps/web/lib/features.ts`](../apps/web/lib/features.ts)
- [`apps/web/lib/stripe/products.ts`](../apps/web/lib/stripe/products.ts)
- [`apps/web/app/api/stripe/checkout/route.ts`](../apps/web/app/api/stripe/checkout/route.ts)

### Navegacao, auth e dashboard

- [`apps/web/components/layout/Sidebar.tsx`](../apps/web/components/layout/Sidebar.tsx)
- [`apps/web/components/layout/TopBar.tsx`](../apps/web/components/layout/TopBar.tsx)
- [`apps/web/app/dashboard/page.tsx`](../apps/web/app/dashboard/page.tsx)
- [`apps/web/components/dashboard/DashboardAsyncSections.tsx`](../apps/web/components/dashboard/DashboardAsyncSections.tsx)
- [`apps/web/app/login/page.tsx`](../apps/web/app/login/page.tsx)
- [`apps/web/app/auth/login/page.tsx`](../apps/web/app/auth/login/page.tsx)
- [`apps/web/app/register/page.tsx`](../apps/web/app/register/page.tsx)
- [`apps/web/app/auth/register/page.tsx`](../apps/web/app/auth/register/page.tsx)
- [`apps/web/app/dashboard/layout.tsx`](../apps/web/app/dashboard/layout.tsx)
- [`apps/web/app/(dashboard)/layout.tsx`](../apps/web/app/%28dashboard%29/layout.tsx)

### Dominios clinicos e alertas

- [`apps/web/components/exams/ExamForm.tsx`](../apps/web/components/exams/ExamForm.tsx)
- [`apps/web/components/exams/PatientExamHistory.tsx`](../apps/web/components/exams/PatientExamHistory.tsx)
- [`apps/web/components/patients/PatientForm.tsx`](../apps/web/components/patients/PatientForm.tsx)
- [`apps/web/app/api/exams/route.ts`](../apps/web/app/api/exams/route.ts)
- [`apps/web/app/api/exams/[id]/route.ts`](../apps/web/app/api/exams/%5Bid%5D/route.ts)
- [`apps/web/app/api/patients/route.ts`](../apps/web/app/api/patients/route.ts)
- [`apps/web/app/api/alerts/[id]/route.ts`](../apps/web/app/api/alerts/%5Bid%5D/route.ts)
- [`apps/web/lib/alerts.ts`](../apps/web/lib/alerts.ts)
- [`apps/web/lib/refraction.ts`](../apps/web/lib/refraction.ts)

### Persistencia e harness

- [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)
- [`packages/db/seed.ts`](../packages/db/seed.ts)
- [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql)
- [`supabase/migrations/002_rls_policies.sql`](../supabase/migrations/002_rls_policies.sql)
- [`supabase/migrations/003_pgcron_alerts.sql`](../supabase/migrations/003_pgcron_alerts.sql)
- [`supabase/migrations/004_harden_schema_and_defer_pg_net.sql`](../supabase/migrations/004_harden_schema_and_defer_pg_net.sql)
- [`supabase/migrations/005_add_preferred_name_to_profiles.sql`](../supabase/migrations/005_add_preferred_name_to_profiles.sql)
- [`cypress/e2e/clinical/create-edit-print-exam.cy.ts`](../cypress/e2e/clinical/create-edit-print-exam.cy.ts)
- [`apps/web/__tests__/refraction.test.ts`](../apps/web/__tests__/refraction.test.ts)
- [`README.md`](../README.md)

