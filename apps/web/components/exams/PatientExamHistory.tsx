'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DeleteExamButton from '@/components/exams/DeleteExamButton'
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

export default function PatientExamHistory({ exams: initialExams, patientId }: PatientExamHistoryProps) {
  const [exams, setExams] = useState(initialExams)

  useEffect(() => {
    setExams(initialExams)
  }, [initialExams])

  if (exams.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-sm font-semibold flex flex-col items-center gap-2 bg-slate-50/20">
        <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
        <span>Nenhum exame refrativo registrado para este paciente.</span>
        <Link href={`/exams/new?patientId=${patientId}`} className="mt-2">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 font-bold">
            Iniciar Primeiro Exame
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      {exams.map((exam) => (
        <Card key={exam.id} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-slate-50/50 dark:bg-slate-950/40 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Exame Realizado em: {new Date(exam.exam_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-slate-400 font-semibold">
                Examinado por: {exam.examiner.full_name} {exam.examiner.crm ? `(${exam.examiner.crm})` : ''}
              </div>
              <Link href={`/exams/${exam.id}/edit`} prefetch={false}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px] text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </Link>
              <Link href={`/exams/${exam.id}/print`} prefetch={false}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px] text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-500"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
              </Link>
              <DeleteExamButton
                examId={exam.id}
                onDeleted={(deletedExamId) => {
                  setExams((currentExams) => currentExams.filter((currentExam) => currentExam.id !== deletedExamId))
                }}
              />
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-center text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/20 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5">Olho</th>
                    <th className="py-2.5">Esférico (SPH)</th>
                    <th className="py-2.5">Cilíndrico (CYL)</th>
                    <th className="py-2.5">Eixo (AXIS)</th>
                    <th className="py-2.5">Acuidade (VA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-400 bg-slate-50/30 dark:bg-slate-950/10">OD (Direito)</td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                      {exam.od_sph ? `${Number(exam.od_sph) > 0 ? '+' : ''}${Number(exam.od_sph).toFixed(2)}` : 'Plano'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.od_cyl ? `${Number(exam.od_cyl).toFixed(2)}` : '0.00'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.od_axis ? `${exam.od_axis}°` : '-'}
                    </td>
                    <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">{exam.od_va || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-400 bg-slate-50/30 dark:bg-slate-950/10">OE (Esquerdo)</td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                      {exam.oe_sph ? `${Number(exam.oe_sph) > 0 ? '+' : ''}${Number(exam.oe_sph).toFixed(2)}` : 'Plano'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.oe_cyl ? `${Number(exam.oe_cyl).toFixed(2)}` : '0.00'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {exam.oe_axis ? `${exam.oe_axis}°` : '-'}
                    </td>
                    <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">{exam.oe_va || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Adição (ADD)</div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {exam.addition ? `+${Number(exam.addition).toFixed(2)} D` : 'Sem adição'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Dist. Pupilar (DP)</div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {exam.pd ? `${Number(exam.pd).toFixed(1)} mm` : '-'}
                </span>
              </div>
            </div>

            {exam.prescription_notes && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações da Receita</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold bg-slate-50 dark:bg-slate-950/10 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {exam.prescription_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  )
}
