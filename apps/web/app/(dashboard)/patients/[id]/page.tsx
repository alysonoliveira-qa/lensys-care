import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
import ChargeConsultationButton from '@/components/financeiro/ChargeConsultationButton'
import { hasFeature } from '@/lib/features'
import { getConsultationPriceCents } from '@/lib/financeiro/financeiro-data'
import { formatCurrency } from '@/lib/financeiro/financeiro-normalizers'
import { getPatientDetailPageData } from '@/lib/patients/patient-detail-data'
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
  const patient = await getPatientDetailPageData(params.id, userId)
  logPerformanceStep(timer, 'prisma.patient_exams_alerts', patientStartedAt)

  if (!patient) {
    endPerformanceTimer(timer, 'not_found_or_out_of_clinic')
    notFound()
  }

  const summary = mapPatientDetailSummary(patient)

  // O botao de cobranca so existe no Professional. O gate real esta na server
  // action; isto aqui e para nao mostrar afordancia que vai ser negada.
  const podeCobrar = await hasFeature(patient.clinic_id, 'financeiro')
  const precoCents = podeCobrar ? await getConsultationPriceCents(patient.clinic_id) : null

  endPerformanceTimer(timer)

  return (
    <div className="space-y-8 select-none">
      <PatientDetailHeader patientId={patient.id} hasExams={patient.exams.length > 0} />

      {podeCobrar ? (
        <div className="flex justify-end">
          <ChargeConsultationButton
            patientId={patient.id}
            priceLabel={precoCents === null ? null : formatCurrency(precoCents)}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PatientSummaryCard
          fullName={patient.full_name}
          dob={patient.dob}
          phone={patient.phone}
          email={patient.email}
          notes={patient.notes}
          age={summary.age}
          ageGroupLabel={summary.ageGroupLabel}
        />

        <div className="space-y-6 lg:col-span-2">
          <PatientRecallsCard alerts={patient.alerts} />

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Histórico clínico
              </p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Histórico de Exames
              </h3>
            </div>
            <PatientExamHistory exams={patient.exams} patientId={patient.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
