import type { BadgeProps } from '@/components/ui/badge'

import {
  APPOINTMENT_STATUS_CONFIG,
  type AppointmentAction,
  type AppointmentStatus,
} from './appointments-config'
import { formatAppointmentTime, queuePositions } from './appointments-normalizers'

/** Linha persistida (shape do `select` de `appointments-data`). */
export interface AppointmentRecord {
  id: string
  patient_id: string
  scheduled_time: Date | null
  created_at: Date
  status: AppointmentStatus
  referrer_id: string | null
  patient: { id: string; full_name: string }
  referrer: { id: string; name: string } | null
}

export interface AppointmentRow {
  id: string
  patientId: string
  patientName: string
  referrerId: string | null
  referrerName: string | null
  /** `HH:mm` quando a consulta tem hora marcada. */
  timeLabel: string | null
  /** Posição na fila do dia quando não tem hora (e não está cancelada). */
  queuePosition: number | null
  /** O que aparece na coluna da esquerda: `14:30`, `#2` ou `—`. */
  slotLabel: string
  status: AppointmentStatus
  statusLabel: string
  badgeVariant: BadgeProps['variant']
  isCanceled: boolean
  isTerminal: boolean
  rowClassName?: string
  actions: AppointmentAction[]
}

export const EMPTY_SLOT_LABEL = '—'

/** `scheduled_time ASC NULLS LAST, created_at ASC` — o mesmo do banco, aplicado de novo
 * na leitura para que os mappers não dependam da origem da lista. */
export function sortAppointmentsForDay<
  T extends { scheduled_time: Date | null; created_at: Date },
>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    if (a.scheduled_time && b.scheduled_time) {
      const byTime = a.scheduled_time.getTime() - b.scheduled_time.getTime()
      if (byTime !== 0) return byTime
    } else if (a.scheduled_time) {
      return -1
    } else if (b.scheduled_time) {
      return 1
    }

    return a.created_at.getTime() - b.created_at.getTime()
  })
}

export function mapAppointmentToRow(
  record: AppointmentRecord,
  queuePosition: number | null
): AppointmentRow {
  const config = APPOINTMENT_STATUS_CONFIG[record.status]
  const timeLabel = formatAppointmentTime(record.scheduled_time)

  return {
    id: record.id,
    patientId: record.patient.id,
    patientName: record.patient.full_name,
    referrerId: record.referrer?.id ?? null,
    referrerName: record.referrer?.name ?? null,
    timeLabel,
    queuePosition,
    slotLabel: timeLabel ?? (queuePosition === null ? EMPTY_SLOT_LABEL : `#${queuePosition}`),
    status: record.status,
    statusLabel: config.label,
    badgeVariant: config.badgeVariant,
    isCanceled: record.status === 'CANCELED',
    isTerminal: config.isTerminal,
    rowClassName: config.rowClassName,
    actions: config.actions,
  }
}

export function mapAppointmentsToRows(records: AppointmentRecord[]): AppointmentRow[] {
  const positions = queuePositions(records)

  return sortAppointmentsForDay(records).map((record) =>
    mapAppointmentToRow(record, positions.get(record.id) ?? null)
  )
}
