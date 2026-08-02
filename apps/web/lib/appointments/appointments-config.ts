import type { BadgeProps } from '@/components/ui/badge'
import type { ButtonProps } from '@/components/ui/button'

export type AppointmentStatus = 'SCHEDULED' | 'ATTENDED' | 'CANCELED'

/** Status para os quais a agenda permite transicionar a partir de SCHEDULED. */
export type AppointmentActionStatus = Extract<AppointmentStatus, 'ATTENDED' | 'CANCELED'>

export interface AppointmentAction {
  nextStatus: AppointmentActionStatus
  label: string
  buttonVariant: ButtonProps['variant']
  dataCy: string
}

export interface AppointmentStatusConfigItem {
  id: AppointmentStatus
  label: string
  badgeVariant: BadgeProps['variant']
  /** Status terminal não oferece ações; a linha é apenas exibida. */
  isTerminal: boolean
  /** Estilo da linha na agenda (cancelada aparece riscada/acinzentada). */
  rowClassName?: string
  actions: AppointmentAction[]
}

export const APPOINTMENT_STATUS_VALUES = ['SCHEDULED', 'ATTENDED', 'CANCELED'] as const

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  AppointmentStatusConfigItem
> = {
  SCHEDULED: {
    id: 'SCHEDULED',
    label: 'Agendado',
    badgeVariant: 'secondary',
    isTerminal: false,
    actions: [
      {
        nextStatus: 'ATTENDED',
        label: 'Compareceu',
        buttonVariant: 'default',
        dataCy: 'appointment-mark-attended',
      },
      {
        nextStatus: 'CANCELED',
        label: 'Cancelar',
        buttonVariant: 'ghost',
        dataCy: 'appointment-mark-canceled',
      },
    ],
  },
  ATTENDED: {
    id: 'ATTENDED',
    label: 'Compareceu',
    badgeVariant: 'success',
    isTerminal: true,
    actions: [],
  },
  CANCELED: {
    id: 'CANCELED',
    label: 'Cancelado',
    badgeVariant: 'outline',
    isTerminal: true,
    rowClassName: 'line-through text-muted-foreground opacity-70',
    actions: [],
  },
}

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUS_VALUES as readonly string[]).includes(value)
}

export function getAppointmentActions(status: AppointmentStatus): AppointmentAction[] {
  return APPOINTMENT_STATUS_CONFIG[status].actions
}

/**
 * Gratificação por indicação comparecida (R$10). Reservada para o módulo financeiro:
 * o MVP só conta indicações pendentes, sem exibir ou somar valores.
 */
export const REFERRAL_FEE_CENTS = 1000
