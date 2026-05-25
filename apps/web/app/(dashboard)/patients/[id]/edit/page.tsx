import { notFound, redirect } from 'next/navigation'
import PatientForm from '@/components/patients/PatientForm'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

interface EditPatientPageProps {
  params: {
    id: string
  }
}

export const revalidate = 0

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub

  if (error || !userId) {
    redirect('/login')
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      clinic: {
        profiles: {
          some: { id: userId },
        },
      },
    },
    select: {
      id: true,
      full_name: true,
      dob: true,
      phone: true,
      email: true,
      notes: true,
    },
  })

  if (!patient) {
    notFound()
  }

  return (
    <PatientForm
      mode="edit"
      patientId={patient.id}
      initialValues={{
        fullName: patient.full_name,
        dob: patient.dob.toISOString().split('T')[0],
        phone: patient.phone ?? '',
        email: patient.email ?? '',
        notes: patient.notes ?? '',
      }}
    />
  )
}
