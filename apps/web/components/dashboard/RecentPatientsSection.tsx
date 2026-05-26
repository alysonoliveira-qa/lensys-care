import Link from 'next/link'
import { ArrowRight, UserRoundPlus, UsersRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import DashboardPanelHeading from './DashboardPanelHeading'

type RecentPatient = {
  id: string
  full_name: string
  dob: Date | string
  phone: string | null
  email: string | null
}

interface RecentPatientsSectionProps {
  recentPatients: RecentPatient[]
}

export default function RecentPatientsSection({
  recentPatients,
}: RecentPatientsSectionProps) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <DashboardPanelHeading
        icon={UserRoundPlus}
        title="Pacientes RecÃ©m-Cadastrados"
        description="Os Ãºltimos 5 pacientes registrados na clÃ­nica."
        action={
          <Link
            href="/patients"
            className="hidden items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 sm:inline-flex"
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <CardContent>
        {recentPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-950/30">
            <UsersRound className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum paciente cadastrado ainda.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Os novos cadastros aparecerÃ£o aqui automaticamente.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-950/50">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Data Nasc.</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3 text-right">AÃ§Ã£o</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="text-slate-600 transition-colors hover:bg-slate-50/80 dark:text-slate-300 dark:hover:bg-slate-950/30"
                  >
                    <td className="px-4 py-4 font-bold text-slate-800 dark:text-slate-100">{patient.full_name}</td>
                    <td className="px-4 py-4 font-medium">{new Date(patient.dob).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-4 text-xs">{patient.phone || patient.email || '-'}</td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/patients/${patient.id}`} prefetch={false}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg border-slate-200 text-[11px] font-bold dark:border-slate-800"
                        >
                          Ficha
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
