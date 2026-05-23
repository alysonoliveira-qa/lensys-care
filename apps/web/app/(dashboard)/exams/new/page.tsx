import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import ExamForm from '@/components/exams/ExamForm'

interface NewExamPageProps {
  searchParams?: {
    patientId?: string
  }
}

export const revalidate = 0

export default async function NewExamPage({ searchParams }: NewExamPageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const patientId = searchParams?.patientId

  if (!patientId) {
    redirect('/patients')
  }

  // Fetch patient details from DB
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      full_name: true,
      dob: true,
      phone: true,
      email: true,
    },
  })

  if (!patient) {
    redirect('/patients')
  }

  return (
    <div className="space-y-6">
      <ExamForm patient={patient} />
    </div>
  )
}
