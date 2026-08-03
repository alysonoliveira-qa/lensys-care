import { redirect } from 'next/navigation'

import AgendaDayView from '@/components/agenda/AgendaDayView'
import {
  buildAgendaDayNavigation,
  resolveAgendaDate,
} from '@/lib/appointments/agenda-navigation'
import { getAppointmentsByDate } from '@/lib/appointments/appointments-data'
import { mapAppointmentsToRows } from '@/lib/appointments/appointments-mappers'
import { todayAppointmentDate } from '@/lib/appointments/appointments-normalizers'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'
import { listReferrers } from '@/lib/referrers/referrers-data'
import { mapReferrersToOptions } from '@/lib/referrers/referrers-mappers'

interface AgendaPageProps {
  searchParams?: {
    date?: string
  }
}

export const revalidate = 0

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }

  const clinicId = shellData.profile.clinic_id
  const today = todayAppointmentDate()
  const date = resolveAgendaDate(searchParams?.date, today)

  const [appointments, referrers] = await Promise.all([
    getAppointmentsByDate(clinicId, date),
    listReferrers(clinicId, { activeOnly: true }),
  ])

  return (
    <AgendaDayView
      rows={mapAppointmentsToRows(appointments)}
      navigation={buildAgendaDayNavigation(date, today)}
      referrerOptions={mapReferrersToOptions(referrers)}
      clinicName={shellData.profile.clinic_name}
    />
  )
}
