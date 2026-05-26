import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PreviousExamReferencePanelProps {
  onUsePreviousExam: () => void
  disabled?: boolean
}

export default function PreviousExamReferencePanel({
  onUsePreviousExam,
  disabled = false,
}: PreviousExamReferencePanelProps) {
  return (
    <div
      className="mt-3 flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
      data-cy="previous-exam-reference-panel"
    >
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <History className="h-4 w-4 shrink-0" />
        <span className="font-semibold">Último exame encontrado. Os valores anteriores aparecem como referência.</span>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-8 shrink-0 border-amber-500/30 px-3 text-xs font-bold text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
        onClick={onUsePreviousExam}
        disabled={disabled}
        data-cy="use-previous-exam-button"
      >
        Usar exame anterior como base
      </Button>
    </div>
  )
}
