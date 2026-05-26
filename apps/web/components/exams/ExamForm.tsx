'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgeGroup } from '@/hooks/useAgeGroup'
import {
  CUSTOM_VISUAL_ACUITY_OPTION,
  DEFAULT_VISUAL_ACUITY,
  isCommonVisualAcuity,
  PRESCRIPTION_NOTE_OPTIONS,
  QUICK_PRESCRIPTION_OPTIONS,
  type QuickPrescriptionOptionId,
  VISUAL_ACUITY_OPTIONS,
} from '@/lib/exams/exam-options'
import { Sparkles, Loader2, ClipboardCheck, AlertCircle, History } from 'lucide-react'

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

interface VisualAcuityFieldProps {
  value: string
  onChange: (value: string) => void
  customMode: boolean
  onCustomModeChange: (value: boolean) => void
  referenceValue?: string | null
  dataCy: string
}

function VisualAcuityField({
  value,
  onChange,
  customMode,
  onCustomModeChange,
  referenceValue,
  dataCy,
}: VisualAcuityFieldProps) {
  const showingReference = Boolean(referenceValue && !value)
  const selectedValue = showingReference
    ? ''
    : customMode || !isCommonVisualAcuity(value)
      ? CUSTOM_VISUAL_ACUITY_OPTION
      : value

  return (
    <div className="flex min-w-[13rem] items-center justify-center gap-2">
      <select
        value={selectedValue}
        data-cy={dataCy}
        onChange={(e) => {
          if (e.target.value === CUSTOM_VISUAL_ACUITY_OPTION) {
            onCustomModeChange(true)
            return
          }

          onCustomModeChange(false)
          onChange(e.target.value)
        }}
        className={`h-10 w-36 min-w-[9rem] rounded-md border border-slate-200 bg-slate-50 px-2 text-center text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950/20 ${
          showingReference
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-indigo-600 dark:text-indigo-400'
        }`}
      >
        {showingReference && (
          <option value="" disabled>
            Ref. {referenceValue}
          </option>
        )}
        {VISUAL_ACUITY_OPTIONS.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={CUSTOM_VISUAL_ACUITY_OPTION}>Manual</option>
      </select>

      {customMode ? (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder={DEFAULT_VISUAL_ACUITY}
            data-cy={dataCy}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-24 text-center font-bold text-indigo-600 placeholder:text-slate-400 dark:text-indigo-400 dark:placeholder:text-slate-500"
          />
        </div>
      ) : (
        <div className="whitespace-nowrap text-[10px] font-semibold text-slate-400">Padrão: 20/20</div>
      )}
    </div>
  )
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
        body: JSON.stringify({
          patientId: patient.id,
          examDate,
          odSph: odSph ? parseFloat(odSph) : '',
          odCyl: odCyl ? parseFloat(odCyl) : '',
          odAxis: odAxis ? parseInt(odAxis) : '',
          odVa: odVa || null,
          oeSph: oeSph ? parseFloat(oeSph) : '',
          oeCyl: oeCyl ? parseFloat(oeCyl) : '',
          oeAxis: oeAxis ? parseInt(oeAxis) : '',
          oeVa: oeVa || null,
          addition: addition ? parseFloat(addition) : '',
          pd: pd ? parseFloat(pd) : '',
          prescriptionNotes: prescriptionNotes || null,
        }),
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

      <Card className="border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800/80">
          <CardTitle className="text-base font-bold">Graduação Refrativa (OD / OE)</CardTitle>
          <CardDescription className="text-xs text-slate-400">Preencha os valores esféricos, cilíndricos e eixos de cada olho.</CardDescription>
          {hasPreviousExam && (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <History className="h-4 w-4 shrink-0" />
                <span className="font-semibold">Último exame encontrado. Os valores anteriores aparecem como referência.</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 shrink-0 border-amber-500/30 px-3 text-xs font-bold text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                onClick={applyPreviousExam}
                data-cy="use-previous-exam-button"
              >
                Usar exame anterior como base
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/20">
                  <th className="px-4 py-3 text-left">Olho</th>
                  <th className="py-3">Esférico (SPH)</th>
                  <th className="py-3">Cilíndrico (CYL)</th>
                  <th className="py-3">Eixo (AXIS)</th>
                  <th className="py-3">Acuidade (VA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="w-32 bg-slate-50/20 px-4 py-4 text-left font-bold text-slate-500 dark:bg-slate-950/10">
                    OD (Direito)
                  </td>
                  <td className="px-2 py-4">
                    <Input type="number" step="0.25" min="-20" max="20" data-cy="exam-od-sphere-input" placeholder={hasPreviousExam && previousExam?.odSph ? previousExam.odSph : '0.00'} value={odSph} onChange={(e) => setOdSph(e.target.value)} className={`mx-auto w-24 text-center font-bold ${hasPreviousExam && previousExam?.odSph ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="px-2 py-4">
                    <Input type="number" step="0.25" min="-10" max="0" data-cy="exam-od-cylinder-input" placeholder={hasPreviousExam && previousExam?.odCyl ? previousExam.odCyl : '0.00'} value={odCyl} onChange={(e) => setOdCyl(e.target.value)} className={`mx-auto w-24 text-center ${hasPreviousExam && previousExam?.odCyl ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="px-2 py-4">
                    <Input type="number" min="0" max="180" data-cy="exam-od-axis-input" placeholder={hasPreviousExam && previousExam?.odAxis !== null && previousExam?.odAxis !== undefined ? previousExam.odAxis.toString() : 'Eixo'} value={odAxis} onChange={(e) => setOdAxis(e.target.value)} className={`mx-auto w-20 text-center ${hasPreviousExam && previousExam?.odAxis !== null && previousExam?.odAxis !== undefined ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="px-2 py-4 align-middle">
                    <VisualAcuityField
                      value={odVa}
                      onChange={setOdVa}
                      customMode={odVaCustomMode}
                      onCustomModeChange={setOdVaCustomMode}
                      referenceValue={hasPreviousExam ? previousExam?.odVa : null}
                      dataCy="exam-od-visual-acuity-input"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="w-32 bg-slate-50/20 px-4 py-4 text-left font-bold text-slate-500 dark:bg-slate-950/10">
                    OE (Esquerdo)
                  </td>
                  <td className="px-2 py-4">
                    <Input type="number" step="0.25" min="-20" max="20" data-cy="exam-oe-sphere-input" placeholder={hasPreviousExam && previousExam?.oeSph ? previousExam.oeSph : '0.00'} value={oeSph} onChange={(e) => setOeSph(e.target.value)} className={`mx-auto w-24 text-center font-bold ${hasPreviousExam && previousExam?.oeSph ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="px-2 py-4">
                    <Input type="number" step="0.25" min="-10" max="0" data-cy="exam-oe-cylinder-input" placeholder={hasPreviousExam && previousExam?.oeCyl ? previousExam.oeCyl : '0.00'} value={oeCyl} onChange={(e) => setOeCyl(e.target.value)} className={`mx-auto w-24 text-center ${hasPreviousExam && previousExam?.oeCyl ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="px-2 py-4">
                    <Input type="number" min="0" max="180" data-cy="exam-oe-axis-input" placeholder={hasPreviousExam && previousExam?.oeAxis !== null && previousExam?.oeAxis !== undefined ? previousExam.oeAxis.toString() : 'Eixo'} value={oeAxis} onChange={(e) => setOeAxis(e.target.value)} className={`mx-auto w-20 text-center ${hasPreviousExam && previousExam?.oeAxis !== null && previousExam?.oeAxis !== undefined ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="px-2 py-4 align-middle">
                    <VisualAcuityField
                      value={oeVa}
                      onChange={setOeVa}
                      customMode={oeVaCustomMode}
                      onCustomModeChange={setOeVaCustomMode}
                      referenceValue={hasPreviousExam ? previousExam?.oeVa : null}
                      dataCy="exam-oe-visual-acuity-input"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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

            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Observações de Receituário
              </label>
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/20">
                <span className="font-semibold text-slate-500">Opções rápidas:</span>
                {QUICK_PRESCRIPTION_OPTIONS.map((option) => (
                  <label key={option.id} className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      data-cy={option.dataCy}
                      checked={quickNoteSelections[option.id]}
                      onChange={(e) => toggleQuickPrescriptionNote(option.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] font-semibold text-slate-400">
                  Inserir observação padrão
                </div>
                <select
                  value={selectedNoteTemplate}
                  data-cy="standard-note-select"
                  onChange={(e) => {
                    const template = e.target.value
                    setSelectedNoteTemplate(template)
                    if (template) {
                      applyPrescriptionNoteTemplate(template)
                    }
                  }}
                  className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-300"
                >
                  <option value="">Selecionar</option>
                  {PRESCRIPTION_NOTE_OPTIONS.map((template) => (
                    <option key={template.id} value={template.value}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                data-cy="exam-notes-input"
                placeholder="Insira detalhes sobre lentes indicadas (multifocais, antirreflexo, etc.) ou notas de montagem..."
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950/20"
              />
            </div>
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
