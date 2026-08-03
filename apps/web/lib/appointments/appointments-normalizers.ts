import type { AppointmentStatus } from './appointments-config'

/**
 * Fuso da clínica. `appointment_date` (DATE) e `scheduled_time` (TIME) são hora de
 * parede: nada é convertido de/para UTC ao exibir — só ao conversar com o Postgres,
 * que representa ambos como instantes UTC no Prisma.
 */
export const AGENDA_TIME_ZONE = 'America/Sao_Paulo'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/

const MS_PER_DAY = 86_400_000

function pad(value: number, length = 2) {
  return String(value).padStart(length, '0')
}

export function isValidAppointmentDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false

  const [, year, month, day] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  // Rejeita datas que não existem no calendário (ex.: 2026-02-30, que o Date "rola").
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
  )
}

export function isValidAppointmentTime(value: string): boolean {
  const match = TIME_PATTERN.exec(value)
  if (!match) return false

  const [, hours, minutes, seconds] = match

  return (
    Number(hours) <= 23 && Number(minutes) <= 59 && (seconds === undefined || Number(seconds) <= 59)
  )
}

/** `''`/espaços/inválido → null (fila do dia); `HH:mm:ss` → `HH:mm`. */
export function normalizeAppointmentTime(value?: string | null): string | null {
  const raw = (value ?? '').trim()
  if (raw === '' || !isValidAppointmentTime(raw)) return null

  const [, hours, minutes] = TIME_PATTERN.exec(raw)!

  return `${hours}:${minutes}`
}

export interface AppointmentInput {
  patientId: string
  date: string
  time?: string | null
}

export interface AppointmentInputErrors {
  patientId?: string
  date?: string
  time?: string
}

export type AppointmentInputResult =
  | { ok: true; value: { patientId: string; date: string; time: string | null } }
  | { ok: false; errors: AppointmentInputErrors }

/**
 * Paciente e data são obrigatórios; a hora é opcional — vazia significa "fila do dia"
 * e só é rejeitada quando informada em formato inválido.
 */
export function validateAppointmentInput(input: AppointmentInput): AppointmentInputResult {
  const errors: AppointmentInputErrors = {}

  const patientId = input.patientId?.trim() ?? ''
  if (patientId === '') {
    errors.patientId = 'Selecione o paciente da consulta.'
  }

  const date = input.date?.trim() ?? ''
  if (date === '') {
    errors.date = 'Informe a data da consulta.'
  } else if (!isValidAppointmentDate(date)) {
    errors.date = 'Data inválida. Use o formato AAAA-MM-DD.'
  }

  const rawTime = (input.time ?? '').trim()
  let time: string | null = null
  if (rawTime !== '') {
    if (!isValidAppointmentTime(rawTime)) {
      errors.time = 'Hora inválida. Use o formato HH:mm (ou deixe vazio para a fila do dia).'
    } else {
      time = normalizeAppointmentTime(rawTime)
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, value: { patientId, date, time } }
}

/** `YYYY-MM-DD` → meia-noite UTC, que é como o Prisma grava/lê `@db.Date`. */
export function appointmentDateToUtc(date: string): Date {
  if (!isValidAppointmentDate(date)) {
    throw new Error(`Data de consulta inválida: ${date}`)
  }

  return new Date(`${date}T00:00:00.000Z`)
}

/** `HH:mm` → instante em 1970-01-01 UTC, que é como o Prisma grava/lê `@db.Time`. */
export function appointmentTimeToUtc(time: string | null): Date | null {
  if (time === null) return null

  const normalized = normalizeAppointmentTime(time)
  if (normalized === null) {
    throw new Error(`Hora de consulta inválida: ${time}`)
  }

  return new Date(`1970-01-01T${normalized}:00.000Z`)
}

export function formatAppointmentDate(value: Date): string {
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
}

export function formatAppointmentTime(value: Date | null): string | null {
  if (value === null) return null

  return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`
}

export function shiftAppointmentDate(date: string, days: number): string {
  const shifted = new Date(appointmentDateToUtc(date).getTime() + days * MS_PER_DAY)

  return formatAppointmentDate(shifted)
}

/** Hoje no fuso da clínica — o dia do servidor (UTC) viraria antes na Vercel. */
export function todayAppointmentDate(now: Date = new Date(), timeZone = AGENDA_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const lookup = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '00'

  return `${lookup('year')}-${lookup('month')}-${lookup('day')}`
}

export interface QueueCandidate {
  id: string
  scheduled_time: Date | null
  created_at: Date
  status: AppointmentStatus
}

/**
 * Posição na fila do dia (#N), derivada na leitura: só entram as consultas sem hora
 * e não canceladas, na ordem de marcação. Cancelar/agendar reordena naturalmente.
 */
export function queuePositions(appointments: QueueCandidate[]): Map<string, number> {
  const queue = appointments
    .filter((item) => item.scheduled_time === null && item.status !== 'CANCELED')
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())

  return new Map(queue.map((item, index) => [item.id, index + 1]))
}
