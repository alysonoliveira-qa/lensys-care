import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import ExamForm from '@/components/exams/ExamForm'

interface NewExamPageProps {
  searchParams?: {
    patientId?: string
  }
}

export const revalidate = 0

export default async function NewExamPage({ searchParams }: NewExamPageProps) {
  const timer = startPerformanceTimer('page /exams/new')
  const supabase = createClient()
  const authStartedAt = startPerformanceStep()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

  if (error || !userId) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const patientId = searchParams?.patientId

  if (!patientId) {
    endPerformanceTimer(timer, 'redirect_no_patient')
    redirect('/patients')
  }

  const patientStartedAt = startPerformanceStep()
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
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
      exams: {
        orderBy: [
          { exam_date: 'desc' },
          { created_at: 'desc' },
        ],
        take: 1,
        select: {
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
        },
      },
    },
  })

  logPerformanceStep(timer, 'prisma.patient_with_previous_exam', patientStartedAt)

  if (!patient) {
    endPerformanceTimer(timer, 'not_found_or_out_of_clinic')
    redirect('/patients')
  }

  const { exams, ...patientData } = patient
  const previousExam = exams[0]

  endPerformanceTimer(timer)

  return (
    <div className="space-y-6">
      <ExamForm
        patient={patientData}
        previousExam={previousExam ? {
          odSph: previousExam.od_sph?.toString() ?? null,
          odCyl: previousExam.od_cyl?.toString() ?? null,
          odAxis: previousExam.od_axis,
          odVa: previousExam.od_va,
          oeSph: previousExam.oe_sph?.toString() ?? null,
          oeCyl: previousExam.oe_cyl?.toString() ?? null,
          oeAxis: previousExam.oe_axis,
          oeVa: previousExam.oe_va,
          addition: previousExam.addition?.toString() ?? null,
          pd: previousExam.pd?.toString() ?? null,
          prescriptionNotes: null,
        } : null}
      />
    </div>
  )
}
