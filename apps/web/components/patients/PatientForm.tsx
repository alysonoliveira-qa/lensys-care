'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarPlus, Loader2, Sparkles, UserPen, UserPlus } from 'lucide-react'
import { createAppointment } from '@/app/(dashboard)/agenda/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAgeGroup } from '@/hooks/useAgeGroup'
import { todayAppointmentDate } from '@/lib/appointments/appointments-normalizers'
import { buildPatientPayload, type PatientFormValues } from '@/lib/patients/patient-form-mapper'
import type { ReferrerOption } from '@/lib/referrers/referrers-mappers'

const TODAY = new Date().toISOString().split('T')[0]
const FUTURE_DOB_MESSAGE = 'A data de nascimento não pode ser futura.'

interface PatientFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<PatientFormValues>
  patientId?: string
  /** Indicantes ativos — só usados na seção "Agendar primeira consulta" (modo create). */
  referrerOptions?: ReferrerOption[]
}

export default function PatientForm({
  mode,
  initialValues,
  patientId,
  referrerOptions = [],
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

  // "Agendar primeira consulta" — só no cadastro.
  const [shouldSchedule, setShouldSchedule] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState(todayAppointmentDate())
  const [appointmentTime, setAppointmentTime] = useState('')
  const [appointmentReferrerId, setAppointmentReferrerId] = useState('')
  /** Paciente criado cujo agendamento falhou: não desfazemos o paciente nem reenviamos. */
  const [scheduleFailure, setScheduleFailure] = useState<{
    patientId: string
    message: string
  } | null>(null)

  const { age, ageGroup, suggestedAddition } = useAgeGroup(dob)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fullName || !dob) {
      setError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    if (dob > TODAY) {
      setError(FUTURE_DOB_MESSAGE)
      return
    }

    if (isEditMode && !patientId) {
      setError('Paciente não identificado para atualização.')
      return
    }

    if (!isEditMode && shouldSchedule && !appointmentDate) {
      setError('Informe a data da primeira consulta ou desmarque o agendamento.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/patients', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPatientPayload({
          patientId,
          fullName,
          dob,
          phone,
          email,
          notes,
        })),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao salvar paciente.')
      }

      const redirectPatientId = isEditMode ? patientId : data.patient.id

      // Paciente já existe daqui em diante: uma falha no agendamento NÃO o desfaz.
      if (!isEditMode && shouldSchedule) {
        const appointmentForm = new FormData()
        appointmentForm.set('patient_id', data.patient.id)
        appointmentForm.set('appointment_date', appointmentDate)
        appointmentForm.set('scheduled_time', appointmentTime)
        appointmentForm.set('referrer_id', appointmentReferrerId)

        const appointmentResult = await createAppointment(
          { status: 'idle', message: '' },
          appointmentForm
        )

        if (appointmentResult.status === 'error') {
          setScheduleFailure({
            patientId: data.patient.id,
            message: appointmentResult.message,
          })
          setLoading(false)
          return
        }
      }

      // Mantém `loading` ativo durante a navegação: `router.push` não espera a rota
      // destino renderizar. Resetar aqui faria o botão piscar de volta ao estado
      // ocioso no intervalo. O componente desmonta ao trocar de rota.
      router.push(`/patients/${redirectPatientId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.')
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
            ? 'Atualize apenas os dados cadastrais básicos do paciente.'
            : 'Preencha os dados cadastrais básicos do paciente para iniciar o prontuário.'}
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
                  placeholder="ex: João da Silva Santos"
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
                    Paciente com presbiopia. Adição presbiópica sugerida:{' '}
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
                  Observações Clínicas Gerais
                </label>
                <textarea
                  data-cy="patient-notes-input"
                  placeholder="Insira patologias prévias, histórico familiar ou outras notas clínicas relevantes..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/20"
                  disabled={loading}
                />
              </div>
            </div>

            {!isEditMode ? (
              <div className="space-y-3 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={shouldSchedule}
                    onChange={(event) => setShouldSchedule(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={loading}
                    data-cy="schedule-first-appointment-checkbox"
                  />
                  <CalendarPlus className="h-4 w-4 text-indigo-500" />
                  Agendar primeira consulta
                </label>

                {shouldSchedule ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Data *
                      </label>
                      <Input
                        type="date"
                        value={appointmentDate}
                        onChange={(event) => setAppointmentDate(event.target.value)}
                        className="h-10 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/20"
                        disabled={loading}
                        data-cy="first-appointment-date-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Hora (opcional)
                      </label>
                      <Input
                        type="time"
                        value={appointmentTime}
                        onChange={(event) => setAppointmentTime(event.target.value)}
                        className="h-10 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/20"
                        disabled={loading}
                        data-cy="first-appointment-time-input"
                      />
                      <p className="text-[11px] text-slate-400">Vazio = fila do dia.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Indicante (opcional)
                      </label>
                      <select
                        value={appointmentReferrerId}
                        onChange={(event) => setAppointmentReferrerId(event.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950/20"
                        disabled={loading}
                        data-cy="first-appointment-referrer-select"
                      >
                        {referrerOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {scheduleFailure ? (
              <div
                className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-700 dark:text-amber-300"
                data-cy="first-appointment-warning"
              >
                <p>
                  Paciente cadastrado com sucesso, mas não foi possível agendar a consulta:{' '}
                  {scheduleFailure.message} Você pode agendar depois pela Agenda — o cadastro
                  não foi perdido.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/patients/${scheduleFailure.patientId}`}>
                    <Button type="button" className="h-9 bg-indigo-600 px-4 font-bold hover:bg-indigo-500">
                      Ir para a ficha do paciente
                    </Button>
                  </Link>
                  <Link href="/agenda">
                    <Button type="button" variant="outline" className="h-9 px-4 font-bold">
                      Abrir a Agenda
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
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
                  'Salvar Alterações'
                ) : (
                  'Salvar Paciente'
                )}
              </Button>
            </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
