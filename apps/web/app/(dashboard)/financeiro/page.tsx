import { redirect } from 'next/navigation'

import UpgradeGate from '@/components/ui/UpgradeGate'
import FinanceiroView from '@/components/financeiro/FinanceiroView'
import { todayAppointmentDate } from '@/lib/appointments/appointments-normalizers'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'
import { hasFeature } from '@/lib/features'
import {
  getConsultationPriceCents,
  listEntriesForPeriod,
  summarizePeriod,
} from '@/lib/financeiro/financeiro-data'
import { mapEntriesToRows } from '@/lib/financeiro/financeiro-mappers'
import { formatCents } from '@/lib/financeiro/financeiro-normalizers'
import { resolvePeriod } from '@/lib/financeiro/financeiro-period'
import { listReferrers } from '@/lib/referrers/referrers-data'
import { mapReferrersToOptions } from '@/lib/referrers/referrers-mappers'

interface FinanceiroPageProps {
  searchParams?: {
    preset?: string
    from?: string
    to?: string
  }
}

export const revalidate = 0

export default async function FinanceiroPage({ searchParams }: FinanceiroPageProps) {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }

  const clinicId = shellData.profile.clinic_id

  // O gate vive aqui, na rota — esconder o link da sidebar é conveniência, não
  // proteção. Quem digitar /financeiro no plano errado vê a oferta, não o caixa.
  if (!(await hasFeature(clinicId, 'financeiro'))) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <UpgradeGate feature="financeiro" />
      </div>
    )
  }

  const period = resolvePeriod(searchParams, todayAppointmentDate())

  const [entries, summary, referrers, consultationPriceCents] = await Promise.all([
    listEntriesForPeriod({ clinicId, from: period.from, to: period.to }),
    summarizePeriod({ clinicId, from: period.from, to: period.to }),
    listReferrers(clinicId, { activeOnly: true }),
    getConsultationPriceCents(clinicId),
  ])

  return (
    <FinanceiroView
      rows={mapEntriesToRows(entries)}
      summary={summary}
      period={period}
      today={todayAppointmentDate()}
      referrerOptions={mapReferrersToOptions(referrers)}
      consultationPrice={
        consultationPriceCents === null ? null : formatCents(consultationPriceCents)
      }
      canEditPrice={shellData.profile.role === 'OWNER'}
    />
  )
}
