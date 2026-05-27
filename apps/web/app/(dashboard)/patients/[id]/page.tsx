import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import PatientExamHistory from '@/components/exams/PatientExamHistory'
import PatientDetailHeader from '@/components/patients/PatientDetailHeader'
import PatientRecallsCard from '@/components/patients/PatientRecallsCard'
import PatientSummaryCard from '@/components/patients/PatientSummaryCard'
import { mapPatientDetailSummary } from '@/lib/patients/patient-detail-mappers'

interface PatientDetailPageProps {
  params: {
    id: string
  }
}

export const revalidate = 0

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const timer = startPerformanceTimer('page /patients/[id]')
  const supabase = createClient()
  const authStartedAt = startPerformanceStep()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

  if (error || !userId) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const patientStartedAt = startPerformanceStep()
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
      exams: {
        select: {
          id: true,
          exam_date: true,
          od_sph: true,
          od_cyl: true,
          od_axis: true,
          od_va: true,
          oe_sph: true,
          oe_cyl: true,
          oe_axis: true,
          oe_va: true,
          addition: true,
          pd: true,
          prescription_notes: true,
          examiner: {
            select: {
              full_name: true,
              crm: true,
            },
          },
        },
        orderBy: { exam_date: 'desc' },
      },
      alerts: {
        select: {
          id: true,
          status: true,
          channel: true,
          due_date: true,
          sent_at: true,
        },
        orderBy: { due_date: 'desc' },
      },
    },
  })
  logPerformanceStep(timer, 'prisma.patient_exams_alerts', patientStartedAt)

  if (!patient) {
    endPerformanceTimer(timer, 'not_found_or_out_of_clinic')
    notFound()
  }

  const summary = mapPatientDetailSummary(patient)

  endPerformanceTimer(timer)
  return (
    <div className="space-y-8 select-none">
      <PatientDetailHeader patientId={patient.id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PatientSummaryCard
          fullName={patient.full_name}
          dob={patient.dob}
          phone={patient.phone}
          email={patient.email}
          notes={patient.notes}
          age={summary.age}
          ageGroupLabel={summary.ageGroupLabel}
        />

        <div className="lg:col-span-2 space-y-6">
          <PatientRecallsCard alerts={patient.alerts} />

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Historico de Exames</h3>
            <PatientExamHistory exams={patient.exams} patientId={patient.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
