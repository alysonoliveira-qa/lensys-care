import { ChevronDown } from 'lucide-react'

import {
  PRESCRIPTION_NOTE_OPTIONS,
  QUICK_PRESCRIPTION_OPTIONS,
  type QuickPrescriptionOptionId,
} from '@/lib/exams/exam-options'

interface PrescriptionNotesSectionProps {
  notes: string
  onNotesChange: (value: string) => void
  selectedNoteTemplate: string
  onSelectStandardNote: (template: string) => void
  quickNoteSelections: Record<QuickPrescriptionOptionId, boolean>
  onToggleQuickNote: (id: QuickPrescriptionOptionId, checked: boolean) => void
}

export default function PrescriptionNotesSection({
  notes,
  onNotesChange,
  selectedNoteTemplate,
  onSelectStandardNote,
  quickNoteSelections,
  onToggleQuickNote,
}: PrescriptionNotesSectionProps) {
  const selectClassName =
    'h-11 w-full appearance-none rounded-xl border border-slate-200/80 bg-white px-4 pr-10 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-700'

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Observações de receituário
      </label>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/20">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Opções rápidas
        </div>
        <div className="flex flex-wrap gap-2.5">
          {QUICK_PRESCRIPTION_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300 dark:shadow-none"
            >
              <input
                type="checkbox"
                data-cy={option.dataCy}
                checked={quickNoteSelections[option.id]}
                onChange={(event) => onToggleQuickNote(option.id, event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Inserir observação padrão
        </div>
        <div className="relative max-w-sm">
          <select
            value={selectedNoteTemplate}
            data-cy="standard-note-select"
            onChange={(event) => onSelectStandardNote(event.target.value)}
            className={selectClassName}
          >
            <option value="">Selecionar</option>
            {PRESCRIPTION_NOTE_OPTIONS.map((template) => (
              <option key={template.id} value={template.value}>
                {template.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <textarea
        data-cy="exam-notes-input"
        placeholder="Insira detalhes sobre lentes indicadas (multifocais, antirreflexo, etc.) ou notas de montagem..."
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        rows={4}
        className="flex w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm shadow-slate-200/40 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:placeholder:text-slate-500"
      />
    </div>
  )
}
