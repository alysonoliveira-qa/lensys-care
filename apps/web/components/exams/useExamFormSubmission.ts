'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildExamPayload,
  type ExamFormPayloadInput,
} from '@/lib/exams/exam-form-mapper'

interface UseExamFormSubmissionParams {
  patientId: string
  examId?: string
  formState: Omit<ExamFormPayloadInput, 'patientId'>
}

export function useExamFormSubmission({
  patientId,
  examId,
  formState,
}: UseExamFormSubmissionParams) {
  const router = useRouter()
  const isEditing = Boolean(examId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.examDate) {
      setError('Por favor, defina a data do exame.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(examId ? `/api/exams/${examId}` : '/api/exams', {
        method: examId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildExamPayload({ patientId, ...formState })),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || (isEditing ? 'Falha ao salvar alterações.' : 'Falha ao lançar exame.'))
      }

      router.push(`/patients/${patientId}`)
      router.refresh()
    } catch (submissionError: unknown) {
      console.error(submissionError)
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : isEditing
            ? 'Erro ao editar exame refrativo.'
            : 'Erro ao registrar exame refrativo.'
      )
    } finally {
      setLoading(false)
    }
  }

  return { error, handleSubmit, loading }
}
