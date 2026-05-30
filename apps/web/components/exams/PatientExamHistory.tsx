'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DeleteExamButton from '@/components/exams/DeleteExamButton'
import { formatClinicalExamDate } from '@/lib/patients/patient-detail-mappers'
import { Calendar, FileText, Pencil, Printer } from 'lucide-react'

type DecimalLike = number | string | { toString(): string; valueOf(): string | number }

export type PatientExamHistoryItem = {
  id: string
  exam_date: Date | string
  examiner: {
    full_name: string
    crm: string | null
  }
  od_sph: DecimalLike | null
  od_cyl: DecimalLike | null
  od_axis: number | null
  od_va: string | null
  oe_sph: DecimalLike | null
  oe_cyl: DecimalLike | null
  oe_axis: number | null
  oe_va: string | null
  addition: DecimalLike | null
  pd: DecimalLike | null
  prescription_notes: string | null
}

interface PatientExamHistoryProps {
  exams: PatientExamHistoryItem[]
  patientId: string
}

export default function PatientExamHistory({
  exams: initialExams,
  patientId,
}: PatientExamHistoryProps) {
  const [exams, setExams] = useState(initialExams)

  useEffect(() => {
    setExams(initialExams)
  }, [initialExams])

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
        <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
        <div className="space-y-1">
          <p>Nenhum exame refrativo registrado para este paciente.</p>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            O primeiro exame aparecerá aqui assim que for registrado.
          </p>
        </div>
        <Link href={`/exams/new?patientId=${patientId}`} className="mt-2">
          <Button
            size="sm"
            className="h-10 rounded-xl bg-indigo-600 px-4 font-semibold hover:bg-indigo-500"
            data-cy="start-first-exam-button"
          >
            Iniciar Primeiro Exame
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {exams.map((exam) => (
        <Card
          key={exam.id}
          className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
          data-cy="exam-history-card"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-bold">
                    Exame realizado em: {formatClinicalExamDate(exam.exam_date)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  Examinado por: {exam.examiner.full_name}
                  {exam.examiner.crm ? ` (${exam.examiner.crm})` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/exams/${exam.id}/edit`} prefetch={false}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg border-slate-200 px-2.5 text-[11px] font-semibold dark:border-slate-800"
                    data-cy="edit-exam-button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                </Link>
                <Link href={`/exams/${exam.id}/print`} prefetch={false}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg border-slate-200 px-2.5 text-[11px] font-semibold dark:border-slate-800"
                    data-cy="print-exam-button"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </Button>
                </Link>
                <DeleteExamButton
                  examId={exam.id}
                  onDeleted={(deletedExamId) => {
                    setExams((currentExams) =>
                      currentExams.filter((currentExam) => currentExam.id !== deletedExamId)
                    )
                  }}
                />
              </div>
            </div>
          </div>

          <CardContent className="space-y-6 p-6">
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-center text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:border-slate-800 dark:bg-slate-950/30">
                    <th className="py-2.5">Olho</th>
                    <th className="py-2.5">Esférico (SPH)</th>
                    <th className="py-2.5">Cilíndrico (CYL)</th>
                    <th className="py-2.5">Eixo (AXIS)</th>
                    <th className="py-2.5">Acuidade (VA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="bg-slate-50/50 px-4 py-3 font-bold text-slate-400 dark:bg-slate-950/20">
                      OD (Direito)
                    </td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                      {exam.od_sph
                        ? `${Number(exam.od_sph) > 0 ? '+' : ''}${Number(exam.od_sph).toFixed(2)}`
                        : 'Plano'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.od_cyl ? `${Number(exam.od_cyl).toFixed(2)}` : '0.00'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.od_axis ? `${exam.od_axis}°` : '-'}
                    </td>
                    <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {exam.od_va || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50/50 px-4 py-3 font-bold text-slate-400 dark:bg-slate-950/20">
                      OE (Esquerdo)
                    </td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                      {exam.oe_sph
                        ? `${Number(exam.oe_sph) > 0 ? '+' : ''}${Number(exam.oe_sph).toFixed(2)}`
                        : 'Plano'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.oe_cyl ? `${Number(exam.oe_cyl).toFixed(2)}` : '0.00'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.oe_axis ? `${exam.oe_axis}°` : '-'}
                    </td>
                    <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {exam.oe_va || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-center dark:border-slate-800 dark:bg-slate-950/20">
                <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-slate-400">
                  Adição (ADD)
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {exam.addition ? `+${Number(exam.addition).toFixed(2)} D` : 'Sem adição'}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-center dark:border-slate-800 dark:bg-slate-950/20">
                <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-slate-400">
                  Dist. Pupilar (DP)
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {exam.pd ? `${Number(exam.pd).toFixed(1)} mm` : '-'}
                </span>
              </div>
            </div>

            {exam.prescription_notes ? (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Observações da receita
                </div>
                <p className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs font-semibold leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-400">
                  {exam.prescription_notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
