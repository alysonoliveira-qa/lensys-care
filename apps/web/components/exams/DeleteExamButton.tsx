'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteExamButtonProps {
  examId: string
  onDeleted?: (examId: string) => void
}

export default function DeleteExamButton({ examId, onDeleted }: DeleteExamButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este exame? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/exams/${examId}`, { method: 'DELETE' })
      const data = await response.json() as { message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Nao foi possivel excluir o exame.')
      }

      onDeleted?.(examId)
      router.refresh()
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : 'Nao foi possivel excluir o exame.')
      setDeleting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-[11px] text-slate-400 hover:bg-red-500/10 hover:text-red-400"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {deleting ? 'Excluindo...' : 'Excluir exame'}
    </Button>
  )
}
