import Link from 'next/link'
import { ArrowLeft, Edit3, FilePlus2 } from 'lucide-react'

import DeletePatientButton from '@/components/patients/DeletePatientButton'
import { Button } from '@/components/ui/button'

interface PatientDetailHeaderProps {
  patientId: string
}

export default function PatientDetailHeader({ patientId }: PatientDetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <Link href="/patients" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Pacientes
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/patients/${patientId}/edit`}>
          <Button
            variant="outline"
            className="gap-2 border-slate-200 font-bold dark:border-slate-800"
            data-cy="edit-patient-button"
          >
            <Edit3 className="h-4.5 w-4.5" />
            Editar Paciente
          </Button>
        </Link>
        <DeletePatientButton patientId={patientId} />
        <Link href={`/exams/new?patientId=${patientId}`}>
          <Button className="bg-indigo-600 hover:bg-indigo-500 font-bold gap-2 shadow-lg shadow-indigo-500/10" data-cy="new-exam-button">
            <FilePlus2 className="h-4.5 w-4.5" />
            Lancar Novo Exame
          </Button>
        </Link>
      </div>
    </div>
  )
}
