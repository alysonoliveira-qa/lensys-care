'use client'

import { useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react'

import AgendaAppointmentRow from '@/components/agenda/AgendaAppointmentRow'
import NewAppointmentDialog from '@/components/agenda/NewAppointmentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { buildAgendaHref, type AgendaDayNavigation } from '@/lib/appointments/agenda-navigation'
import type { AppointmentRow } from '@/lib/appointments/appointments-mappers'
import type { ReferrerOption } from '@/lib/referrers/referrers-mappers'

interface AgendaDayViewProps {
  rows: AppointmentRow[]
  navigation: AgendaDayNavigation
  referrerOptions: ReferrerOption[]
  clinicName: string
}

export default function AgendaDayView({
  rows,
  navigation,
  referrerOptions,
  clinicName,
}: AgendaDayViewProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDate = event.target.value

    if (nextDate) {
      router.push(buildAgendaHref(nextDate))
    }
  }

  const scheduledCount = rows.filter((row) => row.timeLabel !== null).length
  const queueCount = rows.filter((row) => row.queuePosition !== null).length

  return (
    <div className="space-y-8 select-none">
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/90 p-6 shadow-sm shadow-indigo-100/50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/20" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900/80 dark:text-indigo-300">
              <CalendarDays className="h-3.5 w-3.5" />
              Agenda da {clinicName}
            </div>

            <div className="space-y-1">
              <h2
                className="text-3xl font-extrabold capitalize tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl"
                data-cy="agenda-day-label"
              >
                {navigation.label}
              </h2>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {navigation.relativeLabel ? `${navigation.relativeLabel} · ` : ''}
                {scheduledCount} com horário · {queueCount} na fila
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Link href={navigation.previousHref} data-cy="agenda-previous-day">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70"
                  aria-label="Dia anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>

              <Link href={navigation.todayHref} data-cy="agenda-today">
                <Button
                  variant={navigation.isToday ? 'default' : 'outline'}
                  className="h-10 rounded-xl px-4 font-semibold"
                >
                  Hoje
                </Button>
              </Link>

              <Link href={navigation.nextHref} data-cy="agenda-next-day">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70"
                  aria-label="Próximo dia"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>

              <input
                type="date"
                value={navigation.date}
                onChange={handleDateChange}
                aria-label="Selecionar data da agenda"
                className="h-10 rounded-xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200"
                data-cy="agenda-date-picker"
              />
            </div>

            <Button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="h-10 gap-2 rounded-xl bg-indigo-600 px-5 font-semibold shadow-lg shadow-indigo-500/15 hover:bg-indigo-500"
              data-cy="new-appointment-button"
            >
              <Plus className="h-4 w-4" />
              Nova consulta
            </Button>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
              data-cy="agenda-empty-state"
            >
              <Clock className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Nenhuma consulta neste dia.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Use “Nova consulta” para marcar com horário ou colocar o paciente na fila do dia.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-cy="agenda-list">
              {rows.map((row) => (
                <AgendaAppointmentRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isDialogOpen ? (
        <NewAppointmentDialog
          date={navigation.date}
          referrerOptions={referrerOptions}
          onClose={() => setIsDialogOpen(false)}
        />
      ) : null}
    </div>
  )
}
