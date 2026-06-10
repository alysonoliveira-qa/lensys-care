# CLAUDE.md

Guia para trabalhar neste repositório. Mantenha conciso e atualizado.

## O que é

**Lensys Care** — SaaS em fase beta (validação de MVP) para clínicas/profissionais de
optometria. Foco no fluxo clínico: auth, pacientes, exames/refração, histórico e
impressão de receituário. Deploy na Vercel (root = `apps/web`).

**Domínio de produção:** `https://www.lensyscare.com.br`
**Repositório GitHub:** `alysonoliveira-qa/lensys-care`

## Stack

- **Monorepo:** pnpm workspace + Turbo
- **App:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui (Radix)
- **Banco/Auth:** Supabase (Postgres + auth), com RLS nas migrations (`supabase/migrations`)
- **ORM de domínio:** Prisma (`packages/db`)
- **Pagamentos:** Stripe (checkout, portal, webhooks)
- **Email:** Resend (`apps/web/lib/email/`) — domínio `lensyscare.com.br` verificado
- **Mensageria:** Twilio (SMS/WhatsApp), Z-API (placeholder para plano Conecta)
- **Testes:** Vitest (unit, `apps/web/__tests__`) + Cypress (E2E, `cypress/e2e`)

## Estrutura

```text
apps/web/        # aplicação Next.js (rotas, componentes, lib)
packages/db/     # schema Prisma + Prisma Client + seed
supabase/        # migrations SQL (schema, RLS, pgcron)
docs/            # arquitetura, auditorias, roadmap, estratégia de testes
cypress/         # testes E2E
```

## Comandos

Na raiz (via Turbo):

```bash
pnpm dev               # sobe tudo
pnpm build             # build (gera Prisma Client antes do next build)
pnpm lint
pnpm type-check
pnpm test              # vitest run
pnpm format            # prettier --write
pnpm db:generate       # prisma generate (usar pnpm --filter db prisma generate)
pnpm db:migrate        # prisma migrate dev
pnpm db:migrate:deploy
pnpm db:studio
pnpm db:seed
```

App web direto:

```bash
pnpm --filter web dev          # porta 3000
pnpm --filter web dev:manual   # porta 3001 (uso manual no navegador)
pnpm --filter web test
```

Cypress: `pnpm cypress open`. Use `CYPRESS_BASE_URL` para apontar para
preview/produção. Convenção: manual no navegador usa `3001`, Cypress usa `3000`.

> **Nota:** O script `db:generate` na raiz tem um bug conhecido — usar
> `pnpm --filter db prisma generate` diretamente.

## Modelo de dados (Prisma)

Multi-tenant com **Clinic** como tenant raiz:

- `Clinic` → `Profile` (espelha `auth.users` do Supabase), `Patient`, `Subscription`,
  `StripeCustomer`, `Payment`, `Invite`
- `Patient` → `Exam` (refração OD/OE: sph/cyl/axis/va, adição, DP, notas) → `Alert`
  (recall via EMAIL/WHATSAPP/SMS)
- Enums: `Role` (OWNER/OPTOMETRIST/RECEPTIONIST), `InviteStatus` (PENDING/ACCEPTED/EXPIRED/REVOKED),
  `Plan` (ESSENTIAL/CONECTA), `SubscriptionStatus`, `PaymentStatus`, `AlertStatus`, `AlertChannel`

### Campos importantes adicionados em 10/06/2026

- `Clinic.owner_id` — referência explícita ao Profile OWNER da clínica
- `Profile.updated_at` — rastreamento de mudança de role
- Model `Invite` — convite de membro com token UUID, expires_at, status, role

### Migrations aplicadas

| Arquivo | Descrição |
|---------|-----------|
| `001_initial_schema.sql` | Schema inicial |
| `002_rls_policies.sql` | Políticas RLS |
| `003_pgcron_alerts.sql` | pgcron para alertas |
| `004_harden_schema_and_defer_pg_net.sql` | Hardening |
| `005_add_preferred_name_to_profiles.sql` | Nome preferido |
| `006_add_multi_member_support.sql` | owner_id, updated_at, InviteStatus, tabela invites + RLS |
| `007_fix_invites_pending_unique.sql` | Fix constraint: índice parcial WHERE status='PENDING' |

> **Importante:** O projeto usa SQL direto no Supabase, NÃO `prisma migrate dev`
> (histórico de migrations está em `supabase/migrations/`).

## Fluxo de convite de membros

1. OWNER acessa `/account` → seção "Equipe" → preenche email + role → clica "Enviar convite"
2. Server action `createInvite` cria `Invite` no banco (72h de validade)
3. `sendInviteEmail` dispara email via Resend (`noreply@lensyscare.com.br`)
4. Convidado acessa `/convite/[token]` (rota pública) → preenche nome + senha
5. `POST /api/invites/accept` cria Profile + marca invite ACCEPTED
6. Convidado faz login → aparece na seção "Equipe" do OWNER

## Padrão de código (obrigatório — ver `docs/module-pattern.md`)

- **Páginas compõem, não concentram lógica.** `page.tsx` resolve auth/contexto, chama
  data access, usa mappers/normalizers e compõe componentes.
- **Server Actions** seguem o padrão de `apps/web/app/(dashboard)/planos/actions.ts`:
  `'use server'`, state tipado (`{ status, message }`), validação, auth via `createClient()`.
- **Separação por domínio:** `lib/{domain}/{domain}-data.ts` (acesso a dados),
  `-mappers.ts` (persistido ↔ UI/payload), `-normalizers.ts` (puros, sem side effects),
  `-config.ts` (labels, opções, badges data-driven).
- **Configs data-driven** centralizam duplicação: `NAV_ITEMS`, `PLAN_FEATURE_CONFIG`,
  `VISUAL_ACUITY_OPTIONS`, `ALERT_STATUS_CONFIG`, etc.
- **Componentes visuais recebem dados por props.** Evitar componentes gigantes (>800 linhas).
- Normalizers e mappers devem ter testes unitários quando a lógica fica previsível.

## Segurança multi-tenant (inegociável)

- Toda operação sensível **valida `clinicId`/ownership explicitamente na borda** (API/server action).
- `patientId`, `examId`, `alertId`, `inviteId` nunca aceitos sem validação de tenant.
- `service_role` **só no server-side**, nunca no frontend.
- Prisma direto não é RLS garantido — valide explicitamente.
- UI nunca é a única proteção.
- Preservar `data-cy` em fluxos clínicos críticos.
- Guards de role implementados: RECEPTIONIST não pode criar/editar exames.

## Variáveis de ambiente

`.env.local` (não commitar). Variáveis necessárias:

```env
DATABASE_URL=
DIRECT_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=https://www.lensyscare.com.br   # localhost:3001 em dev
RESEND_API_KEY=
RESEND_FROM_EMAIL=Lensys Care <noreply@lensyscare.com.br>
```

E2E usa `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`. Nunca commitar `.env.local` nem
`cypress.env.json`.

## Middleware

`apps/web/lib/supabase/middleware.ts` — rotas públicas incluem `/convite` e
`pathname.startsWith('/convite/')`. `/api/invites/accept` também é pública.
`/api/invites/send` permanece protegida (chamada server-side via `sendInviteEmail`).

## Prioridades de produto

Critério ao priorizar:

1. Bug que bloqueia cliente real vem primeiro.
2. Fluxo clínico antes de visual fino.
3. Performance em produção antes de performance no localhost dev.
4. Feedback do cliente antes de ideias novas.
5. Segurança/ownership antes de conveniência.

**Não fazer agora:** mexer em RLS/Auth sem necessidade, billing complexo, permissões
completas antes de validar fluxo real, reescrever dashboard sem dados reais.
