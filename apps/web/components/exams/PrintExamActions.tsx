'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PrintExamActionsProps {
  patientId: string
  className?: string
}

export default function PrintExamActions({ patientId, className }: PrintExamActionsProps) {
  return (
    <div className={`${className ?? ''} mb-6 flex items-center justify-between gap-3`}>
      <Link href={`/patients/${patientId}`}>
        <Button type="button" variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para ficha
        </Button>
      </Link>
      <Button type="button" className="gap-2 bg-indigo-600 hover:bg-indigo-500" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  )
}
