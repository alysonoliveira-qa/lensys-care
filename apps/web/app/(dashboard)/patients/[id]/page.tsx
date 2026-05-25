import React from 'react'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PatientExamHistory from '@/components/exams/PatientExamHistory'
import { getAgeGroupInfo, calculateAge } from '@/lib/refraction'
import {
  ArrowLeft,
  Edit3,
  FilePlus2,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react'

type PatientAlert = {
  id: string
  status: 'PENDING' | 'SENT' | 'DISMISSED'
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  due_date: Date | string
  sent_at: Date | string | null
}

interface PatientDetailPageProps {
  params: {
    id: string
  }
}

export const revalidate = 0

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const timer = startPerformanceTimer('page /patients/[id]')
  const supabase = createClient()
  const authStartedAt = startPerformanceStep()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

  if (error || !userId) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const patientStartedAt = startPerformanceStep()
  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      clinic: {
        profiles: {
          some: { id: userId },
        },
      },
    },
    select: {
      id: true,
      full_name: true,
      dob: true,
      phone: true,
      email: true,
      notes: true,
      exams: {
        select: {
          id: true,
          exam_date: true,
          od_sph: true,
          od_cyl: true,
          od_axis: true,
          od_va: true,
          oe_sph: true,
          oe_cyl: true,
          oe_axis: true,
          oe_va: true,
          addition: true,
          pd: true,
          prescription_notes: true,
          examiner: {
            select: {
              full_name: true,
              crm: true,
            },
          },
        },
        orderBy: { exam_date: 'desc' },
      },
      alerts: {
        select: {
          id: true,
          status: true,
          channel: true,
          due_date: true,
          sent_at: true,
        },
        orderBy: { due_date: 'desc' },
      },
    },
  })
  logPerformanceStep(timer, 'prisma.patient_exams_alerts', patientStartedAt)

  if (!patient) {
    endPerformanceTimer(timer, 'not_found_or_out_of_clinic')
    notFound()
  }

  const age = calculateAge(patient.dob)
  const ageGroupInfo = getAgeGroupInfo(patient.dob)

  endPerformanceTimer(timer)
  return (
    <div className="space-y-8 select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href="/patients" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pacientes
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/patients/${patient.id}/edit`}>
            <Button
              variant="outline"
              className="gap-2 border-slate-200 font-bold dark:border-slate-800"
              data-cy="edit-patient-button"
            >
              <Edit3 className="h-4.5 w-4.5" />
              Editar Paciente
            </Button>
          </Link>
          <Link href={`/exams/new?patientId=${patient.id}`}>
            <Button className="bg-indigo-600 hover:bg-indigo-500 font-bold gap-2 shadow-lg shadow-indigo-500/10" data-cy="new-exam-button">
              <FilePlus2 className="h-4.5 w-4.5" />
              Lancar Novo Exame
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 lg:col-span-1 shadow-sm">
          <CardHeader className="pb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perfil do Paciente</span>
            <CardTitle className="text-xl font-bold truncate">{patient.full_name}</CardTitle>
            <div className="flex items-center gap-2 pt-1.5 flex-wrap">
              <Badge variant="premium" className="text-[9px] py-0.5 px-2">
                {age} anos
              </Badge>
              <Badge variant="secondary" className="text-[9px] py-0.5 px-2">
                {ageGroupInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5 text-sm">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Calendar className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Nascimento</div>
                  <span className="font-semibold">{new Date(patient.dob).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {patient.phone && (
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Phone className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">WhatsApp / Celular</div>
                    <span className="font-semibold">{patient.phone}</span>
                  </div>
                </div>
              )}

              {patient.email && (
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">E-mail</div>
                    <span className="font-semibold truncate block">{patient.email}</span>
                  </div>
                </div>
              )}
            </div>

            {patient.notes && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-2">Observacoes Clinicas</div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                  {patient.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Lembretes & Recalls do Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.alerts.length === 0 ? (
                <div className="text-xs text-slate-400 font-semibold italic">Nenhum lembrete gerado ainda. Lembretes sao criados automaticamente ao salvar um exame.</div>
              ) : (
                <div className="space-y-3">
                  {patient.alerts.map((alert: PatientAlert) => {
                    const isPending = alert.status === 'PENDING'
                    const isSent = alert.status === 'SENT'

                    return (
                      <div
                        key={alert.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Lembrete de Consulta Anual ({alert.channel})
                            </span>
                            <Badge
                              variant={isPending ? 'warning' : isSent ? 'success' : 'secondary'}
                              className="text-[9px] py-0 px-1.5"
                            >
                              {isPending ? 'Pendente' : isSent ? 'Enviado' : 'Cancelado'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Vencimento do Exame: {new Date(alert.due_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {isSent && alert.sent_at && (
                          <div className="text-slate-500 font-semibold text-[10px]">
                            Disparado em: {new Date(alert.sent_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Historico de Exames</h3>
            <PatientExamHistory exams={patient.exams} patientId={patient.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
