# CLAUDE.md

Guia para trabalhar neste repositório. Mantenha conciso e atualizado.

## O que é

**Lensys Care** — SaaS em fase beta (validação de MVP) para clínicas/profissionais de
optometria. Foco no fluxo clínico: auth, pacientes, exames/refração, histórico e
impressão de receituário. Deploy na Vercel (root = `apps/web`).

## Stack

- **Monorepo:** pnpm workspace + Turbo
- **App:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui (Radix)
- **Banco/Auth:** Supabase (Postgres + auth), com RLS nas migrations (`supabase/migrations`)
- **ORM de domínio:** Prisma (`packages/db`)
- **Pagamentos:** Stripe (checkout, portal, webhooks)
- **Mensageria:** Twilio (SMS/WhatsApp), Z-API, Resend (e-mail/recalls)
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
pnpm db:generate       # prisma generate
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

## Modelo de dados (Prisma)

Multi-tenant com **Clinic** como tenant raiz:

- `Clinic` → `Profile` (espelha `auth.users` do Supabase), `Patient`, `Subscription`,
  `StripeCustomer`, `Payment`
- `Patient` → `Exam` (refração OD/OE: sph/cyl/axis/va, adição, DP, notas) → `Alert`
  (recall via EMAIL/WHATSAPP/SMS)
- Enums: `Role` (OWNER/OPTOMETRIST/RECEPTIONIST), `Plan` (ESSENTIAL/CONECTA),
  `SubscriptionStatus`, `PaymentStatus`, `AlertStatus`, `AlertChannel`

## Padrão de código (obrigatório — ver `docs/module-pattern.md`)

- **Páginas compõem, não concentram lógica.** `page.tsx` resolve auth/contexto, chama
  data access, usa mappers/normalizers e compõe componentes.
- **Separação por domínio:** `lib/{domain}/{domain}-data.ts` (acesso a dados),
  `-mappers.ts` (persistido ↔ UI/payload), `-normalizers.ts` (puros, sem side effects),
  `-config.ts` (labels, opções, badges data-driven).
- **Configs data-driven** centralizam duplicação: `NAV_ITEMS`, `PLAN_FEATURE_CONFIG`,
  `VISUAL_ACUITY_OPTIONS`, `ALERT_STATUS_CONFIG`, etc. Config não é autorização escondida.
- **Componentes visuais recebem dados por props.** Evitar componentes gigantes (>800 linhas).
- Normalizers e mappers devem ter testes unitários quando a lógica fica previsível.

## Segurança multi-tenant (inegociável)

- Toda operação sensível **valida `clinicId`/ownership explicitamente na borda** (API/server action).
- `patientId`, `examId`, `alertId` nunca aceitos sem validação de tenant.
- `service_role` **só no server-side**, nunca no frontend; APIs com `service_role` checam
  ownership antes de agir.
- Prisma direto não é RLS garantido — valide explicitamente.
- UI nunca é a única proteção; billing não depende só de estados visuais.
- Preservar `data-cy` em fluxos clínicos críticos.

## Prioridades de produto (`docs/known-issues-and-roadmap.md`)

Critério ao priorizar:

1. Bug que bloqueia cliente real vem primeiro.
2. Fluxo clínico antes de visual fino.
3. Performance em produção antes de performance no localhost dev.
4. Feedback do cliente antes de ideias novas.
5. Segurança/ownership antes de conveniência.

**Não fazer agora:** mexer em RLS/Auth sem necessidade, billing complexo, permissões
completas antes de validar fluxo real, reescrever dashboard sem dados reais, otimizar
performance só com base no dev local.

## Segredos

`.env.local` (não commitar). Variáveis: `DATABASE_URL`, `DIRECT_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (server-only), `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`.
E2E usa `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`. Nunca commitar `.env.local` nem
`cypress.env.json`.
