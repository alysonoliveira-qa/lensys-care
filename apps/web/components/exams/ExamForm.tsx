'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgeGroup } from '@/hooks/useAgeGroup'
import { Sparkles, Loader2, ClipboardCheck, AlertCircle, History } from 'lucide-react'

const VISUAL_ACUITY_OPTIONS = [
  '20/20',
  '20/25',
  '20/30',
  '20/40',
  '20/50',
  '20/60',
  '20/80',
  '20/100',
  '20/200',
] as const

const CUSTOM_VISUAL_ACUITY_OPTION = '__custom__'
const PRESCRIPTION_NOTE_TEMPLATES = [
  'Não fazer em policarbonato.',
  'Sugiro lentes Hoya, Zeiss, Essilor, Freestyle ou Haytek.',
  'Recomendo lentes com antirreflexo.',
  'Retorno recomendado em 12 meses.',
  'Orientar paciente sobre adaptação das lentes.',
] as const

function isCommonVisualAcuity(value: string) {
  return VISUAL_ACUITY_OPTIONS.includes(value as (typeof VISUAL_ACUITY_OPTIONS)[number])
}

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
}

function VisualAcuityField({
  value,
  onChange,
  customMode,
  onCustomModeChange,
  referenceValue,
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
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM_VISUAL_ACUITY_OPTION}>Manual</option>
      </select>

      {customMode ? (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="20/20"
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

  const [examDate, setExamDate] = useState(exam?.examDate ?? new Date().toISOString().split('T')[0])
  const [odSph, setOdSph] = useState(exam?.odSph ?? '')
  const [odCyl, setOdCyl] = useState(exam?.odCyl ?? '')
  const [odAxis, setOdAxis] = useState(exam?.odAxis?.toString() ?? '')
  const [odVa, setOdVa] = useState(exam?.odVa ?? (hasPreviousExam && previousExam?.odVa ? '' : '20/20'))
  const [oeSph, setOeSph] = useState(exam?.oeSph ?? '')
  const [oeCyl, setOeCyl] = useState(exam?.oeCyl ?? '')
  const [oeAxis, setOeAxis] = useState(exam?.oeAxis?.toString() ?? '')
  const [oeVa, setOeVa] = useState(exam?.oeVa ?? (hasPreviousExam && previousExam?.oeVa ? '' : '20/20'))
  const [odVaCustomMode, setOdVaCustomMode] = useState(Boolean(exam?.odVa && !isCommonVisualAcuity(exam.odVa)))
  const [oeVaCustomMode, setOeVaCustomMode] = useState(Boolean(exam?.oeVa && !isCommonVisualAcuity(exam.oeVa)))
  const [addition, setAddition] = useState(exam?.addition ?? '')
  const [pd, setPd] = useState(exam?.pd ?? '')
  const [prescriptionNotes, setPrescriptionNotes] = useState(exam?.prescriptionNotes ?? '')
  const [selectedNoteTemplate, setSelectedNoteTemplate] = useState('')
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
    <form onSubmit={handleSubmit} className="space-y-6 select-none">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
          <AlertCircle className="h-4.5 w-4.5" />
          {error}
        </div>
      )}

      <Card className="bg-slate-900 border-slate-800 text-white relative overflow-hidden shadow-md">
        <div className="absolute right-[-10%] top-[-30%] w-44 h-44 rounded-full bg-violet-600/15 blur-2xl pointer-events-none" />
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {isEditing ? 'Editar Exame Refrativo' : 'Prontuário de Refração'}
            </span>
            <h3 className="text-xl font-bold text-slate-100">{patient.full_name}</h3>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <span>{age} anos ({new Date(patient.dob).toLocaleDateString('pt-BR')})</span>
              <span>•</span>
              <Badge variant="premium" className="text-[9px] py-0 px-2 uppercase">{ageGroup}</Badge>
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data da Consulta</label>
            <Input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="bg-slate-950/50 border-slate-800 text-white focus:ring-violet-500/20 h-9 w-40 text-xs"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <CardTitle className="text-base font-bold">Graduação Refrativa (OD / OE)</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Preencha os valores esféricos, cilíndricos e eixos de cada olho.</CardDescription>
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
                <tr className="bg-slate-50 dark:bg-slate-950/20 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4 text-left">Olho</th>
                  <th className="py-3">Esférico (SPH)</th>
                  <th className="py-3">Cilíndrico (CYL)</th>
                  <th className="py-3">Eixo (AXIS)</th>
                  <th className="py-3">Acuidade (VA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="w-32 bg-slate-50/20 py-4 px-4 text-left font-bold text-slate-500 dark:bg-slate-950/10">
                    OD (Direito)
                  </td>
                  <td className="py-4 px-2">
                    <Input type="number" step="0.25" min="-20" max="20" placeholder={hasPreviousExam && previousExam?.odSph ? previousExam.odSph : '0.00'} value={odSph} onChange={(e) => setOdSph(e.target.value)} className={`w-24 mx-auto text-center font-bold ${hasPreviousExam && previousExam?.odSph ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="py-4 px-2">
                    <Input type="number" step="0.25" min="-10" max="0" placeholder={hasPreviousExam && previousExam?.odCyl ? previousExam.odCyl : '0.00'} value={odCyl} onChange={(e) => setOdCyl(e.target.value)} className={`w-24 mx-auto text-center ${hasPreviousExam && previousExam?.odCyl ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="py-4 px-2">
                    <Input type="number" min="0" max="180" placeholder={hasPreviousExam && previousExam?.odAxis !== null && previousExam?.odAxis !== undefined ? previousExam.odAxis.toString() : 'Eixo'} value={odAxis} onChange={(e) => setOdAxis(e.target.value)} className={`w-20 mx-auto text-center ${hasPreviousExam && previousExam?.odAxis !== null && previousExam?.odAxis !== undefined ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="py-4 px-2 align-middle">
                    <VisualAcuityField
                      value={odVa}
                      onChange={setOdVa}
                      customMode={odVaCustomMode}
                      onCustomModeChange={setOdVaCustomMode}
                      referenceValue={hasPreviousExam ? previousExam?.odVa : null}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="w-32 bg-slate-50/20 py-4 px-4 text-left font-bold text-slate-500 dark:bg-slate-950/10">
                    OE (Esquerdo)
                  </td>
                  <td className="py-4 px-2">
                    <Input type="number" step="0.25" min="-20" max="20" placeholder={hasPreviousExam && previousExam?.oeSph ? previousExam.oeSph : '0.00'} value={oeSph} onChange={(e) => setOeSph(e.target.value)} className={`w-24 mx-auto text-center font-bold ${hasPreviousExam && previousExam?.oeSph ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="py-4 px-2">
                    <Input type="number" step="0.25" min="-10" max="0" placeholder={hasPreviousExam && previousExam?.oeCyl ? previousExam.oeCyl : '0.00'} value={oeCyl} onChange={(e) => setOeCyl(e.target.value)} className={`w-24 mx-auto text-center ${hasPreviousExam && previousExam?.oeCyl ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="py-4 px-2">
                    <Input type="number" min="0" max="180" placeholder={hasPreviousExam && previousExam?.oeAxis !== null && previousExam?.oeAxis !== undefined ? previousExam.oeAxis.toString() : 'Eixo'} value={oeAxis} onChange={(e) => setOeAxis(e.target.value)} className={`w-20 mx-auto text-center ${hasPreviousExam && previousExam?.oeAxis !== null && previousExam?.oeAxis !== undefined ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
                  </td>
                  <td className="py-4 px-2 align-middle">
                    <VisualAcuityField
                      value={oeVa}
                      onChange={setOeVa}
                      customMode={oeVaCustomMode}
                      onCustomModeChange={setOeVaCustomMode}
                      referenceValue={hasPreviousExam ? previousExam?.oeVa : null}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Medidas de Suporte</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Adição por Presbiopia (ADD)
              </label>
              <Input type="number" step="0.25" min="0" max="4" placeholder={hasPreviousExam && previousExam?.addition ? previousExam.addition : '+0.00'} value={addition} onChange={(e) => setAddition(e.target.value)} className={`bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 font-bold ${hasPreviousExam && previousExam?.addition ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Distância Pupilar (DP) em mm
              </label>
              <Input type="number" step="0.5" min="45" max="80" placeholder={hasPreviousExam && previousExam?.pd ? previousExam.pd : 'ex: 63.5'} value={pd} onChange={(e) => setPd(e.target.value)} className={`bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 font-semibold ${hasPreviousExam && previousExam?.pd ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80' : ''}`} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Observações de Receituário
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] font-semibold text-slate-400">
                  Inserir observação padrão
                </div>
                <select
                  value={selectedNoteTemplate}
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
                  {PRESCRIPTION_NOTE_TEMPLATES.map((template) => (
                    <option key={template} value={template}>
                      {template}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Insira detalhes sobre lentes indicadas (multifocais, antirreflexo, etc.) ou notas de montagem..."
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-slate-50 dark:bg-slate-950/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 focus:border-primary/30"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 md:col-span-1 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Assistente Clínico</span>
            <CardTitle className="text-sm font-extrabold flex items-center gap-1">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              <span>Cálculo de Adição</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6 flex-grow flex flex-col justify-between">
            <div className="space-y-3.5 pt-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Lensys Care calcula automaticamente o valor da adição refrativa sugerida com base na idade atual do paciente ({age} anos).
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Faixa Etária:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{ageGroup}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Adição Recomendada:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                    {suggestedAddition > 0 ? `+${suggestedAddition.toFixed(2)} D` : 'Não requer'}
                  </span>
                </div>
              </div>
            </div>

            {suggestedAddition > 0 && addition !== suggestedAddition.toString() && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-xs font-bold border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                onClick={applySuggestedAddition}
              >
                Aplicar Adição Sugerida
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-6">
        <Link href={`/patients/${patient.id}`}>
          <Button type="button" variant="outline" className="h-10 px-6 font-semibold border-slate-200 dark:border-slate-800" disabled={loading}>
            Cancelar
          </Button>
        </Link>
        <Button
          type="submit"
          className="h-10 px-8 font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/10 flex items-center gap-1.5"
          disabled={loading}
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
