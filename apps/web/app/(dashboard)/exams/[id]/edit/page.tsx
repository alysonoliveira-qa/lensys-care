import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import ExamForm from '@/components/exams/ExamForm'

interface EditExamPageProps {
  params: {
    id: string
  }
}

export const revalidate = 0

export default async function EditExamPage({ params }: EditExamPageProps) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub

  if (error || !userId) {
    redirect('/login')
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: params.id,
      patient: {
        clinic: {
          profiles: {
            some: { id: userId },
          },
        },
      },
    },
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
      patient: {
        select: {
          id: true,
          full_name: true,
          dob: true,
          phone: true,
          email: true,
        },
      },
    },
  })

  if (!exam) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <ExamForm
        patient={exam.patient}
        exam={{
          id: exam.id,
          examDate: exam.exam_date.toISOString().split('T')[0],
          odSph: exam.od_sph?.toString() ?? null,
          odCyl: exam.od_cyl?.toString() ?? null,
          odAxis: exam.od_axis,
          odVa: exam.od_va,
          oeSph: exam.oe_sph?.toString() ?? null,
          oeCyl: exam.oe_cyl?.toString() ?? null,
          oeAxis: exam.oe_axis,
          oeVa: exam.oe_va,
          addition: exam.addition?.toString() ?? null,
          pd: exam.pd?.toString() ?? null,
          prescriptionNotes: exam.prescription_notes,
        }}
      />
    </div>
  )
}
