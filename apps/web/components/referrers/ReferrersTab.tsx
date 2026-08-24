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
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Novo indicante
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Quem leva pacientes à clínica. Só o nome é obrigatório — a chave PIX aparece na
            hora de pagar as indicações.
          </p>
          <ReferrerForm />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-bold text-foreground">
              Indicantes cadastrados
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {totalPending} indicação(ões) pendente(s) no total
            </span>
          </div>

          {rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
              data-cy="referrers-empty-state"
            >
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">
                  Nenhum indicante cadastrado.
                </p>
                <p className="text-xs text-muted-foreground">
                  Cadastre acima para poder vincular indicantes às consultas da Agenda.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border" data-cy="referrers-list">
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
