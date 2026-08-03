'use client'

import { UserPlus, Users } from 'lucide-react'

import ReferrerForm from '@/components/referrers/ReferrerForm'
import ReferrerRowItem from '@/components/referrers/ReferrerRowItem'
import { Card, CardContent } from '@/components/ui/card'
import type { ReferrerRow } from '@/lib/referrers/referrers-mappers'

export default function ReferrersTab({ rows }: { rows: ReferrerRow[] }) {
  const totalPending = rows.reduce((total, row) => total + row.pendingCount, 0)

  return (
    <div className="space-y-6" data-cy="referrers-tab">
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Novo indicante
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quem leva pacientes à clínica. Só o nome é obrigatório — a chave PIX aparece na
            hora de pagar as indicações.
          </p>
          <ReferrerForm />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Indicantes cadastrados
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {totalPending} indicação(ões) pendente(s) no total
            </span>
          </div>

          {rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
              data-cy="referrers-empty-state"
            >
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Nenhum indicante cadastrado.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Cadastre acima para poder vincular indicantes às consultas da Agenda.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-cy="referrers-list">
              {rows.map((row) => (
                <ReferrerRowItem key={row.id} row={row} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
