# Lensys Care

**Sistema de gestão para optometria clínica**

Lensys Care é um SaaS em fase beta para profissionais e clínicas de optometria. O foco atual é organizar o fluxo clínico principal em uma aplicação web: autenticação, pacientes, exames/refração, histórico clínico, impressão de receituário e gestão de equipe multi-membro.

🌐 **Produção:** [lensyscare.com.br](https://www.lensyscare.com.br)

## Status do projeto

- **Fase atual:** beta / validação de MVP
- **Deploy:** Vercel → `www.lensyscare.com.br`
- **App principal:** `apps/web`
- **Banco e auth:** Supabase
- **ORM de domínio:** Prisma
- **Email transacional:** Resend (`noreply@lensyscare.com.br`)
- **Testes E2E:** Cypress

## Funcionalidades implementadas

### Clínica e autenticação
- Landing pública
- Página pública de planos
- Cadastro de clínica/usuário
- Login e logout

### Gestão de equipe (multi-membro)
- Convite de membros por email (link seguro com token, validade 72h)
- Aceitação de convite via página pública `/convite/[token]`
- Roles: Proprietário, Optometrista, Recepcionista
- Guards de permissão por role (recepcionista não cria exames)
- Gestão de membros: trocar role, remover membro
- Revogar convites pendentes
- Email de convite enviado via Resend

### Fluxo clínico
- Dashboard clínico
- Cadastro, listagem e ficha de pacientes
- Criação de exame / refração
- Edição de exame
- Exclusão de exame
- Impressão de exame / receita
- Acuidade visual com valores comuns e modo manual
- Reaproveitamento do exame anterior como referência ao criar novo
- Observações padrão de receituário
- Checkboxes rápidos para receita: Antirreflexo, Filtro azul, Fotossensível

### Testes
- Cypress E2E: smoke tests cobrindo navegação pública, login, criação de paciente, fluxo clínico básico
- Spec E2E para fluxo de convite (`cypress/e2e/invite-flow.cy.ts`)

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + RLS)
- Prisma
- Resend
- Stripe
- Cypress
- Vercel
- pnpm workspace / monorepo
- Turbo

## Estrutura do projeto

```text
.
├── apps/
│   └── web/               # aplicação principal Next.js
├── packages/
│   └── db/                # schema Prisma e utilitários de banco
├── supabase/
│   └── migrations/        # migrations SQL (001 a 007)
├── cypress/               # testes E2E
├── docs/                  # arquitetura, roadmap, padrões
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Como rodar localmente

### Requisitos

- Node.js 20+
- pnpm 9+

### Instalar dependências

```bash
pnpm install
```

### Subir a aplicação web

```bash
pnpm --filter web dev
```

Por padrão sobe em `http://localhost:3000`. Para desenvolvimento manual no navegador:

```bash
pnpm --filter web dev:manual   # porta 3001
```

### Gerar build de produção local

```bash
pnpm --filter web build
```

## Variáveis de ambiente

Use `.env.local` para ambiente local. Não commite arquivos com segredos.

```env
DATABASE_URL=
DIRECT_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=http://localhost:3001
RESEND_API_KEY=
RESEND_FROM_EMAIL=Lensys Care <noreply@lensyscare.com.br>
```

> Em produção, `NEXT_PUBLIC_APP_URL=https://www.lensyscare.com.br`

## Scripts úteis

```bash
# Raiz do monorepo
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm test
pnpm db:generate        # ou: pnpm --filter db prisma generate
pnpm db:migrate
pnpm db:studio

# App web
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web test
```

## Testes E2E com Cypress

```bash
pnpm cypress open

# Apontar para produção
CYPRESS_BASE_URL=https://www.lensyscare.com.br pnpm cypress open
```

Convenção: manual no navegador usa `localhost:3001`, Cypress usa `localhost:3000`.

## Migrations

As migrations são aplicadas via **Supabase SQL Editor** ou `supabase db push`, **não** via `prisma migrate dev`.

| Arquivo | Descrição |
|---------|-----------|
| `001_initial_schema.sql` | Schema inicial |
| `002_rls_policies.sql` | Políticas RLS |
| `003_pgcron_alerts.sql` | pgcron para alertas |
| `004_harden_schema_and_defer_pg_net.sql` | Hardening |
| `005_add_preferred_name_to_profiles.sql` | Nome preferido |
| `006_add_multi_member_support.sql` | Multi-membro: owner_id, invites, RLS |
| `007_fix_invites_pending_unique.sql` | Fix índice parcial de convites |

## Deploy

- **Hospedagem:** Vercel
- **Root Directory:** `apps/web`
- **Domínio:** `lensyscare.com.br` (DNS no registro.br apontando pro Vercel)

## Roadmap

### Próximos passos
- Alteração de senha na página de conta
- Configurações de receita por clínica
- Alertas e recalls mais avançados
- Expansão da cobertura de testes E2E (incluindo fluxo de convite)
- DMARC no DNS (melhora entregabilidade do email)

### Futuro
- Integração real WhatsApp/SMS (plano Conecta — Twilio/Z-API)
- Melhorias de performance
- Integrações futuras de comunicação

## Observações de segurança

- Nunca use `service_role` no frontend.
- Restrinja segredos a ambiente server-side.
- Não commite `.env.local`, `cypress.env.json` ou qualquer arquivo com credenciais reais.
- Revise cuidadosamente qualquer uso de dados sensíveis de pacientes.
- Guards de role devem ser validados no servidor, nunca só na UI.

## Observações finais

Lensys Care está em evolução incremental. O objetivo atual não é fechar todo o SaaS de uma vez, e sim consolidar um núcleo clínico confiável para demo, validação com usuários e ampliação segura do produto.
