import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PreviousExamReferencePanelProps {
  onUsePreviousExam: () => void
  isApplied?: boolean
}

export default function PreviousExamReferencePanel({
  onUsePreviousExam,
  isApplied = false,
}: PreviousExamReferencePanelProps) {
  return (
    <div
      className={`mt-3 flex flex-col gap-3 rounded-lg border px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between ${
        isApplied
          ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400'
          : 'border-amber-500/20 bg-amber-500/5'
      }`}
      data-cy="previous-exam-reference-panel"
    >
      <div
        className={`flex items-center gap-2 ${
          isApplied ? 'text-slate-600 dark:text-slate-300' : 'text-amber-700 dark:text-amber-300'
        }`}
      >
        <History className="h-4 w-4 shrink-0" />
        <span className="font-semibold">
          {isApplied
            ? 'Dados do exame anterior aplicados neste novo exame.'
            : 'Último exame encontrado. Os valores anteriores aparecem como referência.'}
        </span>
      </div>
      <Button
        type="button"
        variant={isApplied ? 'secondary' : 'outline'}
        className={`h-8 shrink-0 px-3 text-xs font-bold ${
          isApplied
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
            : 'border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300'
        }`}
        onClick={onUsePreviousExam}
        disabled={isApplied}
        data-cy="use-previous-exam-button"
      >
        {isApplied ? 'Aplicado' : 'Usar exame anterior como base'}
      </Button>
    </div>
  )
}
