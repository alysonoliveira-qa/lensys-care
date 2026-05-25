import React from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  PieChart,
  UsersRound,
  UserRoundPlus,
} from 'lucide-react'

type AgeGroupCounts = {
  infant: number
  young: number
  presbyopia: number
  elderly: number
}

type RecentPatient = {
  id: string
  full_name: string
  dob: Date | string
  phone: string | null
  email: string | null
}

type RecentAlert = {
  id: string
  patient_id: string
  due_date: Date | string
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  patient: {
    full_name: string
  }
}

interface ClinicPanelProps {
  clinicId: string
}

interface AgeDistributionPanelProps extends ClinicPanelProps {
  totalPatients: number
}

interface DashboardPanelFallbackProps {
  title: string
  description: string
}

const panelClassName =
  'rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none'

function PanelHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</CardTitle>
          <CardDescription className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </CardDescription>
        </div>
      </div>
      {action}
    </CardHeader>
  )
}

export function DashboardPanelFallback({ title, description }: DashboardPanelFallbackProps) {
  return (
    <Card className={panelClassName}>
      <PanelHeading icon={PieChart} title={title} description={description} />
      <CardContent>
        <div className="space-y-3">
          <div className="h-12 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />
          <div className="h-12 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />
          <div className="h-12 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />
        </div>
      </CardContent>
    </Card>
  )
}

export async function AgeDistributionPanel({ clinicId, totalPatients }: AgeDistributionPanelProps) {
  const timer = startPerformanceTimer('page /dashboard.section.age_distribution')
  const currentYear = new Date().getFullYear()
  const queryStartedAt = startPerformanceStep()
  const [ageGroups] = await prisma.$queryRaw<AgeGroupCounts[]>`
    SELECT
      COUNT(*) FILTER (WHERE ${currentYear} - EXTRACT(YEAR FROM dob) < 18)::integer AS infant,
      COUNT(*) FILTER (
        WHERE ${currentYear} - EXTRACT(YEAR FROM dob) >= 18
          AND ${currentYear} - EXTRACT(YEAR FROM dob) < 40
      )::integer AS young,
      COUNT(*) FILTER (
        WHERE ${currentYear} - EXTRACT(YEAR FROM dob) >= 40
          AND ${currentYear} - EXTRACT(YEAR FROM dob) < 60
      )::integer AS presbyopia,
      COUNT(*) FILTER (WHERE ${currentYear} - EXTRACT(YEAR FROM dob) >= 60)::integer AS elderly
    FROM patients
    WHERE clinic_id = ${clinicId}::uuid
  `
  logPerformanceStep(timer, 'prisma.age_group_counts', queryStartedAt)

  const maxGroupValue = Math.max(...Object.values(ageGroups), 1)
  const groups = [
    {
      label: 'Infantil / Adolescente (< 18 anos)',
      value: ageGroups.infant,
      colorClassName: 'bg-sky-500',
      accentClassName: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Adulto Jovem (18 - 39 anos)',
      value: ageGroups.young,
      colorClassName: 'bg-emerald-500',
      accentClassName: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Adulto Presbita (40 - 59 anos)',
      value: ageGroups.presbyopia,
      colorClassName: 'bg-indigo-500',
      accentClassName: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Idoso (60+ anos)',
      value: ageGroups.elderly,
      colorClassName: 'bg-violet-500',
      accentClassName: 'text-violet-600 dark:text-violet-400',
    },
  ]
  endPerformanceTimer(timer)

  return (
    <Card className={panelClassName}>
      <PanelHeading
        icon={PieChart}
        title="Distribuição de Pacientes por Faixa Etária"
        description="Análise demográfica para adequação de serviços e presbiopia."
        action={
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {totalPatients} paciente(s)
          </Badge>
        }
      />
      <CardContent className="space-y-4" data-cy="alerts-list">
        {groups.map((group) => {
          const percentage = totalPatients > 0 ? (group.value / totalPatients) * 100 : 0
          return (
            <div
              key={group.label}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"
            >
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">{group.label}</span>
                <span className={group.accentClassName}>
                  {group.value} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${group.colorClassName} transition-all duration-500`}
                  style={{ width: `${(group.value / maxGroupValue) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export async function RecentPatientsPanel({ clinicId }: ClinicPanelProps) {
  const timer = startPerformanceTimer('page /dashboard.section.recent_patients')
  const queryStartedAt = startPerformanceStep()
  const recentPatients = await prisma.patient.findMany({
    where: { clinic_id: clinicId },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: {
      id: true,
      full_name: true,
      dob: true,
      phone: true,
      email: true,
    },
  })
  logPerformanceStep(timer, 'prisma.recent_patients', queryStartedAt)
  endPerformanceTimer(timer)

  return (
    <Card className={panelClassName}>
      <PanelHeading
        icon={UserRoundPlus}
        title="Pacientes Recém-Cadastrados"
        description="Os últimos 5 pacientes registrados na clínica."
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
              <p className="text-xs text-slate-400 dark:text-slate-500">Os novos cadastros aparecerão aqui automaticamente.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-950/50">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Data Nasc.</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentPatients.map((patient: RecentPatient) => (
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

export async function UpcomingRecallsPanel({ clinicId }: ClinicPanelProps) {
  const timer = startPerformanceTimer('page /dashboard.section.upcoming_recalls')
  const queryStartedAt = startPerformanceStep()
  const recentAlerts = await prisma.alert.findMany({
    where: {
      status: 'PENDING',
      patient: { clinic_id: clinicId },
    },
    orderBy: { due_date: 'asc' },
    take: 5,
    select: {
      id: true,
      patient_id: true,
      due_date: true,
      channel: true,
      patient: {
        select: {
          full_name: true,
        },
      },
    },
  })
  logPerformanceStep(timer, 'prisma.recent_alerts', queryStartedAt)
  endPerformanceTimer(timer)

  return (
    <Card className={panelClassName}>
      <PanelHeading
        icon={CalendarClock}
        title="Próximos Recalls"
        description="Lembretes de exames com validade de 1 ano expirando em breve."
        action={
          <Link
            href="/alerts"
            className="hidden text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 sm:inline-flex"
          >
            Gerenciar
          </Link>
        }
      />
      <CardContent className="space-y-3">
        {recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-950/30">
            <BellRing className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum alerta pendente no momento.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Quando houver recalls para acompanhar, eles aparecerão aqui.</p>
            </div>
          </div>
        ) : (
          recentAlerts.map((alert: RecentAlert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {alert.patient.full_name}
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Vence em: {new Date(alert.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Badge variant="warning" className="text-[10px]">
                  Pendente
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {alert.channel}
                </Badge>
                <Link href={`/patients/${alert.patient_id}`} className="w-full max-w-[140px]" prefetch={false}>
                  <Button size="sm" className="h-8 w-full rounded-lg bg-indigo-600 text-[11px] font-bold hover:bg-indigo-500">
                    Disparar Manual
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
