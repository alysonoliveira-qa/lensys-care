# CLAUDE.md

Guia para trabalhar neste repositório. Mantenha conciso e atualizado.

## O que é

**Lensys Care** — SaaS em fase beta (validação de MVP) para clínicas/profissionais de
optometria. Foco no fluxo clínico: auth, pacientes, exames/refração, histórico e
impressão de receituário. Deploy na Vercel (root = `apps/web`).

**Domínio de produção:** `https://www.lensyscare.com.br`
**Repositório GitHub:** `alysonoliveira-qa/lensys-care`

## Infraestrutura (regiões)

**As duas pontas ficam em São Paulo, e isso não é detalhe — é o que define a latência
sentida pelo usuário.**

- **Funções da Vercel:** `gru1` (São Paulo), fixado em `apps/web/vercel.json`.
- **Banco Supabase:** projeto `nizpcltworkfakyqnfxk`, região `sa-east-1` (São Paulo).

**Regra inegociável:** função e banco andam juntos. Mudar a região de um sem o outro
piora a performance em vez de melhorar — a medição de 24/08/2026 mostrou que o custo
dominante é a distância da função até o usuário, e que o banco só é barato enquanto
estiver ao lado dela. Detalhes e números em `docs/performance-audit.md` seções 13 e 14.

Conferir de onde a resposta saiu: header `x-vercel-id`, que deve mostrar `gru1::gru1`.

## Stack

- **Monorepo:** pnpm workspace + Turbo
- **App:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui (Radix)
- **Banco/Auth:** Supabase (Postgres + auth), com RLS nas migrations (`supabase/migrations`)
- **ORM de domínio:** Prisma (`packages/db`)
- **Pagamentos:** Stripe (checkout, portal, webhooks)
- **Email:** Resend (`apps/web/lib/email/`) — domínio `lensyscare.com.br` verificado
- **Mensageria:** WhatsApp pela **Meta Cloud API** (oficial, preferido —
  `lib/messaging/providers/meta.ts`), com Z-API e Twilio como alternativas. Recall é mensagem
  iniciada pela clínica, fora da janela de 24h, então sai como **template aprovado** — texto
  livre volta com erro 131047. O canal do alerta é resolvido **no disparo**, não na criação
  (`lib/alerts/alert-channel.ts`): entre o exame e o lembrete passa um ano.
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
pnpm --filter web type-check
```

Cypress: `pnpm cypress open`. Use `CYPRESS_BASE_URL` para apontar para
preview/produção. Convenção: manual no navegador usa `3001`, Cypress usa `3000`.

> **Nota:** Os scripts `db:*` da raiz delegam via `pnpm --filter db run <script>`.
> Chamar `pnpm --filter db prisma generate` falha ("None of the selected packages
> has a 'prisma' script") — `prisma` é um binário, não um script do pacote `db`.

## Modelo de dados (Prisma)

Multi-tenant com **Clinic** como tenant raiz:

- `Clinic` → `Profile` (espelha `auth.users` do Supabase), `Patient`, `Subscription`,
  `StripeCustomer`, `Payment`, `Invite`
- `Patient` → `Exam` (refração OD/OE: sph/cyl/axis/va, adição, DP, notas) → `Alert`
  (recall via EMAIL/WHATSAPP/SMS)
- `Clinic` → `Appointment` (agenda: `appointment_date` DATE obrigatória, `scheduled_time`
  TIME opcional = fila do dia por `created_at`) e `Referrer` (indicante: nome + PIX +
  WhatsApp). `Appointment.referrer_id` + `referral_paid_at` sustentam o contador de
  indicações pendentes.
- Enums: `Role` (OWNER/OPTOMETRIST/RECEPTIONIST), `InviteStatus` (PENDING/ACCEPTED/EXPIRED/REVOKED),
  `Plan` (ESSENTIAL/CONECTA), `SubscriptionStatus`, `PaymentStatus`, `AlertStatus`, `AlertChannel`,
  `AppointmentStatus` (SCHEDULED/ATTENDED/CANCELED)

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
| `008_add_patient_search_trgm.sql` | pg_trgm + índices GIN para busca ILIKE em pacientes |
| `009_add_appointments_and_referrers.sql` | Agenda: enum `appointment_status`, tabelas `appointments` e `referrers` + RLS + índices |
| `012_revoke_public_execute_on_rls_auto_enable.sql` | Revoga EXECUTE público da função SECURITY DEFINER `rls_auto_enable()` |
| `013_drop_stray_demo_table.sql` | Remove `"Lensys Care Demo"`, tabela de teste criada fora das migrations |
| `014_grant_service_role_on_public_tables.sql` | Restaura os grants do `service_role`, perdidos no restore para `sa-east-1` |

> **Importante:** O projeto usa SQL direto no Supabase, NÃO `prisma migrate dev`
> (histórico de migrations está em `supabase/migrations/`).
>
> **Como aplicar:** use o MCP do Supabase (`apply_migration`) — não é passo manual no
> SQL editor. O arquivo em `supabase/migrations/` continua sendo a fonte de verdade.
>
> **Divergência conhecida:** o histórico de migrations do Supabase só registra 001–004
> e a 009; as 005–008 foram aplicadas por SQL editor sem registrar versão.

## Fluxo de convite de membros

1. OWNER acessa `/account` → seção "Equipe" → preenche email + role → clica "Enviar convite"
2. Server action `createInvite` cria `Invite` no banco (72h de validade)
3. `sendInviteEmail` dispara email via Resend (`noreply@lensyscare.com.br`)
4. Convidado acessa `/convite/[token]` (rota pública) → preenche nome + senha
5. `POST /api/invites/accept` cria Profile + marca invite ACCEPTED
6. Convidado faz login → aparece na seção "Equipe" do OWNER

## Agenda de consultas + Indicantes

- **`/agenda`** — lista do dia: consultas com horário primeiro (por hora), depois a
  **fila** dos sem horário (`scheduled_time IS NULL`) por ordem de marcação. A posição
  `#N` é **derivada na leitura** (não persistida); cancelada continua visível e sai da
  numeração. Navegação ontem/hoje/amanhã + seletor de data via `?date=`.
- **Domínio:** `lib/appointments/` (`-data`, `-mappers`, `-normalizers`, `-config`,
  `agenda-navigation`) e `lib/referrers/`.
- **Fuso:** `appointment_date` (DATE) e `scheduled_time` (TIME) são hora de parede. O
  Prisma os devolve como instantes UTC — formatar **sempre com getters UTC**
  (`formatAppointmentTime`), senão o dia/hora desloca em UTC-3.
- **Indicantes ("corretas")** — aba em `/patients?tab=indicantes`: cadastro (nome + PIX +
  WhatsApp), contador de indicações pendentes (`ATTENDED` + `referrer_id` +
  `referral_paid_at IS NULL`) e fluxo Pagar → mostra PIX → Marcar pago
  (`markReferralsPaid` em transação, com recontagem). Sem valores em R$ no MVP —
  `REFERRAL_FEE_CENTS` fica reservado para o módulo financeiro.
- **Papéis:** ⚠️ diferente dos exames, `RECEPTIONIST` **pode** criar consultas e mudar
  status. A proteção é validação de tenant na borda, não guard de papel.

## Padrão de código (obrigatório — ver `docs/module-pattern.md`)

- **Páginas compõem, não concentram lógica.** `page.tsx` resolve auth/contexto, chama
  data access, usa mappers/normalizers e compõe componentes.
- **Server Actions** seguem o padrão de `apps/web/app/(dashboard)/account/actions.ts`
  (e `apps/web/app/dashboard/planos/actions.ts`): `'use server'`, state tipado
  (`{ status, message }`), validação, auth via `getAuthenticatedProfile()`
  (`apps/web/lib/auth/authenticated-profile.ts`) — o `clinic_id` vem da sessão, nunca
  do formulário. Um arquivo `'use server'` só pode exportar funções async.
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
- Guards de role implementados: RECEPTIONIST não pode criar/editar exames; OPTOMETRIST só
  edita e exclui exame que ele mesmo realizou (`performed_by`).
- Cabeçalhos de segurança em `apps/web/next.config.mjs` (`headers()`): HSTS, `X-Frame-Options:
  DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. CSP completa ainda não existe —
  precisa de nonce por causa do script inline do App Router.
- Rotas de erro devolvem mensagem genérica ao cliente e logam o erro completo no servidor. A
  exceção é o webhook do Stripe, cuja resposta vai para o painel do Stripe, não para o navegador.
- `/api/messaging/{sms,whatsapp}` recebem **`patientId`, nunca `to`**: o telefone vem do cadastro,
  escopado pela clínica da sessão (`lib/messaging/recipient.ts`). Aceitar número do corpo deixava
  qualquer usuário autenticado gastar o saldo Twilio da clínica com destino arbitrário.

## Variáveis de ambiente

`.env.local` (não commitar). Variáveis necessárias:

```env
DATABASE_URL=      # transaction pooler, porta 6543 + ?pgbouncer=true&connection_limit=1
DIRECT_URL=        # conexão direta, porta 5432
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=https://www.lensyscare.com.br   # localhost:3001 em dev
RESEND_API_KEY=
RESEND_FROM_EMAIL=Lensys Care <noreply@lensyscare.com.br>
```

### As duas strings de conexão têm papéis diferentes

- **`DATABASE_URL`** — transaction pooler (`aws-0-sa-east-1.pooler.supabase.com:6543`),
  com `?pgbouncer=true&connection_limit=1`. É o que segura serverless: sem pooler, cada
  invocação de função abre uma conexão real no Postgres, e o teto chega sem aviso. O
  `pgbouncer=true` é parâmetro do Prisma (desliga prepared statements) — o `psql` rejeita
  essa string, e isso é esperado.
- **`DIRECT_URL`** — conexão direta (`db.<ref>.supabase.co:5432`). É o que o Prisma usa em
  migration. DDL e advisory lock não sobrevivem ao transaction pooler.

**Para dump/restore use a conexão direta ou o session pooler (5432) — nunca a 6543.** O
transaction pooler aceita a conexão e quebra no meio de um `--single-transaction`, deixando
o banco pela metade.

**Armadilha de rede:** a conexão direta do Supabase é IPv6, e container Docker é IPv4 por
padrão — de dentro de um container ela falha com "Network is unreachable". Nesse caso, use
o session pooler. O prefixo do host (`aws-0`, `aws-1`) varia por projeto: copie do painel
*Connect*, não monte à mão.

E2E usa `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`. Nunca commitar `.env.local` nem
`cypress.env.json`.

Um hook de pre-commit (`.husky/pre-commit` → `scripts/check-secrets.mjs`) barra commit
de credencial: nome de arquivo proibido (`.env*`, `cypress.env.json`, `*.pem`) e padrões
de chave nas linhas adicionadas (Stripe, Twilio, Resend, Supabase, JWT, URL de banco com
senha) — inclusive valor concreto em `*_TOKEN`/`*_SECRET` dentro de `.env.example`.
Falso positivo: `pragma: allowlist secret` na linha. Varredura completa:
`pnpm secrets:check:all`. O hook só fica ativo depois de um `pnpm install` (husky).

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
