import { ChevronDown } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PreviousExamReferencePanel from '@/components/exams/PreviousExamReferencePanel'
import {
  CUSTOM_VISUAL_ACUITY_OPTION,
  DEFAULT_VISUAL_ACUITY,
  isCommonVisualAcuity,
  VISUAL_ACUITY_OPTIONS,
} from '@/lib/exams/exam-options'

interface VisualAcuityFieldProps {
  value: string
  onChange: (value: string) => void
  customMode: boolean
  onCustomModeChange: (value: boolean) => void
  referenceValue?: string | null
  dataCy: string
}

interface ExamRefractionFieldsProps {
  hasPreviousExam: boolean
  isPreviousExamApplied: boolean
  onApplyPreviousExam: () => void
  odSph: string
  onOdSphChange: (value: string) => void
  odCyl: string
  onOdCylChange: (value: string) => void
  odAxis: string
  onOdAxisChange: (value: string) => void
  odVa: string
  onOdVaChange: (value: string) => void
  odVaCustomMode: boolean
  onOdVaCustomModeChange: (value: boolean) => void
  oeSph: string
  onOeSphChange: (value: string) => void
  oeCyl: string
  onOeCylChange: (value: string) => void
  oeAxis: string
  onOeAxisChange: (value: string) => void
  oeVa: string
  onOeVaChange: (value: string) => void
  oeVaCustomMode: boolean
  onOeVaCustomModeChange: (value: boolean) => void
  previousOdSph?: string | null
  previousOdCyl?: string | null
  previousOdAxis?: number | null
  previousOdVa?: string | null
  previousOeSph?: string | null
  previousOeCyl?: string | null
  previousOeAxis?: number | null
  previousOeVa?: string | null
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

  const selectClassName = `h-11 w-36 min-w-[9rem] appearance-none rounded-xl border border-slate-200/80 bg-white px-4 pr-10 text-center text-sm font-bold shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-none dark:hover:border-slate-700 ${
    showingReference
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-indigo-600 dark:text-indigo-400'
  }`

  return (
    <div className="flex min-w-[13rem] items-center justify-center gap-2">
      <div className="relative">
        <select
          value={selectedValue}
          data-cy={dataCy}
          onChange={(event) => {
            if (event.target.value === CUSTOM_VISUAL_ACUITY_OPTION) {
              onCustomModeChange(true)
              return
            }

            onCustomModeChange(false)
            onChange(event.target.value)
          }}
          className={selectClassName}
        >
          {showingReference ? (
            <option value="" disabled>
              Ref. {referenceValue}
            </option>
          ) : null}
          {VISUAL_ACUITY_OPTIONS.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value={CUSTOM_VISUAL_ACUITY_OPTION}>Manual</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {customMode ? (
        <Input
          type="text"
          placeholder={DEFAULT_VISUAL_ACUITY}
          data-cy={dataCy}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-24 rounded-xl border-slate-200/80 bg-white text-center font-bold text-indigo-600 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950/30 dark:text-indigo-400 dark:shadow-none"
        />
      ) : (
        <div className="whitespace-nowrap text-[10px] font-semibold text-slate-400">Padrão: 20/20</div>
      )}
    </div>
  )
}

export default function ExamRefractionFields({
  hasPreviousExam,
  isPreviousExamApplied,
  onApplyPreviousExam,
  odSph,
  onOdSphChange,
  odCyl,
  onOdCylChange,
  odAxis,
  onOdAxisChange,
  odVa,
  onOdVaChange,
  odVaCustomMode,
  onOdVaCustomModeChange,
  oeSph,
  onOeSphChange,
  oeCyl,
  onOeCylChange,
  oeAxis,
  onOeAxisChange,
  oeVa,
  onOeVaChange,
  oeVaCustomMode,
  onOeVaCustomModeChange,
  previousOdSph,
  previousOdCyl,
  previousOdAxis,
  previousOdVa,
  previousOeSph,
  previousOeCyl,
  previousOeAxis,
  previousOeVa,
}: ExamRefractionFieldsProps) {
  const inputClassName =
    'mx-auto h-11 rounded-xl border border-slate-200/80 bg-white text-center shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-none dark:hover:border-slate-700'

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
        <CardTitle className="text-lg font-bold">Graduação Refrativa (OD / OE)</CardTitle>
        <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
          Preencha os valores esféricos, cilíndricos, eixos e acuidade de cada olho.
        </CardDescription>
        {hasPreviousExam ? (
          <PreviousExamReferencePanel
            onUsePreviousExam={onApplyPreviousExam}
            isApplied={isPreviousExamApplied}
          />
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-b-2xl">
          <table className="w-full text-center text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:border-slate-800 dark:bg-slate-950/30">
                <th className="px-4 py-3 text-left">Olho</th>
                <th className="py-3">Esférico (SPH)</th>
                <th className="py-3">Cilíndrico (CYL)</th>
                <th className="py-3">Eixo (AXIS)</th>
                <th className="py-3">Acuidade (VA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="w-32 bg-slate-50/50 px-4 py-4 text-left font-bold text-slate-500 dark:bg-slate-950/20">
                  OD (Direito)
                </td>
                <td className="px-2 py-4">
                  <Input
                    type="number"
                    step="0.25"
                    min="-20"
                    max="20"
                    data-cy="exam-od-sphere-input"
                    placeholder={hasPreviousExam && previousOdSph ? previousOdSph : '0.00'}
                    value={odSph}
                    onChange={(event) => onOdSphChange(event.target.value)}
                    className={`${inputClassName} w-24 font-bold ${
                      hasPreviousExam && previousOdSph
                        ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80'
                        : ''
                    }`}
                  />
                </td>
                <td className="px-2 py-4">
                  <Input
                    type="number"
                    step="0.25"
                    min="-10"
                    max="0"
                    data-cy="exam-od-cylinder-input"
                    placeholder={hasPreviousExam && previousOdCyl ? previousOdCyl : '0.00'}
                    value={odCyl}
                    onChange={(event) => onOdCylChange(event.target.value)}
                    className={`${inputClassName} w-24 ${
                      hasPreviousExam && previousOdCyl
                        ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80'
                        : ''
                    }`}
                  />
                </td>
                <td className="px-2 py-4">
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    data-cy="exam-od-axis-input"
                    placeholder={
                      hasPreviousExam && previousOdAxis !== null && previousOdAxis !== undefined
                        ? previousOdAxis.toString()
                        : 'Eixo'
                    }
                    value={odAxis}
                    onChange={(event) => onOdAxisChange(event.target.value)}
                    className={`${inputClassName} w-20 ${
                      hasPreviousExam && previousOdAxis !== null && previousOdAxis !== undefined
                        ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80'
                        : ''
                    }`}
                  />
                </td>
                <td className="px-2 py-4 align-middle">
                  <VisualAcuityField
                    value={odVa}
                    onChange={onOdVaChange}
                    customMode={odVaCustomMode}
                    onCustomModeChange={onOdVaCustomModeChange}
                    referenceValue={hasPreviousExam ? previousOdVa : null}
                    dataCy="exam-od-visual-acuity-input"
                  />
                </td>
              </tr>
              <tr>
                <td className="w-32 bg-slate-50/50 px-4 py-4 text-left font-bold text-slate-500 dark:bg-slate-950/20">
                  OE (Esquerdo)
                </td>
                <td className="px-2 py-4">
                  <Input
                    type="number"
                    step="0.25"
                    min="-20"
                    max="20"
                    data-cy="exam-oe-sphere-input"
                    placeholder={hasPreviousExam && previousOeSph ? previousOeSph : '0.00'}
                    value={oeSph}
                    onChange={(event) => onOeSphChange(event.target.value)}
                    className={`${inputClassName} w-24 font-bold ${
                      hasPreviousExam && previousOeSph
                        ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80'
                        : ''
                    }`}
                  />
                </td>
                <td className="px-2 py-4">
                  <Input
                    type="number"
                    step="0.25"
                    min="-10"
                    max="0"
                    data-cy="exam-oe-cylinder-input"
                    placeholder={hasPreviousExam && previousOeCyl ? previousOeCyl : '0.00'}
                    value={oeCyl}
                    onChange={(event) => onOeCylChange(event.target.value)}
                    className={`${inputClassName} w-24 ${
                      hasPreviousExam && previousOeCyl
                        ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80'
                        : ''
                    }`}
                  />
                </td>
                <td className="px-2 py-4">
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    data-cy="exam-oe-axis-input"
                    placeholder={
                      hasPreviousExam && previousOeAxis !== null && previousOeAxis !== undefined
                        ? previousOeAxis.toString()
                        : 'Eixo'
                    }
                    value={oeAxis}
                    onChange={(event) => onOeAxisChange(event.target.value)}
                    className={`${inputClassName} w-20 ${
                      hasPreviousExam && previousOeAxis !== null && previousOeAxis !== undefined
                        ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80'
                        : ''
                    }`}
                  />
                </td>
                <td className="px-2 py-4 align-middle">
                  <VisualAcuityField
                    value={oeVa}
                    onChange={onOeVaChange}
                    customMode={oeVaCustomMode}
                    onCustomModeChange={onOeVaCustomModeChange}
                    referenceValue={hasPreviousExam ? previousOeVa : null}
                    dataCy="exam-oe-visual-acuity-input"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
