# Agenda de Consultas — Design (MVP)

**Data:** 2026-08-01
**Status:** Aprovado para planejamento
**Autor:** brainstorming (Claude) + product owner

## Contexto

O Lensys Care hoje cobre cadastro de pacientes, exames/refração, histórico e
impressão de receituário, mas **não tem agendamento**. A secretária da clínica
(papel `RECEPTIONIST`) precisa de uma ferramenta para marcar e acompanhar as
consultas do dia — e essa será, provavelmente, a tela que ela mais usa.

Não existe nenhum modelo de agendamento no schema. `Patient` já possui `phone` e
`email` (úteis para lembretes numa fase futura). Twilio (SMS/WhatsApp) já está
previsto na stack, mas **não** entra neste MVP.

## Objetivo

Entregar uma **Agenda** funcional que permita à secretária, no dia a dia:

1. Ver as consultas de um dia, ordenadas por horário.
2. Navegar entre datas (ontem/hoje/amanhã + seletor de data).
3. Criar uma nova consulta para um paciente existente.
4. Marcar a consulta como **Compareceu** ou **Cancelada**.
5. Já deixar a primeira consulta agendada no momento do cadastro do paciente.

Valor: substituir a agenda de papel/planilha por um fluxo integrado ao prontuário,
com o mínimo de atrito para a recepção.

## Decisões de produto (tomadas no brainstorming)

| Tema | Decisão |
|------|---------|
| Superfície principal | Página **Agenda** (hub) **+** agendar no cadastro de paciente |
| Profissionais | **Agenda única** da clínica no MVP; `professional_id` guardado (opcional) para evoluir depois |
| Status da consulta | **Mínimo:** `AGENDADO` → `COMPARECEU` / `CANCELADO` |
| Lembretes automáticos | **Fora do MVP** (fase 2: Twilio + pgcron) |
| Visão da agenda | **Dia em lista** + navegação por datas; hora digitada livremente |
| Campos da consulta | **Mínimo:** paciente + data/hora + status (sem tipo/observação) |
| Arquitetura | **Server Actions** + module-pattern (`lib/appointments/`) |

## Modelo de dados

Novo enum e modelo no Prisma (`packages/db/prisma/schema.prisma`) e migration SQL
`supabase/migrations/009_add_appointments.sql`, espelhando o padrão de RLS das
migrations existentes (002, 006).

```prisma
enum AppointmentStatus {
  SCHEDULED
  ATTENDED
  CANCELED

  @@map("appointment_status")
}

model Appointment {
  id              String            @id @default(uuid()) @db.Uuid
  clinic_id       String            @db.Uuid            // tenant (RLS)
  patient_id      String            @db.Uuid
  professional_id String?           @db.Uuid           // NULLABLE — reservado p/ futuro, não exposto na UI
  scheduled_at    DateTime          @db.Timestamptz    // data + hora da consulta
  status          AppointmentStatus @default(SCHEDULED)
  created_by      String            @db.Uuid           // Profile que criou
  created_at      DateTime          @default(now()) @db.Timestamptz
  updated_at      DateTime          @updatedAt @db.Timestamptz

  clinic       Clinic   @relation(fields: [clinic_id], references: [id], onDelete: Cascade)
  patient      Patient  @relation(fields: [patient_id], references: [id], onDelete: Cascade)
  professional Profile? @relation(fields: [professional_id], references: [id])

  @@index([clinic_id, scheduled_at])
  @@index([patient_id])
  @@map("appointments")
}
```

- `Patient` e `Clinic` ganham a relação `appointments Appointment[]`.
- `Profile` ganha a relação inversa opcional (ex.: `appointments Appointment[]`) para
  `professional_id` — decisão fina fica para o plano de implementação.

### Migration `009_add_appointments.sql`

- Cria o tipo `appointment_status`.
- Cria a tabela `appointments` com FKs (`patient_id`/`clinic_id` com `ON DELETE CASCADE`).
- Habilita RLS e cria políticas `SELECT`/`INSERT`/`UPDATE` restritas ao `clinic_id`
  do profile logado — **mesmo padrão** das políticas de `patients` (migration 002).
- Índices: `(clinic_id, scheduled_at)` e `(patient_id)`.

> O projeto usa SQL direto no Supabase (não `prisma migrate dev`). O schema Prisma é
> atualizado para refletir a tabela; a fonte de verdade da migração é o arquivo SQL.

## Camada de domínio — `apps/web/lib/appointments/`

Segue o padrão obrigatório do `docs/module-pattern.md` (separação por domínio):

- **`appointments-data.ts`** — acesso a dados via Prisma:
  - `getAppointmentsByDate(clinicId, date)` → consultas do dia, ordenadas por `scheduled_at`.
  - `createAppointment({ clinicId, patientId, scheduledAt, createdBy })`.
  - `setAppointmentStatus({ clinicId, appointmentId, status })`.
  - **Toda função valida `clinicId`/ownership explicitamente na borda.** O paciente
    referenciado precisa pertencer à clínica; a consulta precisa ser da clínica antes
    de sofrer update. Prisma direto **não** é RLS garantido — a validação é explícita.
- **`appointments-mappers.ts`** — linha persistida ↔ shape de UI (hora formatada
  `HH:mm`, nome do paciente, flags de UI por status).
- **`appointments-normalizers.ts`** — funções puras, sem side effects:
  - combinar `date` (`YYYY-MM-DD`) + `time` (`HH:mm`) → `Date`/timestamptz (fuso
    `America/Sao_Paulo`);
  - validar campos obrigatórios (paciente, data, hora) e formato de hora.
- **`appointments-config.ts`** — `APPOINTMENT_STATUS_CONFIG` data-driven: label PT-BR,
  variante de badge/cor e quais ações cada status habilita (ex.: `SCHEDULED` mostra
  "Compareceu" e "Cancelar"; `ATTENDED`/`CANCELED` são terminais e apenas exibidos).

## Server Actions — `apps/web/app/(dashboard)/agenda/actions.ts`

`'use server'`, estado tipado `{ status: 'idle' | 'success' | 'error', message?: string }`,
seguindo o padrão de `apps/web/app/(dashboard)/planos/actions.ts`. Auth via
`createClient()`, resolução da clínica do usuário logado.

- `createAppointment(prevState, formData)` — valida auth, resolve `clinicId`, confere
  que `patientId` pertence à clínica, valida `scheduledAt`; cria e revalida a rota.
- `setAppointmentStatus(prevState, formData)` — valida que a consulta pertence à
  clínica antes de aplicar `ATTENDED`/`CANCELED`; revalida a rota.

## Página `/agenda` + componentes

Rota nova em `apps/web/app/(dashboard)/agenda/`.

- **`page.tsx`** (server component) — resolve auth/clínica, lê `?date=` (default: hoje),
  chama `getAppointmentsByDate`, aplica mappers e compõe os componentes visuais.
  Páginas compõem, não concentram lógica.
- **`AgendaDayView.tsx`** (client component) — cabeçalho com navegação
  `< ontem | Hoje | amanhã >` + seletor de data (`input[type=date]`); lista de consultas
  do dia ordenada por hora. Cada linha: hora · nome do paciente · badge de status ·
  ações **[Compareceu] [Cancelar]** (chamam `setAppointmentStatus`). Botão
  **[+ Nova consulta]** abre o diálogo. Estado de dia vazio bem tratado.
- **`NewAppointmentDialog.tsx`** (client component) — busca de paciente existente
  (reaproveita a busca ILIKE/pg_trgm já indexada em pacientes — migration 008),
  campos data + hora, submit via `createAppointment`. Se o paciente não existir, oferece
  link para **Cadastrar novo** (`/patients/new`).

Componentes visuais recebem dados por props; nada de componente gigante.

## Integração no Cadastro de Paciente

No `PatientForm` (`apps/web/components/patients/PatientForm.tsx`), **somente no modo
`create`**: seção opcional recolhível **"Agendar primeira consulta"** com checkbox +
campos data + hora.

Fluxo ao salvar:

1. Cria o paciente pelo fluxo atual (`POST /api/patients`), recebendo `patient.id`.
2. Se "Agendar primeira consulta" estiver marcado e válido, chama a server action
   `createAppointment` com o `patient.id` recém-criado.
3. Redireciona (para a ficha do paciente, mantendo o comportamento atual; a consulta
   aparecerá na Agenda daquele dia).

Se a criação da consulta falhar após o paciente já existir, o paciente **não** é
desfeito — exibir aviso não bloqueante ("Paciente cadastrado, mas não foi possível
agendar; tente pela Agenda"). O detalhe de UX do erro fica para o plano.

## Navegação e papéis

- Novo item **"Agenda"** em `apps/web/lib/navigation/nav-items.ts`
  (`SIDEBAR_NAV_ITEMS`), posicionado **logo após "Painel Geral"**.
- **Os três papéis** (`OWNER`, `OPTOMETRIST`, `RECEPTIONIST`) podem ver e gerir a
  agenda.
- ⚠️ **Diferente dos exames** (onde `RECEPTIONIST` é bloqueada), a `RECEPTIONIST`
  **PODE** criar e mudar status de consultas — é a ferramenta principal dela. A
  segurança vem da **validação de tenant na borda**, não de guard de papel.

## Decisões de borda

- **Horários sobrepostos permitidos** — sem bloqueio de conflito no MVP.
- **Consulta cancelada continua visível** no dia (riscada/acinzentada), para registro.
- **Datas passadas navegáveis** (histórico); status ainda editável.
- **Fuso:** `scheduled_at` como `timestamptz`; combinação data+hora assume
  `America/Sao_Paulo`.
- **Exclusão de paciente** → cascata remove as consultas dele.

## Testes

- **Vitest (`apps/web/__tests__`)**:
  - `appointments-normalizers` — combinar data+hora, validações, formato de hora.
  - `appointments-mappers` — formatação `HH:mm`, ordenação por horário.
  - `appointments-config` — ações habilitadas por status.
  - helper de navegação de datas (ontem/amanhã/hoje).
- **Cypress (`cypress/e2e`)**:
  - criar consulta pela Agenda;
  - marcar "Compareceu"; cancelar;
  - navegar entre datas;
  - agendar durante o cadastro de paciente.
  - Preservar `data-cy` em todos os fluxos.

## Fora de escopo (fase 2+)

Explicitamente **não** entram neste MVP:

- Lembrete automático por WhatsApp/SMS (Twilio + pgcron, templates, opt-out).
- Colunas/agenda por profissional (o campo `professional_id` já fica reservado).
- Tipo de consulta (Primeira/Retorno/Exame) e observação por consulta.
- Status `CONFIRMADO` e `FALTOU` separados; motivo de cancelamento.
- Bloqueio de conflito de horário, duração/slots fixos.
- Recorrência, lista de espera, grade semanal.

## Critérios de aceite (MVP)

1. Item "Agenda" aparece no menu e abre a lista do dia atual.
2. Secretária cria consulta para paciente existente e ela aparece no dia/horário certo.
3. Navegação de datas funciona (ontem/hoje/amanhã + seletor).
4. Marcar "Compareceu" e "Cancelar" persiste e reflete na tela.
5. Cadastro de paciente com "Agendar primeira consulta" cria paciente + consulta.
6. Toda operação valida `clinicId`/ownership; nenhum id aceito sem validação de tenant.
7. Testes unitários (normalizers/mappers/config) e E2E dos fluxos acima passam.
