# Auditoria de Segurança Multi-Tenant — Lensys Care

**Data:** 2026-07-12
**Escopo:** Isolamento de tenant (clínica) nas rotas de API, server actions, data-access
(Prisma) e políticas RLS. Objetivo: detectar vazamento de dados entre clínicas,
bypass de ownership e falhas de guard de role.
**Método:** Auditoria estática, endpoint por endpoint, cruzando cada handler com as
políticas RLS (`supabase/migrations/002_rls_policies.sql`).

---

## Conclusão executiva

O isolamento multi-tenant está **fundamentalmente sólido**. Todos os caminhos que usam
**Prisma** (conexão direta ao Postgres, que **bypassa RLS**) validam `clinic_id`
explicitamente na borda antes de ler/escrever recursos. As políticas RLS das tabelas
`patients`, `exams`, `alerts`, `subscriptions`, `stripe_customers` e `payments` estão
corretamente escopadas por `private.auth_clinic_id()`.

**Nenhum vazamento cross-tenant crítico foi confirmado.**

Os achados abaixo são **vetores de abuso** e **defesa-em-profundidade** — nenhum é uma
quebra confirmada de isolamento de dados clínicos, mas todos merecem correção.

### Status das correções (2026-07-12)

| Achado | Status |
|---|---|
| M-2 (`invites/send` phishing) | ✅ Corrigido — deriva `to`/`clinicName`/`role` do `Invite` |
| L-1 (`exams/[id]` defesa-em-profundidade) | ✅ Corrigido — check explícito de `clinic_id` via Prisma |
| L-3 (paginação de convites) | ✅ Corrigido — `findAuthUserByEmail` pagina o admin API |
| M-1 (messaging abuso) | ⏳ Pendente — aguarda decisão de produto |
| L-2 (`PATCH` sem `performed_by`) | ⏳ Pendente — confirmar regra de negócio |
| I-1 (middleware 401 vs redirect) | ⏳ Pendente — melhoria menor |

Testes de regressão: `__tests__/api-invites-send-security.test.ts`,
`__tests__/api-exams-id-ownership.test.ts`, `__tests__/find-auth-user.test.ts`.

---

## O que está correto (defesas verificadas)

| Superfície | Proteção |
|---|---|
| `POST/PATCH /api/patients` | `clinic_id` explícito via Prisma (`findFirst` + `create/update`) |
| `DELETE /api/patients/[id]` | `deletePatientForClinic({ clinicId })` escopa por clínica |
| `POST /api/exams` | valida `patient.clinic_id === examiner.clinic_id` |
| `PATCH/DELETE /api/exams/[id]` | client anon → **RLS** `exams_update_clinic`/`exams_delete_staff` |
| `POST /api/alerts/[id]` | `getAlertByIdForClinic(alertId, clinicId)` antes de mutar |
| `POST /api/alerts/send` | Bearer `CRON_SECRET` |
| `getPatientDetailPageData` | escopa por `clinic.profiles.some(id: userId)` |
| Server actions `account/actions.ts` | validam `role === 'OWNER'` **e** `clinic_id` do alvo |
| `PATCH /api/profile` | opera só sobre `user.id` |
| `POST /api/stripe/portal` | resolve customer pela clínica do usuário |
| `POST /api/webhooks/stripe` | verifica assinatura (`constructWebhookEvent`) |
| `changePassword` | reautentica com `signInWithPassword` antes de trocar |

---

## Achados

### 🟠 M-1 — Envio de SMS/WhatsApp para destinatário arbitrário (abuso / toll-fraud)

**Arquivos:** `apps/web/app/api/messaging/sms/route.ts:38-47`,
`apps/web/app/api/messaging/whatsapp/route.ts:38-47`

Usuário autenticado (plano CONECTA) envia `message` arbitrária para `to` arbitrário,
**sem vínculo com nenhum paciente da clínica** e **sem rate limiting**. Permite:
- Spam / mensagens não solicitadas a qualquer número usando a conta Twilio da clínica.
- Toll-fraud (custo de SMS/WhatsApp para números premium).

Não é vazamento de dados entre clínicas, mas é abuso de infraestrutura compartilhada.

**Correção sugerida:** validar que `to` corresponde ao telefone de um `Patient` da
clínica do chamador (ou de um destinatário explicitamente permitido) + rate limiting
por clínica.

---

### 🟠 M-2 — `/api/invites/send` confia em `to`/`clinicName`/`role` do corpo da requisição

**Arquivo:** `apps/web/app/api/invites/send/route.ts:12-33`

A rota valida apenas que o `token` existe e está `PENDING`, mas usa `to`, `clinicName`
e `role` **do corpo da requisição** em vez de derivá-los do registro `Invite`. Um
usuário autenticado pode gerar um token válido (via `createInvite` na própria clínica)
e então chamar esta rota com `to`/`clinicName`/`role` arbitrários — enviando e-mail
pelo domínio verificado `lensyscare.com.br` para qualquer vítima, com nome de clínica e
função forjados (vetor de phishing + inconsistência de dados: o e-mail diz "Clínica B"
mas o token vincula à Clínica A).

**Correção sugerida:** buscar o `Invite` pelo token e derivar `to = invite.email`,
`clinicName = invite.clinic.name`, `role = invite.role`. Ignorar esses campos do corpo.

---

### 🟡 L-1 — `exams/[id]` depende exclusivamente de RLS (defesa-em-profundidade)

**Arquivo:** `apps/web/app/api/exams/[id]/route.ts` (PATCH e DELETE)

Diferente de `patients`/`exams POST` (que validam `clinic_id` via Prisma), o handler usa
o client Supabase anon com `.eq('id', params.id)` **sem checar tenant explicitamente**.
Hoje está protegido pela RLS de `exams` (correta). Porém viola o princípio da CLAUDE.md
("UI/RLS nunca é a única proteção; valide explicitamente na borda"): se uma migration
futura alterar/remover a RLS de `exams`, isto vira escrita cross-tenant silenciosa.

**Correção sugerida:** carregar o exame via Prisma validando
`exam.patient.clinic_id === callerClinicId` antes do update/delete (belt-and-suspenders).

---

### 🟡 L-2 — `PATCH /api/exams/[id]` sem guard `performed_by` para OPTOMETRIST

**Arquivo:** `apps/web/app/api/exams/[id]/route.ts:16-27` (PATCH)

O `DELETE` restringe OPTOMETRIST a exames que ele mesmo realizou
(`performed_by === userId`, linhas 117-131), mas o `PATCH` permite que qualquer
não-RECEPTIONIST edite qualquer exame da clínica. Inconsistência no modelo de papéis
(dentro da mesma clínica — não é cross-tenant). Pode ser intencional; confirmar regra
de negócio.

---

### 🟡 L-3 — `invites/accept` usa `listUsers()` sem paginação

**Arquivo:** `apps/web/app/api/invites/accept/route.ts:70-73`

`supabaseAdmin.auth.admin.listUsers()` retorna apenas a primeira página (padrão 50
usuários). Conforme a base de usuários Auth cresce, um convidado cujo usuário esteja além
da página 1 não será encontrado → o fluxo tenta `createUser` com e-mail já existente →
`AUTH_CREATION_FAILED`. Bug de correção/escalabilidade do fluxo de convite (não é
segurança), mas quebra convites silenciosamente com o crescimento da plataforma.

**Correção sugerida:** usar busca paginada/filtrada por e-mail
(`generateLink`/`getUserByEmail`-equivalente) em vez de listar todos.

---

### ℹ️ I-1 — Middleware redireciona chamadas de API não autenticadas para `/login`

**Arquivo:** `apps/web/lib/supabase/middleware.ts:85-91`

Rotas de API protegidas, quando não autenticadas, recebem um redirect 307 para `/login`
(HTML) em vez de um `401 JSON`. Acesso continua bloqueado (não é falha de segurança), mas
clientes de API recebem resposta inesperada. Considerar retornar 401 para paths `/api/*`.

---

## Priorização sugerida

1. **M-2** (`invites/send`) — correção pequena e de baixo risco; fecha vetor de phishing.
2. **M-1** (messaging) — exige decisão de produto (validar destinatário vs. rate limit).
3. **L-1** (exams defesa-em-profundidade) — hardening alinhado à CLAUDE.md.
4. **L-3** (paginação de convites) — correção antes de a base de usuários crescer.
5. **L-2 / I-1** — confirmar regra de negócio / melhoria menor.
