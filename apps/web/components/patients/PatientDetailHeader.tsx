import Link from 'next/link'
import { ArrowLeft, Edit3, FilePlus2, FileText, Sparkles } from 'lucide-react'

import DeletePatientButton from '@/components/patients/DeletePatientButton'
import { Button } from '@/components/ui/button'

interface PatientDetailHeaderProps {
  patientId: string
  hasExams: boolean
}

export default function PatientDetailHeader({
  patientId,
  hasExams,
}: PatientDetailHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-indigo-50/90 p-6 shadow-sm shadow-violet-100/50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-indigo-100/60 to-transparent dark:from-indigo-950/20 lg:block" />
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
      <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-6">
          <div>
            <Link
              href="/patients"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Pacientes
            </Link>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-slate-900/80 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Ficha do paciente
            </div>

            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                <FileText className="h-7 w-7 text-indigo-500" />
                <span>Ficha do Paciente</span>
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Acompanhe dados cadastrais, histórico clínico e ações operacionais do paciente em um
                único fluxo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[260px]">
          <Link href={`/exams/new?patientId=${patientId}`}>
            <Button
              className="h-11 w-full gap-2 rounded-xl bg-indigo-600 font-semibold shadow-lg shadow-indigo-500/15 hover:bg-indigo-500"
              data-cy="new-exam-button"
            >
              <FilePlus2 className="h-4.5 w-4.5" />
              Lançar Novo Exame
            </Button>
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/patients/${patientId}/edit`} className="flex-1">
              <Button
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl border-slate-200 font-semibold dark:border-slate-800"
                data-cy="edit-patient-button"
              >
                <Edit3 className="h-4.5 w-4.5" />
                Editar Paciente
              </Button>
            </Link>
            <DeletePatientButton patientId={patientId} hasExams={hasExams} />
          </div>
        </div>
      </div>
    </section>
  )
}
