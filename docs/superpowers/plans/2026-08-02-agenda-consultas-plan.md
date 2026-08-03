# Plano de Implementação — Agenda de Consultas + Indicantes (MVP)

**Data:** 2026-08-02
**Spec:** `docs/superpowers/specs/2026-08-01-agenda-consultas-design.md`
**Branch:** `feat/agenda-consultas`

Plano em fases ordenadas. Cada fase é **verificável isoladamente** (testes/type-check/build)
e deixa o repositório em estado consistente. Ordem: dados → domínio puro → domínio de
acesso → actions → UI. Segue `docs/module-pattern.md` e a regra inegociável de validar
`clinicId`/ownership na borda.

Convenções do projeto:
- Migrations são **SQL direto no Supabase** (`supabase/migrations/`), não `prisma migrate dev`.
  Aplicar via **MCP do Supabase** (`apply_migration`), não pelo SQL editor à mão.
- Prisma Client: `pnpm db:generate` (= `pnpm --filter db run generate`).
- Testes unitários: `pnpm --filter web test`. Type-check: `pnpm --filter web type-check`.

---

## Fase 0 — Schema Prisma + Migration SQL ✅ CONCLUÍDA (02/08/2026)

Migration `009` aplicada no Supabase via MCP (`apply_migration`, versão
`add_appointments_and_referrers`); Prisma Client regenerado; `type-check` verde;
advisors de segurança sem achados novos.


**Objetivo:** criar as tabelas `referrers` e `appointments` (com enum, RLS e índices) e
refletir no schema Prisma.

**Arquivos:**
- `packages/db/prisma/schema.prisma` — adicionar `enum AppointmentStatus`, `model Appointment`,
  `model Referrer`; adicionar relações inversas em `Clinic` (`appointments`, `referrers`),
  `Patient` (`appointments`) e `Profile` (`appointments` opcional para `professional_id`).
- `supabase/migrations/009_add_appointments_and_referrers.sql` — novo.

**Passos:**
1. Escrever o SQL na ordem: `CREATE TYPE appointment_status` → tabela `referrers` →
   tabela `appointments` (FK `referrer_id` depende de `referrers`).
   - `appointments`: `clinic_id`, `patient_id`, `professional_id NULL`, `referrer_id NULL`,
     `referral_paid_at timestamptz NULL`, `appointment_date date NOT NULL`,
     `scheduled_time time NULL`, `status appointment_status DEFAULT 'SCHEDULED'`,
     `created_by`, `created_at`, `updated_at`.
   - FKs: `patient_id`/`clinic_id` `ON DELETE CASCADE`; `referrer_id` `ON DELETE SET NULL`.
2. Habilitar RLS e criar políticas `SELECT`/`INSERT`/`UPDATE` (e `DELETE` em `referrers`)
   restritas ao `clinic_id` do profile logado — **copiar o padrão exato das políticas de
   `patients` na migration `002_rls_policies.sql`**.
3. Índices: `appointments(clinic_id, appointment_date)`, `appointments(patient_id)`,
   `appointments(referrer_id)`, `referrers(clinic_id)`, e o índice parcial de pendentes
   `appointments (clinic_id, referrer_id) WHERE status='ATTENDED' AND referrer_id IS NOT NULL AND referral_paid_at IS NULL`.
4. Refletir tudo no `schema.prisma` (usar exatamente os tipos do spec).
5. Aplicar a migration no Supabase via MCP (`mcp__supabase__apply_migration`).
6. `pnpm db:generate`.

**Verificação:**
- `pnpm --filter db prisma validate` sem erros.
- `pnpm --filter web type-check` (o Prisma Client já conhece os novos tipos).

---

## Fase 1 — Domínio `lib/appointments/` (puro + acesso) ✅ CONCLUÍDA (02/08/2026)

Entregue com um teste a mais que o previsto: `appointments-data-ownership.test.ts`
(prisma mockado) cobrindo a validação de tenant na borda. Helpers de fuso/navegação de
datas (`todayAppointmentDate`, `shiftAppointmentDate`) já ficaram nos normalizers para a
Fase 4.


**Objetivo:** lógica de consultas isolada e testada.

**Arquivos (novos):**
- `apps/web/lib/appointments/appointments-normalizers.ts`
- `apps/web/lib/appointments/appointments-config.ts`
- `apps/web/lib/appointments/appointments-mappers.ts`
- `apps/web/lib/appointments/appointments-data.ts`
- Testes: `apps/web/__tests__/appointments-normalizers.test.ts`,
  `appointments-mappers.test.ts`, `appointments-config.test.ts`.

**Passos:**
1. **normalizers** (TDD — escrever teste primeiro): validar `date` obrigatória e `time`
   opcional (formato `HH:mm` quando presente); helper `queuePositions(appointments)` que
   numera os itens sem hora por `created_at`. `REFERRAL_FEE_CENTS = 1000` mora aqui ou em
   `appointments-config.ts` (constante reservada, ainda não exibida).
2. **config**: `APPOINTMENT_STATUS_CONFIG` (label PT-BR, variante de badge, ações por
   status: `SCHEDULED` → [Compareceu, Cancelar]; `ATTENDED`/`CANCELED` terminais).
3. **mappers**: linha persistida → shape de UI (rótulo `HH:mm` **ou** `#N` da fila, nome
   do paciente, nome do indicante, flags de status); ordenação
   `scheduled_time ASC NULLS LAST, created_at ASC`.
4. **data** (valida `clinicId` na borda em toda função):
   - `getAppointmentsByDate(clinicId, date)` — inclui `patient` e `referrer` (nomes).
   - `createAppointment({ clinicId, patientId, date, time?, createdBy, referrerId? })` —
     confere que `patientId` e `referrerId` (se houver) são da clínica.
   - `setAppointmentStatus({ clinicId, appointmentId, status })` — confere tenant antes.

**Verificação:** `pnpm --filter web test` (normalizers/mappers/config verdes);
`type-check`.

---

## Fase 2 — Domínio `lib/referrers/` ✅ CONCLUÍDA (02/08/2026)

`referrers-mappers.ts` (opcional no plano) entrou: a Fase 5 precisa das linhas com
contador e o dropdown da Fase 4 precisa das opções. Ownership coberto por
`referrers-data-ownership.test.ts`.


**Objetivo:** cadastro de indicantes + contador de pendentes + marcar pago.

**Arquivos (novos):**
- `apps/web/lib/referrers/referrers-normalizers.ts`
- `apps/web/lib/referrers/referrers-data.ts`
- (opcional) `referrers-mappers.ts` / `referrers-config.ts` se a UI pedir.
- Testes: `apps/web/__tests__/referrers-normalizers.test.ts`; teste do predicado de
  "indicação pendente" (`ATTENDED` + `referrer_id` + `referral_paid_at IS NULL`) como
  helper puro.

**Passos:**
1. **normalizers**: validar `name` (obrigatório), `pixKey`/`whatsapp` (opcionais, formato
   leve). Helper puro `isPendingReferral(appointment)` para testar a regra sem tocar no DB.
2. **data** (valida `clinicId` na borda):
   - `listReferrers(clinicId, { activeOnly? })`,
   - `listReferrersWithPendingCount(clinicId)` (agrega a contagem de pendentes),
   - `createReferrer`, `updateReferrer`, `setReferrerActive`,
   - `markReferralsPaid({ clinicId, referrerId })` → `UPDATE ... SET referral_paid_at = now()`
     em todas as pendentes daquele indicante (transação; revalida contagem).

**Verificação:** `pnpm --filter web test`; `type-check`.

---

## Fase 3 — Server Actions ✅ CONCLUÍDA (02/08/2026)

Ajustes em relação ao previsto:
- O arquivo de referência é `apps/web/app/dashboard/planos/actions.ts` (não
  `(dashboard)/planos/`) e `apps/web/app/(dashboard)/account/actions.ts`.
- Auth extraída para `apps/web/lib/auth/authenticated-profile.ts`, usada pelos dois
  arquivos de actions.
- `apps/web/vitest.config.ts` criado: sem o alias `@`, um import não mockado quebrava
  o teste (o suite antigo só passava porque mockava todos os `@/`).
- Testes de action (`agenda-actions.test.ts`, `referrers-actions.test.ts`) provam que
  `clinic_id`/`created_by` vêm da sessão mesmo quando o formulário tenta injetá-los.


**Objetivo:** mutações via `'use server'`, estado tipado, auth + tenant na borda.

**Arquivos (novos):**
- `apps/web/app/(dashboard)/agenda/actions.ts` — `createAppointment`, `setAppointmentStatus`.
- `apps/web/app/(dashboard)/patients/referrers-actions.ts` — `createReferrer`,
  `updateReferrer`, `setReferrerActive`, `markReferralsPaid`.

**Passos:**
1. Copiar o padrão de `apps/web/app/(dashboard)/planos/actions.ts` (state
   `{ status, message }`, `createClient()`, resolução da clínica do usuário).
2. Cada action: valida auth → resolve `clinicId` → chama a função de `-data` correspondente
   → `revalidatePath` da rota afetada (`/agenda`, `/patients`).
3. `createAppointment`: exige `date`, aceita `time` opcional, `referrerId` opcional.

**Verificação:** `pnpm --filter web type-check` e `lint`.

---

## Fase 4 — Página `/agenda` + componentes + navegação ✅ CONCLUÍDA (02/08/2026)

Extras em relação ao plano:
- `lib/appointments/agenda-navigation.ts` (+ teste): `resolveAgendaDate` (query inválida
  cai para hoje), hrefs de ontem/hoje/amanhã e rótulo PT-BR formatado em UTC.
- `lib/patients/patient-search.ts` + server action `searchPatients` — não existia
  endpoint de busca de pacientes; a busca do diálogo passa pela action (tenant da sessão).
- Componentes: `AgendaDayView`, `AgendaAppointmentRow`, `NewAppointmentDialog`.

⚠️ **Verificação manual pendente:** sem credenciais E2E locais só deu para confirmar que
`/agenda` responde 307 → `/login` (rota registrada, middleware protegendo). Criar
consulta com/sem hora, Compareceu, Cancelar e navegação de datas ainda precisam de um
teste logado (Fase 7 / manual).


**Objetivo:** a tela principal da secretária.

**Arquivos:**
- `apps/web/app/(dashboard)/agenda/page.tsx` (server) — novo.
- `apps/web/components/agenda/AgendaDayView.tsx` (client) — novo.
- `apps/web/components/agenda/NewAppointmentDialog.tsx` (client) — novo.
- `apps/web/lib/navigation/nav-items.ts` — adicionar item **"Agenda"** após "Painel Geral".

**Passos:**
1. `page.tsx`: resolve auth/clínica, lê `?date=` (default hoje), chama
   `getAppointmentsByDate`, aplica mappers, compõe.
2. `AgendaDayView`: navegação `< ontem | Hoje | amanhã >` + `input[type=date]`; **lista
   única** (com hora primeiro, depois fila `#N`); cada linha com ações
   `[Compareceu]`/`[Cancelar]` (server action); botão `[+ Nova consulta]`; estado vazio.
3. `NewAppointmentDialog`: busca de paciente (reaproveita ILIKE/pg_trgm, migration 008),
   **data obrigatória + hora opcional**, dropdown opcional de indicante
   (`listReferrers activeOnly`), link "Cadastrar novo" se não achar paciente.
4. Preservar `data-cy` em campos e ações.

**Verificação:** `pnpm --filter web build`; rodar app e conferir criar (com/sem hora),
Compareceu, Cancelar, navegar datas.

---

## Fase 5 — Aba Indicantes em Pacientes ✅ CONCLUÍDA (02/08/2026)

Abas via URL (`/patients?tab=indicantes`, config em `lib/patients/patients-tabs.ts`, com
teste) para sobreviver ao refresh das server actions. A lista de pacientes ficou intacta
na primeira aba; os indicantes só são consultados quando a aba está aberta.


**Objetivo:** mini-cadastro de indicantes e o fluxo de pagamento simples.

**Arquivos:**
- `apps/web/app/(dashboard)/patients/page.tsx` — introduzir abas `Pacientes | Indicantes`
  (manter a lista de pacientes atual intacta na primeira aba).
- `apps/web/components/referrers/ReferrersTab.tsx`, `ReferrerForm.tsx`,
  `ReferrerRow.tsx` (ou equivalente) — novos.

**Passos:**
1. Aba **Indicantes**: lista via `listReferrersWithPendingCount`; cada linha mostra
   nome · **indicações pendentes (N)** · `[Pagar]` · ativo/inativo.
2. Mini-form: `name` (obrigatório), `pixKey`, `whatsapp` (opcionais); criar/editar;
   ativar/desativar (sem exclusão dura).
3. Fluxo **Pagar**: se `N > 0`, `[Pagar]` revela a **chave PIX** + `[Marcar pago]` →
   `markReferralsPaid` → contador zera. Sem valores em R$.
4. Preservar `data-cy`.

**Verificação:** `build`; rodar app: cadastrar indicante, gerar pendência (marcar uma
consulta como Compareceu), Pagar → PIX → Marcar pago → contador zera.

---

## Fase 6 — Integração no cadastro de paciente ✅ CONCLUÍDA (02/08/2026)

Se a consulta falhar depois do paciente criado, o formulário **não** redireciona e **não**
permite reenviar: mostra aviso âmbar com o motivo + botões "Ir para a ficha" e "Abrir a
Agenda", evitando cadastro duplicado.


**Objetivo:** "já cadastro e deixo agendado".

**Arquivos:**
- `apps/web/components/patients/PatientForm.tsx` — só no modo `create`.

**Passos:**
1. Seção recolhível **"Agendar primeira consulta"**: checkbox + **data** (obrigatória se
   marcado) + **hora opcional** + dropdown opcional de indicante.
2. No submit: cria o paciente (fluxo atual `POST /api/patients`) → se marcado e válido,
   chama `createAppointment` com o `patient.id` (e `referrerId`, se houver) → redireciona.
3. Se a consulta falhar após o paciente já existir: aviso não bloqueante, sem desfazer o
   paciente.
4. Preservar `data-cy`.

**Verificação:** `build`; rodar app: cadastrar paciente com agendamento (com e sem hora).

---

## Fase 7 — E2E, documentação e fechamento ⚠️ PARCIAL (02/08/2026)

`cypress/e2e/clinical/agenda.cy.ts` escrito (5 cenários: hora vs fila, Compareceu,
navegação de datas, agendar no cadastro, indicante → contador → Pagar → Marcar pago) e
`CLAUDE.md` atualizado. **Não executado:** não há `cypress.env.json` nem `E2E_*` nesta
máquina, então o spec nunca rodou — precisa de credenciais de teste.


**Arquivos:**
- `cypress/e2e/clinical/agenda.cy.ts` (ou similar) — novo.
- `CLAUDE.md` — atualizar tabela de migrations (009) e o Modelo de dados (Appointment,
  Referrer).

**Passos:**
1. Cypress: criar consulta **com** e **sem** hora (verificar fila `#N` e ordenação);
   com/sem indicante; Compareceu; Cancelar; navegar datas; agendar no cadastro; cadastrar
   indicante e selecioná-lo; fluxo Pagar → Marcar pago → contador zera.
2. Atualizar `CLAUDE.md`.
3. Fechamento: `pnpm --filter web test` + `type-check` + `lint` + `build` verdes;
   `pnpm cypress` dos fluxos novos.

---

## Ordem de PRs sugerida

- **PR A:** Fase 0 (schema + migration) — revisável isoladamente (mudança de dados).
- **PR B:** Fases 1–3 (domínio + actions) — sem UI, coberto por testes.
- **PR C:** Fases 4–6 (UI: Agenda, Indicantes, integração no cadastro).
- **PR D:** Fase 7 (E2E + docs).

(Alternativa: um único PR `feat/agenda-consultas` com commits por fase, se preferir revisar
tudo junto.)

## Riscos / pontos de atenção

- **RLS:** copiar fielmente o padrão de `patients` (migration 002); testar que um usuário
  de outra clínica não enxerga consultas/indicantes.
- **Fila derivada:** a posição `#N` é calculada na leitura; garantir que cancelada sai da
  numeração e que a ordenação `NULLS LAST` está correta no Prisma (usar `orderBy` com
  `nulls: 'last'`).
- **Fuso:** `scheduled_time` como `TIME` local; não aplicar conversão de fuso ao exibir.
- **`markReferralsPaid`:** rodar em transação e revalidar a contagem para evitar corrida
  entre "marcar Compareceu" e "Marcar pago".
