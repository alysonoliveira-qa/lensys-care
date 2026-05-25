'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Sparkles, UserPen, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAgeGroup } from '@/hooks/useAgeGroup'

const TODAY = new Date().toISOString().split('T')[0]
const FUTURE_DOB_MESSAGE = 'A data de nascimento nao pode ser futura.'

type PatientFormValues = {
  fullName: string
  dob: string
  phone: string
  email: string
  notes: string
}

interface PatientFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<PatientFormValues>
  patientId?: string
}

export default function PatientForm({
  mode,
  initialValues,
  patientId,
}: PatientFormProps) {
  const router = useRouter()
  const isEditMode = mode === 'edit'

  const [fullName, setFullName] = useState(initialValues?.fullName ?? '')
  const [dob, setDob] = useState(initialValues?.dob ?? '')
  const [phone, setPhone] = useState(initialValues?.phone ?? '')
  const [email, setEmail] = useState(initialValues?.email ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { age, ageGroup, suggestedAddition } = useAgeGroup(dob)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fullName || !dob) {
      setError('Por favor, preencha todos os campos obrigatorios.')
      return
    }

    if (dob > TODAY) {
      setError(FUTURE_DOB_MESSAGE)
      return
    }

    if (isEditMode && !patientId) {
      setError('Paciente nao identificado para atualizacao.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/patients', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          fullName,
          dob,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao salvar paciente.')
      }

      const redirectPatientId = isEditMode ? patientId : data.patient.id

      router.push(`/patients/${redirectPatientId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro de conexao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 select-none">
      <div className="flex flex-col gap-2">
        <Link
          href={isEditMode && patientId ? `/patients/${patientId}` : '/patients'}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEditMode ? 'Voltar para a Ficha do Paciente' : 'Voltar para Pacientes'}
        </Link>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          {isEditMode ? <UserPen className="h-6 w-6 text-indigo-500" /> : <UserPlus className="h-6 w-6 text-indigo-500" />}
          <span>{isEditMode ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}</span>
        </h2>
        <p className="text-sm text-slate-500">
          {isEditMode
            ? 'Atualize apenas os dados cadastrais basicos do paciente.'
            : 'Preencha os dados cadastrais basicos do paciente para iniciar o prontuario.'}
        </p>
      </div>

      <Card className="border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            data-cy={isEditMode ? 'edit-patient-form' : 'patient-form'}
          >
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nome Completo do Paciente *
                </label>
                <Input
                  type="text"
                  data-cy="patient-name-input"
                  placeholder="ex: Joao da Silva Santos"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-10 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Data de Nascimento *
                </label>
                <Input
                  type="date"
                  data-cy="patient-birthdate-input"
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                  className="h-10 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20"
                  max={TODAY}
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col justify-end space-y-2 md:col-span-1">
                {dob && age !== null && ageGroup ? (
                  <div className="flex h-10 items-center justify-between rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-3.5">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Idade: <span className="font-bold">{age} anos</span>
                    </span>
                    <Badge variant="premium" className="py-0.5 text-[9px]">
                      {ageGroup}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex h-10 items-center rounded-xl border border-slate-100 bg-slate-50/50 px-4 text-xs italic text-slate-400 dark:border-slate-800 dark:bg-slate-950/10">
                    Insira a data de nascimento para calcular a idade
                  </div>
                )}
              </div>

              {dob && age !== null && age >= 40 && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 md:col-span-2">
                  <Sparkles className="h-4.5 w-4.5 flex-shrink-0 text-emerald-500" />
                  <span>
                    Paciente com presbiopia. Adicao presbiopica sugerida:{' '}
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{suggestedAddition.toFixed(2)} D
                    </span>
                  </span>
                </div>
              )}

              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Celular / WhatsApp
                </label>
                <Input
                  type="tel"
                  data-cy="patient-phone-input"
                  placeholder="ex: (11) 99999-9999"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-10 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  E-mail
                </label>
                <Input
                  type="email"
                  data-cy="patient-email-input"
                  placeholder="ex: joao@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Observacoes Clinicas Gerais
                </label>
                <textarea
                  data-cy="patient-notes-input"
                  placeholder="Insira patologias previas, historico familiar ou outras notas clinicas relevantes..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/20"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
              <Link href={isEditMode && patientId ? `/patients/${patientId}` : '/patients'}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-slate-200 px-6 font-semibold dark:border-slate-800"
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                className="h-10 bg-indigo-600 px-8 font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-500"
                disabled={loading}
                data-cy={isEditMode ? 'update-patient-button' : 'save-patient-button'}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEditMode ? (
                  'Salvar Alteracoes'
                ) : (
                  'Salvar Paciente'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
