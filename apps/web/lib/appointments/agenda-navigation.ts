import {
  isValidAppointmentDate,
  shiftAppointmentDate,
  todayAppointmentDate,
} from './appointments-normalizers'

export const AGENDA_BASE_PATH = '/agenda'

export interface AgendaDayNavigation {
  date: string
  label: string
  /** "Hoje" / "Ontem" / "Amanhã" — null para qualquer outro dia. */
  relativeLabel: string | null
  isToday: boolean
  previousHref: string
  nextHref: string
  todayHref: string
}

/** `?date=` inválido ou ausente cai para hoje, em vez de quebrar a página. */
export function resolveAgendaDate(
  requestedDate: string | undefined | null,
  today: string = todayAppointmentDate()
): string {
  const date = requestedDate?.trim() ?? ''

  return isValidAppointmentDate(date) ? date : today
}

export function buildAgendaHref(date: string): string {
  return `${AGENDA_BASE_PATH}?date=${date}`
}

/** Formata em UTC de propósito: `appointment_date` é dia de parede, não instante. */
export function formatAgendaDateLabel(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

function relativeLabelFor(date: string, today: string): string | null {
  if (date === today) return 'Hoje'
  if (date === shiftAppointmentDate(today, -1)) return 'Ontem'
  if (date === shiftAppointmentDate(today, 1)) return 'Amanhã'

  return null
}

export function buildAgendaDayNavigation(
  date: string,
  today: string = todayAppointmentDate()
): AgendaDayNavigation {
  return {
    date,
    label: formatAgendaDateLabel(date),
    relativeLabel: relativeLabelFor(date, today),
    isToday: date === today,
    previousHref: buildAgendaHref(shiftAppointmentDate(date, -1)),
    nextHref: buildAgendaHref(shiftAppointmentDate(date, 1)),
    todayHref: buildAgendaHref(today),
  }
}
