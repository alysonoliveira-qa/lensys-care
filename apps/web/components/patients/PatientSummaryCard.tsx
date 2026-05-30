import { Calendar, Mail, Phone, StickyNote } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PatientSummaryCardProps {
  fullName: string
  dob: Date | string
  phone: string | null
  email: string | null
  notes: string | null
  age: number
  ageGroupLabel: string
}

export default function PatientSummaryCard({
  fullName,
  dob,
  phone,
  email,
  notes,
  age,
  ageGroupLabel,
}: PatientSummaryCardProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:col-span-1">
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
      <CardHeader className="space-y-4 pb-4">
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Perfil do paciente
          </span>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {fullName}
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="premium" className="px-2 py-0.5 text-[10px]">
            {age} anos
          </Badge>
          <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
            {ageGroupLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/20">
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Calendar className="h-4.5 w-4.5 text-slate-400" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Data de nascimento
              </div>
              <span className="font-semibold">{new Date(dob).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {phone ? (
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Phone className="h-4.5 w-4.5 text-slate-400" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  WhatsApp / Celular
                </div>
                <span className="font-semibold">{phone}</span>
              </div>
            </div>
          ) : null}

          {email ? (
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Mail className="h-4.5 w-4.5 text-slate-400" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  E-mail
                </div>
                <span className="block truncate font-semibold">{email}</span>
              </div>
            </div>
          ) : null}
        </div>

        {notes ? (
          <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/20">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <StickyNote className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                Observações clínicas
              </span>
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
              {notes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
