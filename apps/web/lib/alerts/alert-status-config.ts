import type { BadgeProps } from '@/components/ui/badge'

export type AlertStatus = 'PENDING' | 'SENT' | 'DISMISSED'

export interface AlertStatusConfigItem {
  id: AlertStatus
  label: string
  compactLabel?: string
  badgeVariant: BadgeProps['variant']
  shortDescription?: string
}

export const ALERT_STATUS_CONFIG: Record<AlertStatus, AlertStatusConfigItem> = {
  PENDING: {
    id: 'PENDING',
    label: 'Pendente',
    badgeVariant: 'warning',
    shortDescription: 'Exames expirando em breve',
  },
  SENT: {
    id: 'SENT',
    label: 'Enviado',
    badgeVariant: 'success',
    shortDescription: 'Lembrete disparado ao paciente',
  },
  DISMISSED: {
    id: 'DISMISSED',
    label: 'Dispensado',
    compactLabel: 'Cancelado',
    badgeVariant: 'secondary',
    shortDescription: 'Alerta cancelado manualmente',
  },
}

export const ALERT_STATUS_FILTER_OPTIONS = [
  {
    value: 'PENDING' as const,
    label: 'Pendentes',
    badgeVariant: ALERT_STATUS_CONFIG.PENDING.badgeVariant,
  },
  {
    value: 'SENT' as const,
    label: 'Enviados',
    badgeVariant: ALERT_STATUS_CONFIG.SENT.badgeVariant,
  },
  {
    value: 'DISMISSED' as const,
    label: 'Cancelados / Dispensados',
    badgeVariant: ALERT_STATUS_CONFIG.DISMISSED.badgeVariant,
  },
] as const
