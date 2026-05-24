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
import { ArrowRight } from 'lucide-react'

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

export function DashboardPanelFallback({ title, description }: DashboardPanelFallbackProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        <CardDescription className="text-slate-400 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-20 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 animate-pulse" />
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
  endPerformanceTimer(timer)

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Distribuição de Pacientes por Faixa Etária</CardTitle>
        <CardDescription className="text-slate-400 text-xs">Análise demográfica para adequação de serviços e presbiopia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { label: 'Infantil / Adolescente (< 18 anos)', value: ageGroups.infant, color: 'bg-blue-500' },
          { label: 'Adulto Jovem (18 - 39 anos)', value: ageGroups.young, color: 'bg-emerald-500' },
          { label: 'Adulto Presbita (40 - 59 anos)', value: ageGroups.presbyopia, color: 'bg-indigo-500' },
          { label: 'Idoso (60+ anos)', value: ageGroups.elderly, color: 'bg-violet-500' },
        ].map((group, index) => {
          const percentage = totalPatients > 0 ? (group.value / totalPatients) * 100 : 0
          return (
            <div key={index} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">{group.label}</span>
                <span className="text-slate-800 dark:text-slate-200">{group.value} ({percentage.toFixed(0)}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${group.color} transition-all duration-500`}
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
    <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold">Pacientes Recém-Cadastrados</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Os últimos 5 pacientes registrados na clínica.</CardDescription>
        </div>
        <Link href="/patients" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {recentPatients.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">Nenhum paciente cadastrado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5">Nome</th>
                  <th className="py-2.5">Data Nasc.</th>
                  <th className="py-2.5">Contato</th>
                  <th className="py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentPatients.map((patient: RecentPatient) => (
                  <tr key={patient.id} className="text-slate-600 dark:text-slate-300 font-medium">
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{patient.full_name}</td>
                    <td className="py-3">{new Date(patient.dob).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 text-xs">{patient.phone || patient.email || '-'}</td>
                    <td className="py-3 text-right">
                      <Link href={`/patients/${patient.id}`} prefetch={false}>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold">
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
    <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold">Próximos Recalls</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Lembretes de exames com validade de 1 ano expirando em breve.</CardDescription>
        </div>
        <Link href="/alerts" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          Gerenciar
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentAlerts.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">Nenhum alerta pendente no momento.</div>
        ) : (
          recentAlerts.map((alert: RecentAlert) => (
            <div
              key={alert.id}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-2"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {alert.patient.full_name}
                </span>
                <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                  Pendente
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span>Vence em: {new Date(alert.due_date).toLocaleDateString('pt-BR')}</span>
                <Badge variant="secondary" className="text-[9px] uppercase">
                  {alert.channel}
                </Badge>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <Link href={`/patients/${alert.patient_id}`} className="w-full" prefetch={false}>
                  <Button size="sm" className="w-full h-7 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500">
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
