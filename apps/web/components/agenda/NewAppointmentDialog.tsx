'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Search, UserRound, X } from 'lucide-react'

import {
  createAppointment,
  searchPatients,
  type AppointmentActionState,
} from '@/app/(dashboard)/agenda/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReferrerOption } from '@/lib/referrers/referrers-mappers'
import {
  PATIENT_SEARCH_MIN_LENGTH,
  type PatientSearchResult,
} from '@/lib/patients/patient-search'

const IDLE_STATE: AppointmentActionState = { status: 'idle', message: '' }
const SEARCH_DEBOUNCE_MS = 300

interface NewAppointmentDialogProps {
  date: string
  referrerOptions: ReferrerOption[]
  onClose: () => void
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="bg-indigo-600 font-semibold hover:bg-indigo-500"
      disabled={pending}
      data-cy="appointment-submit"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Agendar
    </Button>
  )
}

export default function NewAppointmentDialog({
  date,
  referrerOptions,
  onClose,
}: NewAppointmentDialogProps) {
  const [state, formAction] = useFormState(createAppointment, IDLE_STATE)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<PatientSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null)

  useEffect(() => {
    if (state.status === 'success') {
      onClose()
    }
  }, [state.status, onClose])

  useEffect(() => {
    if (selectedPatient || term.trim().length < PATIENT_SEARCH_MIN_LENGTH) {
      setResults([])
      setIsSearching(false)
      return
    }

    let active = true
    setIsSearching(true)

    const timer = setTimeout(async () => {
      const found = await searchPatients(term)

      if (active) {
        setResults(found)
        setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [term, selectedPatient])

  const showEmptyResults =
    !selectedPatient &&
    !isSearching &&
    term.trim().length >= PATIENT_SEARCH_MIN_LENGTH &&
    results.length === 0

  const labelClassName =
    'text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400'
  const fieldClassName =
    'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        data-cy="new-appointment-dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nova consulta</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sem horário, o paciente entra na fila do dia por ordem de marcação.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fechar"
            data-cy="close-appointment-dialog"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="patient_id" value={selectedPatient?.id ?? ''} />

          <div className="space-y-2">
            <label className={labelClassName} htmlFor="appointment-patient-search">
              Paciente
            </label>

            {selectedPatient ? (
              <div
                className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2.5 dark:border-indigo-900/60 dark:bg-indigo-950/30"
                data-cy="appointment-selected-patient"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <UserRound className="h-4 w-4 text-indigo-500" />
                  {selectedPatient.full_name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => {
                    setSelectedPatient(null)
                    setTerm('')
                  }}
                  data-cy="appointment-clear-patient"
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Input
                    id="appointment-patient-search"
                    type="text"
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className={`${fieldClassName} pl-10`}
                    autoComplete="off"
                    data-cy="appointment-patient-search"
                  />
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  {isSearching ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  ) : null}
                </div>

                {results.length > 0 ? (
                  <ul
                    className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800"
                    data-cy="appointment-patient-results"
                  >
                    {results.map((patient) => (
                      <li key={patient.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(patient)}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-950/40"
                          data-cy="appointment-patient-option"
                        >
                          <span className="font-semibold">{patient.full_name}</span>
                          {patient.phone ? (
                            <span className="text-xs text-slate-400">{patient.phone}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {showEmptyResults ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nenhum paciente encontrado.{' '}
                    <Link
                      href="/patients/new"
                      className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      data-cy="appointment-new-patient-link"
                    >
                      Cadastrar novo
                    </Link>
                    .
                  </p>
                ) : null}
              </>
            )}

            {state.fieldErrors?.patientId ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {state.fieldErrors.patientId}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={labelClassName} htmlFor="appointment-date">
                Data
              </label>
              <input
                id="appointment-date"
                type="date"
                name="appointment_date"
                defaultValue={date}
                required
                className={fieldClassName}
                data-cy="appointment-date-input"
              />
              {state.fieldErrors?.date ? (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {state.fieldErrors.date}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className={labelClassName} htmlFor="appointment-time">
                Hora (opcional)
              </label>
              <input
                id="appointment-time"
                type="time"
                name="scheduled_time"
                className={fieldClassName}
                data-cy="appointment-time-input"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Vazio = fila do dia.
              </p>
              {state.fieldErrors?.time ? (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {state.fieldErrors.time}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClassName} htmlFor="appointment-referrer">
              Indicante (opcional)
            </label>
            <select
              id="appointment-referrer"
              name="referrer_id"
              defaultValue=""
              className={fieldClassName}
              data-cy="appointment-referrer-select"
            >
              {referrerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {state.status === 'error' ? (
            <div
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300"
              data-cy="appointment-form-error"
            >
              {state.message}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
