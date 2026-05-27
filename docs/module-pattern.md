# Module Pattern - Lensys Care

Este documento define o padrao de organizacao de modulos e features para o Lensys Care.

O objetivo e manter o codigo rastreavel, inteligivel e seguro enquanto a aplicacao evolui por refactors incrementais, Harness Engineering e Data-Driven Development.

## 1. Objetivo do padrao

O padrao existe para:

- evitar paginas gigantes e dificilmente testaveis;
- separar UI, acesso a dados, mappers, configs e regras puras;
- facilitar testes unitarios e Cypress;
- facilitar uso do Codex sem introduzir regressao estrutural;
- manter isolamento multi-tenant explicitamente verificavel.

## 2. Principios

- Paginas devem compor, nao concentrar toda a logica.
- Componentes visuais devem receber dados por props sempre que possivel.
- Data access deve ficar isolado em arquivos proprios.
- Mappers devem transformar dados para UI e payloads de forma previsivel.
- Normalizers devem ser funcoes puras, sem side effects.
- Configs data-driven devem centralizar opcoes, labels, copys e estados derivados.
- APIs e server actions devem validar ownership explicitamente.
- Nao confiar apenas em UI para regra de negocio.
- Nao misturar billing, feature gate e UI copy sem fronteira clara.

## 3. Estrutura recomendada por dominio

Uma organizacao pratica por dominio e:

```text
apps/web/lib/{domain}/
  {domain}-data.ts
  {domain}-mappers.ts
  {domain}-normalizers.ts
  {domain}-config.ts

apps/web/components/{domain}/
  Componentes visuais pequenos
  Sections
  Cards
  Forms compostos
```

### Responsabilidade dos arquivos

- `{domain}-data.ts`: chamadas de leitura e escrita, queries, fetchers e acesso a fonte de dados.
- `{domain}-mappers.ts`: transformacao entre dados persistidos, DTOs e props de UI.
- `{domain}-normalizers.ts`: limpeza, padronizacao e derivacoes puras.
- `{domain}-config.ts`: labels, opcoes, listas, badges, cards e outras regras data-driven.

## 4. Padrao para paginas App Router

`page.tsx` deve:

- resolver auth e contexto;
- chamar data access;
- usar mappers e normalizers quando necessario;
- compor componentes visuais.

`page.tsx` nao deve:

- conter listas enormes de config hardcoded;
- conter toda a UI da feature;
- conter normalizacao complexa;
- esconder regra multi-tenant em inline logic dificil de testar.

## 5. Padrao para formularios

Um formulario deve seguir a separacao abaixo:

- o form mantem estado e interacao;
- o mapper monta payload para API ou server action;
- os normalizers tratam dados de entrada ou saida;
- os configs alimentam selects, checklists e opcao rapidas;
- o submit chama API ou action;
- `data-cy` deve ser preservado em fluxos criticos.

Regra pratica:

- o componente do formulario nao deve virar fonte de verdade de dominio, payload e UI ao mesmo tempo.

## 6. Padrao para data-driven config

Configs devem concentrar informacao estavel e exibivel. Exemplos:

- `PLAN_DISPLAY_CONFIG`
- `PLAN_FEATURE_CONFIG`
- `NAV_ITEMS`
- `DASHBOARD_CARD_CONFIG`
- `VISUAL_ACUITY_OPTIONS`
- `PRESCRIPTION_NOTE_OPTIONS`
- `ALERT_STATUS_CONFIG`

Regras:

- config deve substituir duplicacao;
- config nao deve virar autorizacao escondida;
- entitlement, billing e copy devem ter fronteiras claras.

## 7. Padrao para seguranca multi-tenant

Toda operacao sensivel deve validar `clinicId` e ownership explicitamente.

Regras obrigatorias:

- APIs que usam `service_role` precisam checar ownership antes da acao;
- `patientId`, `examId` e `alertId` nunca devem ser aceitos sem validacao de tenant;
- Prisma direto nao deve ser tratado como RLS garantido sem validacao explicita;
- UI nao substitui validacao de backend;
- alteracoes em billing nao devem depender apenas de estados visuais.

Se o dominio envolve dados de outra clinica, a validacao deve existir na borda da aplicacao, nao apenas na interface.

## 8. Padrao para testes e harness

O harness deve acompanhar o padrao modular.

Regras:

- `data-cy` estaveis devem ser preservados em fluxos criticos;
- testes mutaveis devem rodar apenas em ambiente controlado;
- Cypress publico e read-only pode rodar em producao;
- fluxos clinicos criticos precisam de smoke tests consistentes;
- normalizers e mappers devem ter testes unitarios quando possivel.

Politica operacional:

- testes que criam, editam ou excluem dados nao devem rodar em producao real;
- seed destrutivo nunca deve rodar em producao.

## 9. Checklist antes de uma nova feature

Antes de implementar uma feature ou refactor, verificar:

- Existe config hardcoded que deve ser centralizada?
- A pagina esta ficando grande?
- Existe mapper ou payload dedicado?
- Existe validacao de `clinicId`?
- Existe `data-cy` para o fluxo critico?
- Precisa de Cypress ou teste unitario?
- A mudanca afeta billing, tenant ou auth?

Se a resposta for sim para billing, tenant ou auth, a feature deve ganhar fronteiras mais claras antes de crescer.

## 10. Exemplos praticos no Lensys Care

### Exams

O dominio de exames e o exemplo mais importante de organizacao incremental.

- formulario grande foi um bom candidato para extracao de opcoes e partes visuais;
- refs e normalizacao de payload podem sair do componente principal;
- regras puras podem ser testadas sem renderizar toda a pagina.

### Patients

Pacientes e um bom exemplo de form e detail separados por responsabilidade.

- formulario pode ficar responsavel por interacao;
- pagina detail pode compor historico, acoes e estado do paciente;
- payload e validacao devem ficar fora da UI principal quando possivel.

### Dashboard

Dashboard e exemplo de pagina composta por sections e data access.

- metricas e cards devem sair do page principal quando crescerem;
- config de cards pode ser data-driven;
- a pagina deve orquestrar, nao acumular tudo.

### Sidebar / Navigation

Sidebar e exemplo de componentizacao incremental.

- menu, perfil, plano e collapse podem ser separados em subcomponentes;
- visual de topo e estado collapsed podem ser tratados como partes distintas;
- responsividade nao deve virar regra de negocio escondida.

## 11. O que evitar

Evitar os seguintes padroes:

- componente com 800 linhas;
- pagina com query, UI, payload e regra tudo junto;
- duplicar labels, precos ou features;
- criar migration junto com refactor visual sem necessidade real;
- alterar auth, RLS ou billing junto com refactor comum;
- rodar seed destrutivo em producao;
- confiar em UI como unica protecao de tenant.

## 12. Regra de evolucao

O padrao recomendado para o Lensys Care e:

1. extrair o que e puramente estatico ou derivavel;
2. manter UI, data access e regra pura separados;
3. adicionar testes onde a logica passou a ficar previsivel;
4. so entao expandir o dominio ou refactorizar fronteiras mais sensiveis.

Isso reduz risco e permite que futuras features sejam adicionadas sem degradar a seguranca multi-tenant nem a manutencao do sistema.
