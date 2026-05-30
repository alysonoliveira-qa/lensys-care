# Lensys Care

**Sistema de gestao para optometria clinica**

Lensys Care e um SaaS em fase beta para profissionais e clinicas de optometria. O foco atual do projeto e organizar o fluxo clinico principal em uma aplicacao web: autenticacao, pacientes, exames/refracao, historico clinico e impressao de receituario.

## Status do projeto

- **Fase atual:** beta / validacao de MVP
- **Deploy:** Vercel
- **App principal:** `apps/web`
- **Banco e auth:** Supabase
- **Camada ORM legada/atual de dominio:** Prisma
- **Testes E2E:** Cypress

O projeto ja possui fluxos reais implementados e uma base inicial de automacao E2E para smoke tests.

## Funcionalidades atuais

- Landing publica
- Pagina publica de planos
- Cadastro de clinica/usuario
- Login e logout
- Dashboard clinico
- Cadastro, listagem e ficha de pacientes
- Criacao de exame / refracao
- Edicao de exame
- Exclusao de exame
- Impressao de exame / receita
- Acuidade visual com valores comuns e modo manual
- Reaproveitamento do exame anterior como referencia ao criar novo exame
- Observacoes padrao de receituario
- Checkboxes rapidos para receita:
  - Antirreflexo
  - Filtro azul
  - Fotossensivel
- Cypress E2E preparado para validacao dos fluxos principais
- Smoke tests cobrindo:
  - navegacao publica
  - login
  - criacao de paciente
  - fluxo clinico basico: criar paciente, criar exame, editar exame e abrir impressao

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Prisma
- Cypress
- Vercel
- pnpm workspace / monorepo
- Turbo

## Estrutura do projeto

```text
.
|-- apps/
|   `-- web/               # aplicacao principal Next.js
|-- packages/
|   `-- db/                # schema Prisma e utilitarios de banco
|-- supabase/              # artefatos e migrations relacionadas ao Supabase
|-- package.json           # scripts da raiz do monorepo
|-- pnpm-workspace.yaml
`-- turbo.json
```

Pontos importantes:

- `apps/web` concentra a interface, rotas App Router, componentes e integracoes do frontend/server.
- `packages/db` concentra o schema Prisma e a geracao do Prisma Client.
- `supabase` agrupa o material de banco relacionado ao projeto Supabase.

## Como rodar localmente

### Requisitos

- Node.js 20+
- pnpm 9+

### Instalar dependencias

```bash
pnpm install
```

### Subir a aplicacao web

```bash
pnpm --filter web dev
```

Por padrao, a aplicacao sobe em `http://localhost:3000`.

Para desenvolvimento manual no navegador, use `http://localhost:3001`:

```bash
pnpm --filter web dev:manual
```

Se precisar passar a porta explicitamente:

```bash
pnpm --filter web dev -- -p 3001
```

As instrucoes curtas de desenvolvimento local estao em [docs/local-development.md](docs/local-development.md).

### Gerar build de producao local

```bash
pnpm --filter web build
```

Esse comando ja executa a geracao do Prisma Client antes do `next build`.

## Variaveis de ambiente

Use `.env.local` para ambiente local. Nao commite arquivos com segredos.

Variaveis principais usadas pelo projeto:

```env
DATABASE_URL=
DIRECT_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=
```

Observacoes:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sao usadas no app web.
- `SUPABASE_SERVICE_ROLE_KEY` deve ficar restrita ao backend/server-side.
- `DATABASE_URL` e `DIRECT_URL` sao usadas pelo Prisma.
- Nao exponha secrets em README, screenshots, issues ou arquivos versionados.

## Scripts uteis

Na raiz do monorepo:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:studio
```

No app web:

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web test
```

## Testes E2E com Cypress

O projeto usa Cypress para validar os fluxos criticos da aplicacao. Os seletores `data-cy` dos fluxos principais ja foram preparados para dar estabilidade aos testes.

### Abrir Cypress localmente

```bash
pnpm cypress open
```

### Abrir Cypress apontando para producao

```bash
CYPRESS_BASE_URL=https://lensys-care.vercel.app pnpm cypress open
```

Use `CYPRESS_BASE_URL` para alternar entre ambiente local, preview ou producao.

Convencao local:

- manual no navegador: `http://localhost:3001`
- Cypress/Codex: `http://localhost:3000` ou o valor definido em `CYPRESS_BASE_URL`
- se a porta travar no Windows: `taskkill /F /IM node.exe`

### Credenciais de teste E2E

Use variaveis locais para o usuario de teste:

```env
E2E_USER_EMAIL=
E2E_USER_PASSWORD=
```

### Arquivo local do Cypress

Se o time usar `cypress.env.json` para dados locais, **esse arquivo nao deve ser commitado**.

Boas praticas:

- manter `cypress.env.json` apenas no ambiente local do desenvolvedor
- usar `CYPRESS_BASE_URL` para apontar os testes para o ambiente correto
- evitar credenciais reais de producao em arquivos versionados

## Deploy

- **Hospedagem:** Vercel
- **App principal:** `apps/web`
- **Root Directory na Vercel:** `apps/web`

Fluxo geral:

1. push para o repositorio
2. Vercel executa o build do app web
3. o build gera Prisma Client e roda `next build`
4. o deploy fica disponivel no ambiente configurado

Para validacoes de demo, os testes E2E podem rodar:

- localmente, contra `http://localhost:3000`
- contra preview da Vercel
- contra producao, usando `CYPRESS_BASE_URL`

## Roadmap

- Melhorias visuais internas
- Configuracoes de receita por clinica
- Alertas e recalls mais avancados
- Melhorias de performance
- Expansao da cobertura de testes E2E
- Integracoes futuras de comunicacao

## Observacoes de seguranca

- Nunca use `service_role` no frontend.
- Restrinja segredos a ambiente server-side.
- Nao commite `.env.local`, `cypress.env.json` ou qualquer arquivo com credenciais reais.
- Revise cuidadosamente qualquer uso de dados sensiveis de pacientes.
- Antes de expandir o produto, mantenha o modelo de acesso e isolamento de dados coerente com a estrategia de auth e banco.

## Observacoes finais

Lensys Care esta em evolucao incremental. O objetivo atual nao e fechar todo o SaaS de uma vez, e sim consolidar um nucleo clinico confiavel para demo, validacao com usuarios e ampliacao segura do produto.
