import { redirect } from 'next/navigation'

import PatientForm from '@/components/patients/PatientForm'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'
import { listReferrers } from '@/lib/referrers/referrers-data'
import { mapReferrersToOptions } from '@/lib/referrers/referrers-mappers'

export const revalidate = 0

export default async function NewPatientPage() {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }

  const referrers = await listReferrers(shellData.profile.clinic_id, { activeOnly: true })

  return <PatientForm mode="create" referrerOptions={mapReferrersToOptions(referrers)} />
}
