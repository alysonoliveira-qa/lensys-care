import { Calendar, Mail, Phone } from 'lucide-react'

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
    <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 lg:col-span-1 shadow-sm">
      <CardHeader className="pb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perfil do Paciente</span>
        <CardTitle className="text-xl font-bold truncate">{fullName}</CardTitle>
        <div className="flex items-center gap-2 pt-1.5 flex-wrap">
          <Badge variant="premium" className="text-[9px] py-0.5 px-2">
            {age} anos
          </Badge>
          <Badge variant="secondary" className="text-[9px] py-0.5 px-2">
            {ageGroupLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5 text-sm">
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Calendar className="h-4.5 w-4.5 text-slate-400" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Nascimento</div>
              <span className="font-semibold">{new Date(dob).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {phone && (
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Phone className="h-4.5 w-4.5 text-slate-400" />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">WhatsApp / Celular</div>
                <span className="font-semibold">{phone}</span>
              </div>
            </div>
          )}

          {email && (
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Mail className="h-4.5 w-4.5 text-slate-400" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">E-mail</div>
                <span className="font-semibold truncate block">{email}</span>
              </div>
            </div>
          )}
        </div>

        {notes && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-2">Observações Clínicas</div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              {notes}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
