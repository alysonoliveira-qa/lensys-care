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
6. Registrar o **indicante ("correta")** que trouxe o paciente e acompanhar, por um
   **contador simples de indicações pendentes**, quem a clínica precisa gratificar
   (R$10 por consulta comparecida) — com botão **Pagar** (mostra PIX) e **Marcar pago**,
   sem lidar com valores monetários no sistema ainda.

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
| Indicantes ("corretas") | Mini-cadastro (nome + chave PIX + WhatsApp); consulta liga a **um indicante opcional** via dropdown |
| Pagamento da indicação | **R$10 por consulta, devido quando a consulta é COMPARECEU** (elo fica na consulta) |
| Controle de pagamento (MVP) | **Contador simples** de indicações pendentes por indicante + botão **Pagar** (mostra PIX) → **Marcar pago** zera as pendentes. **Sem valores monetários** no sistema ainda |
| Valores/financeiro | **Fora do MVP** — escrutínio de valores (R$) e conciliação entram junto do **módulo financeiro** futuro |
| Cadastro de indicantes | **Aba dentro de Pacientes** (`Pacientes | Indicantes`) |
| Arquitetura | **Server Actions** + module-pattern (`lib/appointments/`, `lib/referrers/`) |

## Modelo de dados

Novos enum e modelos no Prisma (`packages/db/prisma/schema.prisma`) e migration SQL
`supabase/migrations/009_add_appointments_and_referrers.sql`, espelhando o padrão de
RLS das migrations existentes (002, 006).

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
  referrer_id     String?           @db.Uuid           // NULLABLE — indicante ("correta"), opcional
  referral_paid_at DateTime?        @db.Timestamptz    // quando a indicação foi paga ao indicante (NULL = pendente)
  scheduled_at    DateTime          @db.Timestamptz    // data + hora da consulta
  status          AppointmentStatus @default(SCHEDULED)
  created_by      String            @db.Uuid           // Profile que criou
  created_at      DateTime          @default(now()) @db.Timestamptz
  updated_at      DateTime          @updatedAt @db.Timestamptz

  clinic       Clinic    @relation(fields: [clinic_id], references: [id], onDelete: Cascade)
  patient      Patient   @relation(fields: [patient_id], references: [id], onDelete: Cascade)
  professional Profile?  @relation(fields: [professional_id], references: [id])
  referrer     Referrer? @relation(fields: [referrer_id], references: [id], onDelete: SetNull)

  @@index([clinic_id, scheduled_at])
  @@index([patient_id])
  @@index([referrer_id])
  @@map("appointments")
}

// Indicante ("correta") — pessoa que leva pacientes à clínica e é gratificada
model Referrer {
  id         String   @id @default(uuid()) @db.Uuid
  clinic_id  String   @db.Uuid            // tenant (RLS)
  name       String
  pix_key    String?                      // chave PIX para o pagamento
  whatsapp   String?                      // telefone/WhatsApp de contato
  active     Boolean  @default(true)      // desativar sem apagar histórico
  created_at DateTime @default(now()) @db.Timestamptz
  updated_at DateTime @updatedAt @db.Timestamptz

  clinic       Clinic        @relation(fields: [clinic_id], references: [id], onDelete: Cascade)
  appointments Appointment[]

  @@index([clinic_id])
  @@map("referrers")
}
```

- `Patient` e `Clinic` ganham a relação `appointments Appointment[]`.
- `Clinic` também ganha `referrers Referrer[]`.
- `Profile` ganha a relação inversa opcional (ex.: `appointments Appointment[]`) para
  `professional_id` — decisão fina fica para o plano de implementação.
- `referrer_id` usa `ON DELETE SET NULL`: desligar/limpar um indicante **não** apaga a
  consulta, apenas remove o elo. Em geral prefira `active = false` a apagar.
- `referral_paid_at` guarda **quando** a indicação foi paga (NULL = pendente). É a marca
  auditável que o contador usa e que o módulo financeiro futuro reaproveita — **sem
  armazenar valor em R$** por enquanto (o valor é uma constante da aplicação).

### Migration `009_add_appointments_and_referrers.sql`

- Cria o tipo `appointment_status`.
- Cria a tabela `referrers` **antes** de `appointments` (dependência da FK `referrer_id`).
- Cria a tabela `appointments` com FKs: `patient_id`/`clinic_id` com `ON DELETE CASCADE`,
  `referrer_id` com `ON DELETE SET NULL`.
- Habilita RLS e cria políticas `SELECT`/`INSERT`/`UPDATE` (e `DELETE` em `referrers`)
  restritas ao `clinic_id` do profile logado — **mesmo padrão** das políticas de
  `patients` (migration 002).
- Adiciona `appointments.referral_paid_at timestamptz NULL` (marca de pagamento).
- Índices: `appointments(clinic_id, scheduled_at)`, `appointments(patient_id)`,
  `appointments(referrer_id)`, `referrers(clinic_id)`. Considerar índice parcial para
  acelerar a contagem de pendentes (ex.: `WHERE status = 'ATTENDED' AND referrer_id IS
  NOT NULL AND referral_paid_at IS NULL`) — decisão fina no plano.

> O projeto usa SQL direto no Supabase (não `prisma migrate dev`). O schema Prisma é
> atualizado para refletir as tabelas; a fonte de verdade da migração é o arquivo SQL.

## Camada de domínio — `apps/web/lib/appointments/`

Segue o padrão obrigatório do `docs/module-pattern.md` (separação por domínio):

- **`appointments-data.ts`** — acesso a dados via Prisma:
  - `getAppointmentsByDate(clinicId, date)` → consultas do dia (com nome do paciente e
    do indicante, se houver), ordenadas por `scheduled_at`.
  - `createAppointment({ clinicId, patientId, scheduledAt, createdBy, referrerId? })`.
  - `setAppointmentStatus({ clinicId, appointmentId, status })`.
  - **Toda função valida `clinicId`/ownership explicitamente na borda.** O paciente e o
    indicante (quando informado) precisam pertencer à clínica; a consulta precisa ser da
    clínica antes de sofrer update. Prisma direto **não** é RLS garantido — validação
    explícita.
- **`appointments-mappers.ts`** — linha persistida ↔ shape de UI (hora formatada
  `HH:mm`, nome do paciente, nome do indicante, flags de UI por status).
- **`appointments-normalizers.ts`** — funções puras, sem side effects:
  - combinar `date` (`YYYY-MM-DD`) + `time` (`HH:mm`) → `Date`/timestamptz (fuso
    `America/Sao_Paulo`);
  - validar campos obrigatórios (paciente, data, hora) e formato de hora.
- **`appointments-config.ts`** — `APPOINTMENT_STATUS_CONFIG` data-driven: label PT-BR,
  variante de badge/cor e quais ações cada status habilita (ex.: `SCHEDULED` mostra
  "Compareceu" e "Cancelar"; `ATTENDED`/`CANCELED` são terminais e apenas exibidos).

### Camada de domínio — `apps/web/lib/referrers/`

- **`referrers-data.ts`** — `listReferrers(clinicId, { activeOnly? })`,
  `createReferrer({ clinicId, name, pixKey?, whatsapp? })`,
  `updateReferrer({ clinicId, referrerId, ... })`,
  `setReferrerActive({ clinicId, referrerId, active })`,
  `listReferrersWithPendingCount(clinicId)` → cada indicante com a **contagem de
  indicações pendentes** (consultas `ATTENDED`, com `referrer_id`, `referral_paid_at IS
  NULL`), e `markReferralsPaid({ clinicId, referrerId })` → carimba `referral_paid_at =
  now()` em **todas** as pendentes daquele indicante (zera o contador). **Toda função
  valida `clinicId`/ownership na borda.**
- **`referrers-normalizers.ts`** — funções puras: validar/normalizar nome (obrigatório),
  chave PIX e WhatsApp (formatos leves; ambos opcionais).
- **`referrers-mappers.ts` / `referrers-config.ts`** — se necessário para a lista e o
  dropdown (rótulos, ordenação por nome). Manter mínimo.

## Server Actions

`'use server'`, estado tipado `{ status: 'idle' | 'success' | 'error', message?: string }`,
seguindo o padrão de `apps/web/app/(dashboard)/planos/actions.ts`. Auth via
`createClient()`, resolução da clínica do usuário logado.

**Agenda — `apps/web/app/(dashboard)/agenda/actions.ts`:**

- `createAppointment(prevState, formData)` — valida auth, resolve `clinicId`, confere
  que `patientId` (e `referrerId`, se enviado) pertencem à clínica, valida `scheduledAt`;
  cria e revalida a rota.
- `setAppointmentStatus(prevState, formData)` — valida que a consulta pertence à
  clínica antes de aplicar `ATTENDED`/`CANCELED`; revalida a rota.

**Indicantes — actions do domínio de pacientes/indicantes** (ex.:
`apps/web/app/(dashboard)/patients/referrers-actions.ts`): `createReferrer`,
`updateReferrer`, `setReferrerActive` e `markReferralsPaid` (zera as pendentes do
indicante), todas com validação de tenant na borda.

## Página `/agenda` + componentes

Rota nova em `apps/web/app/(dashboard)/agenda/`.

- **`page.tsx`** (server component) — resolve auth/clínica, lê `?date=` (default: hoje),
  chama `getAppointmentsByDate`, aplica mappers e compõe os componentes visuais.
  Páginas compõem, não concentram lógica.
- **`AgendaDayView.tsx`** (client component) — cabeçalho com navegação
  `< ontem | Hoje | amanhã >` + seletor de data (`input[type=date]`); lista de consultas
  do dia ordenada por hora. Cada linha: hora · nome do paciente · **tag do indicante**
  (quando houver) · badge de status · ações **[Compareceu] [Cancelar]** (chamam
  `setAppointmentStatus`). Botão **[+ Nova consulta]** abre o diálogo. Estado de dia
  vazio bem tratado.
- **`NewAppointmentDialog.tsx`** (client component) — busca de paciente existente
  (reaproveita a busca ILIKE/pg_trgm já indexada em pacientes — migration 008),
  campos data + hora, **dropdown opcional de indicante** (lista de indicantes ativos da
  clínica; opção "— sem indicante —" como default), submit via `createAppointment`. Se o
  paciente não existir, oferece link para **Cadastrar novo** (`/patients/new`).

Componentes visuais recebem dados por props; nada de componente gigante.

## Integração no Cadastro de Paciente

No `PatientForm` (`apps/web/components/patients/PatientForm.tsx`), **somente no modo
`create`**: seção opcional recolhível **"Agendar primeira consulta"** com checkbox +
campos data + hora + **dropdown opcional de indicante**.

Fluxo ao salvar:

1. Cria o paciente pelo fluxo atual (`POST /api/patients`), recebendo `patient.id`.
2. Se "Agendar primeira consulta" estiver marcado e válido, chama a server action
   `createAppointment` com o `patient.id` recém-criado (e `referrerId`, se escolhido).
3. Redireciona (para a ficha do paciente, mantendo o comportamento atual; a consulta
   aparecerá na Agenda daquele dia).

Se a criação da consulta falhar após o paciente já existir, o paciente **não** é
desfeito — exibir aviso não bloqueante ("Paciente cadastrado, mas não foi possível
agendar; tente pela Agenda"). O detalhe de UX do erro fica para o plano.

## Cadastro de Indicantes ("Corretas") — aba em Pacientes

A página de Pacientes (`apps/web/app/(dashboard)/patients/page.tsx`) passa a ter **duas
abas**: **Pacientes** (lista atual, inalterada) e **Indicantes**.

- **Aba Indicantes** — lista dos indicantes da clínica. Cada linha mostra: **nome** ·
  **indicações pendentes** (contador) · **[Pagar]** · estado ativo/inativo. Um
  **mini-formulário** de cadastro/edição com apenas: **nome** (obrigatório), **chave
  PIX** e **WhatsApp** (opcionais). Ações: criar, editar, ativar/desativar (sem exclusão
  dura, para preservar histórico das consultas).
- **Fluxo "Pagar"** (contador simples, sem valores monetários no MVP): quando o
  indicante tem indicações pendentes (> 0), o botão **[Pagar]** revela a **chave PIX**
  (para a secretária copiar e pagar) e um botão **[Marcar pago]**. Ao confirmar, chama
  `markReferralsPaid` → carimba todas as pendentes e o contador zera. Indicante com 0
  pendentes não mostra ação de pagamento.
- Componentes visuais recebem dados por props; a página compõe (auth/clínica →
  `listReferrersWithPendingCount` → componentes). Preservar `data-cy` nos campos e botões.
- Os três papéis podem gerir indicantes (a `RECEPTIONIST` é quem paga no fim do dia).

## Gratificação da indicação — regra e escopo

- **Regra de negócio:** a clínica deve **R$10 por consulta que foi COMPARECEU** e tem um
  indicante ligado. Consulta cancelada ou apenas agendada **não** conta. Uma indicação é
  **pendente** enquanto `status = ATTENDED`, `referrer_id` presente e `referral_paid_at`
  é NULL.
- **No MVP — contador simples (sem valores monetários):** a aba Indicantes mostra
  "indicações pendentes: N" por indicante e o fluxo **Pagar → mostra PIX → Marcar pago**,
  que zera as pendentes daquele indicante (carimba `referral_paid_at`). O valor de R$10
  **não** é exibido nem somado pelo sistema neste momento — é conhecimento externo da
  secretária; no código fica apenas como constante (ex.: `REFERRAL_FEE_CENTS = 1000`)
  reservada para o futuro.
- **"Marcar pago" zera todas as pendentes** do indicante (decisão de produto), alinhado
  ao fluxo "no fim do dia pago tudo que devo".
- **Depois — módulo financeiro (fora deste MVP):** escrutínio de valores em R$,
  totais por período, histórico de pagamentos e conciliação entram junto de um módulo
  financeiro próprio. O modelo já guarda o necessário (`referrer_id`, `status`,
  `referral_paid_at`, `scheduled_at`) para evoluir **sem migração dolorosa**.

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
- **Indicante opcional:** consulta sem indicante é normal (dropdown default "— sem
  indicante —"). Desativar um indicante o remove do dropdown, mas mantém o elo nas
  consultas passadas; apagá-lo aplica `SET NULL` (não apaga a consulta).

## Testes

- **Vitest (`apps/web/__tests__`)**:
  - `appointments-normalizers` — combinar data+hora, validações, formato de hora.
  - `appointments-mappers` — formatação `HH:mm`, ordenação por horário, nome do indicante.
  - `appointments-config` — ações habilitadas por status.
  - `referrers-normalizers` — validação de nome/PIX/WhatsApp.
  - contagem de indicações pendentes e efeito de `markReferralsPaid` (lógica de quais
    consultas contam: `ATTENDED` + `referrer_id` + `referral_paid_at IS NULL`).
  - helper de navegação de datas (ontem/amanhã/hoje).
- **Cypress (`cypress/e2e`)**:
  - criar consulta pela Agenda (com e sem indicante);
  - marcar "Compareceu"; cancelar;
  - navegar entre datas;
  - agendar durante o cadastro de paciente;
  - cadastrar um indicante na aba Indicantes e selecioná-lo numa consulta;
  - marcar a consulta como "Compareceu", ver o contador do indicante subir, clicar
    Pagar → ver o PIX → Marcar pago → contador zera.
  - Preservar `data-cy` em todos os fluxos.

## Fora de escopo (fase 2+)

Explicitamente **não** entram neste MVP:

- Lembrete automático por WhatsApp/SMS (Twilio + pgcron, templates, opt-out).
- Colunas/agenda por profissional (o campo `professional_id` já fica reservado).
- Tipo de consulta (Primeira/Retorno/Exame) e observação por consulta.
- Status `CONFIRMADO` e `FALTOU` separados; motivo de cancelamento.
- Bloqueio de conflito de horário, duração/slots fixos.
- Recorrência, lista de espera, grade semanal.
- **Valores monetários e módulo financeiro** — o MVP tem só o contador de pendentes +
  marcar pago; totais em R$, histórico de pagamentos e conciliação vêm com o financeiro.
- Integração automática de PIX (o MVP apenas **exibe** a chave para pagamento manual).

## Critérios de aceite (MVP)

1. Item "Agenda" aparece no menu e abre a lista do dia atual.
2. Secretária cria consulta para paciente existente e ela aparece no dia/horário certo.
3. Navegação de datas funciona (ontem/hoje/amanhã + seletor).
4. Marcar "Compareceu" e "Cancelar" persiste e reflete na tela.
5. Cadastro de paciente com "Agendar primeira consulta" cria paciente + consulta.
6. Aba **Indicantes** em Pacientes permite criar/editar/desativar indicante
   (nome + PIX + WhatsApp).
7. Ao agendar (na Agenda ou no cadastro), é possível ligar a consulta a um indicante via
   dropdown, e o indicante aparece na linha da consulta na Agenda.
8. Ao marcar uma consulta com indicante como **Compareceu**, o contador de indicações
   pendentes daquele indicante aumenta; **Pagar → Marcar pago** zera o contador e carimba
   `referral_paid_at` nas consultas quitadas.
9. Toda operação valida `clinicId`/ownership; nenhum id (paciente, consulta, indicante)
   aceito sem validação de tenant.
10. Testes unitários (normalizers/mappers/config/contador) e E2E dos fluxos acima passam.
