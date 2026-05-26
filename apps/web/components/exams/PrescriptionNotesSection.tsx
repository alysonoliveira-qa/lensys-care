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
  return (
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
              onChange={(event) => onToggleQuickNote(option.id, event.target.checked)}
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
          onChange={(event) => onSelectStandardNote(event.target.value)}
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
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        rows={3}
        className="flex w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950/20"
      />
    </div>
  )
}
