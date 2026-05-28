'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

const DELETE_CONFIRMATION_LINES = [
  'Esta ação não pode ser desfeita.',
  'Só é possível excluir pacientes sem exames registrados.',
]

export default function DeletePatientButton({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/patients/${patientId}`, { method: 'DELETE' })
      const data = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível excluir o paciente.')
      }

      router.push('/patients')
      router.refresh()
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o paciente.')
      setIsDeleting(false)
      setIsConfirmOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="destructive"
        className="gap-2 font-bold"
        onClick={() => {
          setError(null)
          setIsConfirmOpen(true)
        }}
        disabled={isDeleting}
        data-cy="delete-patient-button"
      >
        <Trash2 className="h-4.5 w-4.5" />
        Excluir paciente
      </Button>

      {isConfirmOpen && (
        <div className="max-w-sm rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-slate-700 shadow-sm dark:text-slate-200">
          <p className="font-semibold text-red-600 dark:text-red-400">Confirmar exclusão definitiva?</p>
          {DELETE_CONFIRMATION_LINES.map((line) => (
            <p key={line} className="mt-2 text-sm leading-6">
              {line}
            </p>
          ))}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="gap-2 font-semibold"
              onClick={handleDelete}
              disabled={isDeleting}
              data-cy="confirm-delete-patient-button"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar exclusão'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="font-semibold"
              onClick={() => {
                if (isDeleting) {
                  return
                }

                setIsConfirmOpen(false)
              }}
              disabled={isDeleting}
              data-cy="cancel-delete-patient-button"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-sm rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
