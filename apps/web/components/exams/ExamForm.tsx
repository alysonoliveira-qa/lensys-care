'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgeGroup } from '@/hooks/useAgeGroup'
import ExamRefractionFields from '@/components/exams/ExamRefractionFields'
import PrescriptionNotesSection from '@/components/exams/PrescriptionNotesSection'
import {
  DEFAULT_VISUAL_ACUITY,
  isCommonVisualAcuity,
  QUICK_PRESCRIPTION_OPTIONS,
  type QuickPrescriptionOptionId,
} from '@/lib/exams/exam-options'
import { buildExamPayload } from '@/lib/exams/exam-form-mapper'
import { Sparkles, Loader2, ClipboardCheck, AlertCircle } from 'lucide-react'

export interface PatientData {
  id: string
  full_name: string
  dob: Date | string
  phone: string | null
  email: string | null
}

export interface EditableExamData {
  id: string
  examDate: string
  odSph: string | null
  odCyl: string | null
  odAxis: number | null
  odVa: string | null
  oeSph: string | null
  oeCyl: string | null
  oeAxis: number | null
  oeVa: string | null
  addition: string | null
  pd: string | null
  prescriptionNotes: string | null
}

interface ExamFormProps {
  patient: PatientData
  exam?: EditableExamData
  previousExam?: Omit<EditableExamData, 'id' | 'examDate'> | null
}

export default function ExamForm({ patient, exam, previousExam }: ExamFormProps) {
  const router = useRouter()
  const isEditing = Boolean(exam)
  const hasPreviousExam = !isEditing && Boolean(previousExam)

  const quickPrescriptionNotes = useMemo(
    () =>
      Object.fromEntries(
        QUICK_PRESCRIPTION_OPTIONS.map((option) => [option.id, option.text])
      ) as Record<QuickPrescriptionOptionId, string>,
    []
  )

  const [examDate, setExamDate] = useState(exam?.examDate ?? new Date().toISOString().split('T')[0])
  const [odSph, setOdSph] = useState(exam?.odSph ?? '')
  const [odCyl, setOdCyl] = useState(exam?.odCyl ?? '')
  const [odAxis, setOdAxis] = useState(exam?.odAxis?.toString() ?? '')
  const [odVa, setOdVa] = useState(exam?.odVa ?? (hasPreviousExam && previousExam?.odVa ? '' : DEFAULT_VISUAL_ACUITY))
  const [oeSph, setOeSph] = useState(exam?.oeSph ?? '')
  const [oeCyl, setOeCyl] = useState(exam?.oeCyl ?? '')
  const [oeAxis, setOeAxis] = useState(exam?.oeAxis?.toString() ?? '')
  const [oeVa, setOeVa] = useState(exam?.oeVa ?? (hasPreviousExam && previousExam?.oeVa ? '' : DEFAULT_VISUAL_ACUITY))
  const [odVaCustomMode, setOdVaCustomMode] = useState(Boolean(exam?.odVa && !isCommonVisualAcuity(exam.odVa)))
  const [oeVaCustomMode, setOeVaCustomMode] = useState(Boolean(exam?.oeVa && !isCommonVisualAcuity(exam.oeVa)))
  const [addition, setAddition] = useState(exam?.addition ?? '')
  const [pd, setPd] = useState(exam?.pd ?? '')
  const [prescriptionNotes, setPrescriptionNotes] = useState(exam?.prescriptionNotes ?? '')
  const [selectedNoteTemplate, setSelectedNoteTemplate] = useState('')
  const [quickNoteSelections, setQuickNoteSelections] = useState({
    antirreflexo: Boolean(exam?.prescriptionNotes?.includes(quickPrescriptionNotes.antirreflexo)),
    filtroAzul: Boolean(exam?.prescriptionNotes?.includes(quickPrescriptionNotes.filtroAzul)),
    fotossensivel: Boolean(exam?.prescriptionNotes?.includes(quickPrescriptionNotes.fotossensivel)),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { age, ageGroup, suggestedAddition } = useAgeGroup(patient.dob.toString())

  useEffect(() => {
    if (!isEditing && suggestedAddition > 0) {
      setAddition(suggestedAddition.toString())
    }
  }, [isEditing, suggestedAddition])

  const applySuggestedAddition = () => {
    setAddition(suggestedAddition.toString())
  }

  const applyPreviousExam = () => {
    if (!previousExam) {
      return
    }

    setOdSph(previousExam.odSph ?? '')
    setOdCyl(previousExam.odCyl ?? '')
    setOdAxis(previousExam.odAxis?.toString() ?? '')
    setOdVa(previousExam.odVa ?? '')
    setOeSph(previousExam.oeSph ?? '')
    setOeCyl(previousExam.oeCyl ?? '')
    setOeAxis(previousExam.oeAxis?.toString() ?? '')
    setOeVa(previousExam.oeVa ?? '')
    setOdVaCustomMode(Boolean(previousExam.odVa && !isCommonVisualAcuity(previousExam.odVa)))
    setOeVaCustomMode(Boolean(previousExam.oeVa && !isCommonVisualAcuity(previousExam.oeVa)))
    setAddition(previousExam.addition ?? '')
    setPd(previousExam.pd ?? '')
  }

  const applyPrescriptionNoteTemplate = (template: string) => {
    setPrescriptionNotes((currentNotes) => {
      if (!currentNotes.trim()) {
        return template
      }

      return `${currentNotes.trimEnd()}\n${template}`
    })
    setSelectedNoteTemplate('')
  }

  const selectPrescriptionNoteTemplate = (template: string) => {
    setSelectedNoteTemplate(template)
    if (template) {
      applyPrescriptionNoteTemplate(template)
    }
  }

  const toggleQuickPrescriptionNote = (
    key: QuickPrescriptionOptionId,
    checked: boolean
  ) => {
    const note = quickPrescriptionNotes[key]

    setQuickNoteSelections((currentSelections) => ({
      ...currentSelections,
      [key]: checked,
    }))

    setPrescriptionNotes((currentNotes) => {
      const lines = currentNotes
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (checked) {
        if (lines.includes(note)) {
          return currentNotes
        }

        return lines.length === 0 ? note : `${currentNotes.trimEnd()}\n${note}`
      }

      return lines.filter((line) => line !== note).join('\n')
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examDate) {
      setError('Por favor, defina a data do exame.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(exam ? `/api/exams/${exam.id}` : '/api/exams', {
        method: exam ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildExamPayload({
          patientId: patient.id,
          examDate,
          odSph,
          odCyl,
          odAxis,
          odVa,
          oeSph,
          oeCyl,
          oeAxis,
          oeVa,
          addition,
          pd,
          prescriptionNotes,
        })),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || (exam ? 'Falha ao salvar alterações.' : 'Falha ao lançar exame.'))
      }

      router.push(`/patients/${patient.id}`)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : exam ? 'Erro ao editar exame refrativo.' : 'Erro ao registrar exame refrativo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 select-none" data-cy="exam-form">
      {error && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-400">
          <AlertCircle className="h-4.5 w-4.5" />
          {error}
        </div>
      )}

      <Card className="relative overflow-hidden border-slate-800 bg-slate-900 text-white shadow-md">
        <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-44 w-44 rounded-full bg-violet-600/15 blur-2xl" />
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isEditing ? 'Editar Exame Refrativo' : 'Prontuário de Refração'}
            </span>
            <h3 className="text-xl font-bold text-slate-100">{patient.full_name}</h3>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>{age} anos ({new Date(patient.dob).toLocaleDateString('pt-BR')})</span>
              <span>•</span>
              <Badge variant="premium" className="px-2 py-0 text-[9px] uppercase">{ageGroup}</Badge>
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Data da Consulta</label>
            <Input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="h-9 w-40 border-slate-800 bg-slate-950/50 text-xs text-white focus:ring-violet-500/20"
              required
            />
          </div>
        </CardContent>
      </Card>

      <ExamRefractionFields
        hasPreviousExam={hasPreviousExam}
        onApplyPreviousExam={applyPreviousExam}
        odSph={odSph}
        onOdSphChange={setOdSph}
        odCyl={odCyl}
        onOdCylChange={setOdCyl}
        odAxis={odAxis}
        onOdAxisChange={setOdAxis}
        odVa={odVa}
        onOdVaChange={setOdVa}
        odVaCustomMode={odVaCustomMode}
        onOdVaCustomModeChange={setOdVaCustomMode}
        oeSph={oeSph}
        onOeSphChange={setOeSph}
        oeCyl={oeCyl}
        onOeCylChange={setOeCyl}
        oeAxis={oeAxis}
        onOeAxisChange={setOeAxis}
        oeVa={oeVa}
        onOeVaChange={setOeVa}
        oeVaCustomMode={oeVaCustomMode}
        onOeVaCustomModeChange={setOeVaCustomMode}
        previousOdSph={previousExam?.odSph}
        previousOdCyl={previousExam?.odCyl}
        previousOdAxis={previousExam?.odAxis}
        previousOdVa={previousExam?.odVa}
        previousOeSph={previousExam?.oeSph}
        previousOeCyl={previousExam?.oeCyl}
        previousOeAxis={previousExam?.oeAxis}
        previousOeVa={previousExam?.oeVa}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Medidas de Suporte</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Adição por Presbiopia (ADD)
              </label>
              <Input type="number" step="0.25" min="0" max="4" data-cy="exam-addition-input" placeholder={hasPreviousExam && previousExam?.addition ? previousExam.addition : '+0.00'} value={addition} onChange={(e) => setAddition(e.target.value)} className={`border-slate-200 bg-slate-50 font-bold dark:border-slate-800 dark:bg-slate-950/20 ${hasPreviousExam && previousExam?.addition ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Distância Pupilar (DP) em mm
              </label>
              <Input type="number" step="0.5" min="45" max="80" data-cy="exam-pd-input" placeholder={hasPreviousExam && previousExam?.pd ? previousExam.pd : 'ex: 63.5'} value={pd} onChange={(e) => setPd(e.target.value)} className={`border-slate-200 bg-slate-50 font-semibold dark:border-slate-800 dark:bg-slate-950/20 ${hasPreviousExam && previousExam?.pd ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
            </div>

            <PrescriptionNotesSection
              notes={prescriptionNotes}
              onNotesChange={setPrescriptionNotes}
              selectedNoteTemplate={selectedNoteTemplate}
              onSelectStandardNote={selectPrescriptionNoteTemplate}
              quickNoteSelections={quickNoteSelections}
              onToggleQuickNote={toggleQuickPrescriptionNote}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-1">
          <CardHeader className="pb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Assistente Clínico</span>
            <CardTitle className="flex items-center gap-1 text-sm font-extrabold">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              <span>Cálculo de Adição</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-grow flex-col justify-between space-y-4 pb-6">
            <div className="space-y-3.5 pt-2">
              <p className="text-xs leading-relaxed text-slate-500">
                Lensys Care calcula automaticamente o valor da adição refrativa sugerida com base na idade atual do paciente ({age} anos).
              </p>

              <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/20">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Faixa Etária:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{ageGroup}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Adição Recomendada:</span>
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                    {suggestedAddition > 0 ? `+${suggestedAddition.toFixed(2)} D` : 'Não requer'}
                  </span>
                </div>
              </div>
            </div>

            {suggestedAddition > 0 && addition !== suggestedAddition.toString() && (
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full border-indigo-500/30 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                onClick={applySuggestedAddition}
              >
                Aplicar Adição Sugerida
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
        <Link href={`/patients/${patient.id}`}>
          <Button type="button" variant="outline" className="h-10 border-slate-200 px-6 font-semibold dark:border-slate-800" disabled={loading}>
            Cancelar
          </Button>
        </Link>
        <Button
          type="submit"
          className="flex h-10 items-center gap-1.5 bg-indigo-600 px-8 font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-500"
          disabled={loading}
          data-cy="save-exam-button"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditing ? 'Salvando...' : 'Lançando exame...'}
            </>
          ) : (
            <>
              <ClipboardCheck className="h-4.5 w-4.5" />
              {isEditing ? 'Salvar alterações' : 'Finalizar e Registrar Exame'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
