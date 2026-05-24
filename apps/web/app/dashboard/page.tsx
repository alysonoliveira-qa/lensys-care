import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  ClipboardList,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  UserCheck
} from 'lucide-react'

type PatientDobRecord = {
  dob: Date
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

export const revalidate = 0

export default async function DashboardPage() {
  const timer = startPerformanceTimer('page /dashboard')
  const supabase = createClient()
  const authStartedAt = startPerformanceStep()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

  if (error || !userId) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const profileStartedAt = startPerformanceStep()
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      full_name: true,
      clinic: {
        select: {
          id: true,
          name: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
        },
      },
    },
  })
  logPerformanceStep(timer, 'prisma.profile_and_clinic', profileStartedAt)

  if (!profile) {
    endPerformanceTimer(timer, 'redirect_login_no_profile')
    redirect('/login')
  }

  const clinic = profile.clinic
  const isConecta = clinic.subscription?.plan === 'CONECTA' && clinic.subscription?.status !== 'CANCELED'

  const dashboardQueriesStartedAt = startPerformanceStep()
  const [
    totalExams,
    alertCounts,
    recentPatients,
    recentAlerts,
    patientsDob,
  ] = await Promise.all([
    prisma.exam.count({
      where: { patient: { clinic_id: clinic.id } },
    }),
    prisma.alert.groupBy({
      by: ['status'],
      where: {
        status: { in: ['PENDING', 'SENT'] },
        patient: { clinic_id: clinic.id },
      },
      _count: true,
    }),
    prisma.patient.findMany({
      where: { clinic_id: clinic.id },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        full_name: true,
        dob: true,
        phone: true,
        email: true,
      },
    }),
    prisma.alert.findMany({
      where: {
        status: 'PENDING',
        patient: { clinic_id: clinic.id },
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
    }),
    prisma.patient.findMany({
      where: { clinic_id: clinic.id },
      select: { dob: true },
    }),
  ])
  logPerformanceStep(timer, 'prisma.dashboard_queries_parallel', dashboardQueriesStartedAt)

  const totalPatients = patientsDob.length
  const pendingAlerts = alertCounts.find((alert) => alert.status === 'PENDING')?._count ?? 0
  const sentAlerts = alertCounts.find((alert) => alert.status === 'SENT')?._count ?? 0

  const ageGroups = {
    infant: 0,
    young: 0,
    presbyopia: 0,
    elderly: 0,
  }

  const today = new Date()
  patientsDob.forEach((p: PatientDobRecord) => {
    const age = today.getFullYear() - p.dob.getFullYear()
    if (age < 18) ageGroups.infant++
    else if (age < 40) ageGroups.young++
    else if (age < 60) ageGroups.presbyopia++
    else ageGroups.elderly++
  })

  const maxGroupValue = Math.max(...Object.values(ageGroups), 1)

  endPerformanceTimer(timer)
  return (
    <div className="space-y-8 select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Olá, <span className="text-indigo-600 dark:text-indigo-400">{profile.full_name}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Aqui está o resumo clínico e operacional da <span className="font-semibold text-slate-700 dark:text-slate-300">{clinic.name}</span> hoje.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/patients/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 font-semibold gap-2 shadow-lg shadow-indigo-500/10">
              <Plus className="h-4.5 w-4.5" />
              Novo Paciente
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Pacientes</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{totalPatients}</div>
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="h-3 w-3" />
              <span>Base ativa e atualizada</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consultas Realizadas</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ClipboardList className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{totalExams}</div>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Prontuários refrativos cadastrados</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Pendentes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{pendingAlerts}</div>
            <p className="text-xs text-amber-500 font-semibold mt-1">Exames expirando em breve</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Enviados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{sentAlerts}</div>
            <p className="text-xs text-emerald-500 font-semibold mt-1">Lembretes de recall disparados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                      {recentPatients.map((p: RecentPatient) => (
                        <tr key={p.id} className="text-slate-600 dark:text-slate-300 font-medium">
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{p.full_name}</td>
                          <td className="py-3">{new Date(p.dob).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 text-xs">{p.phone || p.email || '-'}</td>
                          <td className="py-3 text-right">
                            <Link href={`/patients/${p.id}`}>
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
        </div>

        <div className="space-y-6">
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
                      <Link href={`/patients/${alert.patient_id}`} className="w-full">
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

          <Card className="bg-indigo-600 text-white overflow-hidden relative shadow-lg shadow-indigo-500/10">
            <div className="absolute right-[-20%] bottom-[-20%] w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Status da Conta B2B</span>
              <CardTitle className="text-xl font-bold flex items-center gap-1.5">
                <UserCheck className="h-5 w-5" />
                <span>Modalidade Clínica</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <p className="text-xs opacity-90 leading-relaxed">
                {isConecta
                  ? 'Sua clínica está com todas as automações de alertas via WhatsApp, SMS e Recall em Massa ativas.'
                  : 'Sua clínica está no plano Essencial. Assine o plano Conecta para desbloquear automações via WhatsApp e SMS.'}
              </p>
              {!isConecta && (
                <Link href="/planos" passHref>
                  <Button className="w-full h-9 bg-white text-indigo-700 hover:bg-slate-50 text-xs font-bold transition-all duration-200">
                    Ativar Plano Conecta
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
