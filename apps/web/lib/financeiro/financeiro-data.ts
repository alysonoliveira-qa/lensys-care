// ─────────────────────────────────────────────────────────────────────────────
// lib/financeiro/financeiro-data.ts
// Acesso a dados do caixa. Prisma direto NÃO é RLS garantido: toda função
// recebe `clinicId` e o aplica no `where`, na leitura e na escrita.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'
import { appointmentDateToUtc } from '@/lib/appointments/appointments-normalizers'

import { buildConsultationDescription } from './financeiro-config'
import type { PaymentMethod } from './financeiro-config'
import type { FinancialEntryRecord } from './financeiro-mappers'
import type { NormalizedFinancialEntry } from './financeiro-normalizers'
import { summarizeEntries, type CashSummary } from './financeiro-normalizers'

const ENTRY_SELECT = {
  id: true,
  type: true,
  amount_cents: true,
  description: true,
  payment_method: true,
  entry_date: true,
  created_at: true,
  patient: { select: { id: true, full_name: true } },
  referrer: { select: { id: true, name: true } },
} as const

export interface ListEntriesInput {
  clinicId: string
  /** `YYYY-MM-DD`, inclusivo. */
  from: string
  /** `YYYY-MM-DD`, inclusivo. */
  to: string
}

/**
 * Lançamentos do período, do mais recente para o mais antigo.
 *
 * O intervalo é fechado nas duas pontas — `lte` e não `lt`. `entry_date` é DATE,
 * então o dia inteiro cabe no valor: um `lt` no mesmo dia devolveria vazio, e o
 * usuário que filtra "hoje até hoje" veria caixa zerado num dia com movimento.
 */
export function listEntriesForPeriod({
  clinicId,
  from,
  to,
}: ListEntriesInput): Promise<FinancialEntryRecord[]> {
  return prisma.financialEntry.findMany({
    where: {
      clinic_id: clinicId,
      entry_date: {
        gte: appointmentDateToUtc(from),
        lte: appointmentDateToUtc(to),
      },
    },
    orderBy: [{ entry_date: 'desc' }, { created_at: 'desc' }],
    select: ENTRY_SELECT,
  }) as Promise<FinancialEntryRecord[]>
}

export async function summarizePeriod(input: ListEntriesInput): Promise<CashSummary> {
  const entries = await prisma.financialEntry.findMany({
    where: {
      clinic_id: input.clinicId,
      entry_date: {
        gte: appointmentDateToUtc(input.from),
        lte: appointmentDateToUtc(input.to),
      },
    },
    select: { type: true, amount_cents: true },
  })

  return summarizeEntries(entries)
}

export interface CreateEntryInput extends NormalizedFinancialEntry {
  clinicId: string
  createdBy: string
}

export type CreateEntryResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'PATIENT_NOT_IN_CLINIC' | 'REFERRER_NOT_IN_CLINIC' }

/**
 * Cria um lançamento.
 *
 * `patientId` e `referrerId` chegam do formulário, então são validados contra a
 * clínica **antes** de virar FK. Sem isso, um id de outro tenant colado no
 * `<select>` amarraria o dinheiro de uma clínica ao paciente de outra — e a FK
 * do banco aceitaria de bom grado, porque ela só exige que a linha exista.
 */
export async function createEntry(input: CreateEntryInput): Promise<CreateEntryResult> {
  if (input.patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinic_id: input.clinicId },
      select: { id: true },
    })

    if (!patient) return { ok: false, reason: 'PATIENT_NOT_IN_CLINIC' }
  }

  if (input.referrerId) {
    const referrer = await prisma.referrer.findFirst({
      where: { id: input.referrerId, clinic_id: input.clinicId },
      select: { id: true },
    })

    if (!referrer) return { ok: false, reason: 'REFERRER_NOT_IN_CLINIC' }
  }

  const created = await prisma.financialEntry.create({
    data: {
      clinic_id: input.clinicId,
      type: input.type,
      amount_cents: input.amountCents,
      description: input.description,
      payment_method: input.paymentMethod,
      entry_date: appointmentDateToUtc(input.entryDate),
      patient_id: input.patientId,
      referrer_id: input.referrerId,
      created_by: input.createdBy,
    },
    select: { id: true },
  })

  return { ok: true, id: created.id }
}

export type DeleteEntryResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' }

/**
 * Apaga um lançamento. `deleteMany` com `clinic_id` no `where` em vez de
 * `delete` por id: assim um id de outro tenant não apaga nada, em vez de apagar
 * e só depois falhar a conferência.
 */
export async function deleteEntry(clinicId: string, entryId: string): Promise<DeleteEntryResult> {
  const deleted = await prisma.financialEntry.deleteMany({
    where: { id: entryId, clinic_id: clinicId },
  })

  return deleted.count === 0 ? { ok: false, reason: 'NOT_FOUND' } : { ok: true }
}

// ─── Preço da consulta e cobrança rápida ─────────────────────────────────────

/**
 * Preço da consulta da clínica, em centavos, ou `null` se nunca foi configurado.
 *
 * `null` e zero significam coisas diferentes e a UI depende disso: `null` pede
 * configuração, e zero é impedido pelo banco. Lançar consulta de R$ 0,00 encheria
 * o caixa de linha sem dinheiro que ninguém questionaria — "0,00" parece resposta,
 * não ausência.
 */
export async function getConsultationPriceCents(clinicId: string): Promise<number | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { consultation_price_cents: true },
  })

  return clinic?.consultation_price_cents ?? null
}

export type SetConsultationPriceResult = { ok: true } | { ok: false; reason: 'CLINIC_NOT_FOUND' }

export async function setConsultationPriceCents(
  clinicId: string,
  priceCents: number
): Promise<SetConsultationPriceResult> {
  const updated = await prisma.clinic.updateMany({
    where: { id: clinicId },
    data: { consultation_price_cents: priceCents },
  })

  return updated.count === 0 ? { ok: false, reason: 'CLINIC_NOT_FOUND' } : { ok: true }
}

/** Quantos lançamentos de entrada este paciente já tem no dia. */
export async function countPatientIncomeOnDate(
  clinicId: string,
  patientId: string,
  date: string
): Promise<number> {
  return prisma.financialEntry.count({
    where: {
      clinic_id: clinicId,
      patient_id: patientId,
      type: 'INCOME',
      entry_date: appointmentDateToUtc(date),
    },
  })
}

export interface RegisterConsultationInput {
  clinicId: string
  patientId: string
  createdBy: string
  paymentMethod: PaymentMethod
  /** `YYYY-MM-DD` do lançamento. */
  entryDate: string
  /** Passa por cima do aviso de "já cobrado hoje". */
  confirmed: boolean
}

export type RegisterConsultationResult =
  | { ok: true; id: string; amountCents: number }
  | { ok: false; reason: 'PATIENT_NOT_IN_CLINIC' | 'PRICE_NOT_SET' }
  | { ok: false; reason: 'ALREADY_CHARGED_TODAY'; existingCount: number }

/**
 * Registra o pagamento da consulta de um paciente com um clique.
 *
 * O valor vem **da configuração da clínica**, nunca do formulário: um preço vindo
 * do cliente deixaria qualquer usuário lançar o número que quisesse no caixa da
 * própria clínica, e o botão existe justamente para não digitar valor.
 *
 * A checagem de duplicata avisa em vez de bloquear (decisão de 26/08/2026). Clique
 * duplo é o erro comum, mas paciente que paga consulta e óculos no mesmo dia é
 * caso real — travar seria consertar o acidente quebrando o legítimo.
 */
export async function registerConsultationPayment(
  input: RegisterConsultationInput
): Promise<RegisterConsultationResult> {
  const [patient, priceCents] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: input.patientId, clinic_id: input.clinicId },
      select: { id: true, full_name: true },
    }),
    getConsultationPriceCents(input.clinicId),
  ])

  if (!patient) return { ok: false, reason: 'PATIENT_NOT_IN_CLINIC' }
  if (priceCents === null) return { ok: false, reason: 'PRICE_NOT_SET' }

  if (!input.confirmed) {
    const jaLancados = await countPatientIncomeOnDate(
      input.clinicId,
      input.patientId,
      input.entryDate
    )

    if (jaLancados > 0) {
      return { ok: false, reason: 'ALREADY_CHARGED_TODAY', existingCount: jaLancados }
    }
  }

  const created = await prisma.financialEntry.create({
    data: {
      clinic_id: input.clinicId,
      type: 'INCOME',
      amount_cents: priceCents,
      description: buildConsultationDescription(patient.full_name),
      payment_method: input.paymentMethod,
      entry_date: appointmentDateToUtc(input.entryDate),
      patient_id: patient.id,
      created_by: input.createdBy,
    },
    select: { id: true },
  })

  return { ok: true, id: created.id, amountCents: priceCents }
}
