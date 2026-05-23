import React from 'react'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAgeGroupInfo, calculateAge } from '@/lib/refraction'
import {
  ArrowLeft,
  FilePlus2,
  Calendar,
  Phone,
  Mail,
  FileText,
} from 'lucide-react'

type PatientAlert = {
  id: string
  status: 'PENDING' | 'SENT' | 'DISMISSED'
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  due_date: Date | string
  sent_at: Date | string | null
}

type DecimalLike = number | string | { toString(): string; valueOf(): string | number }

type PatientExam = {
  id: string
  exam_date: Date | string
  examiner: {
    full_name: string
    crm: string | null
  }
  od_sph: DecimalLike | null
  od_cyl: DecimalLike | null
  od_axis: number | null
  od_va: string | null
  oe_sph: DecimalLike | null
  oe_cyl: DecimalLike | null
  oe_axis: number | null
  oe_va: string | null
  addition: DecimalLike | null
  pd: DecimalLike | null
  prescription_notes: string | null
}

interface PatientDetailPageProps {
  params: {
    id: string
  }
}

export const revalidate = 0

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch patient profile
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      exams: {
        include: { examiner: true },
        orderBy: { exam_date: 'desc' },
      },
      alerts: {
        orderBy: { due_date: 'desc' },
      },
    },
  })

  if (!patient) {
    notFound()
  }

  const age = calculateAge(patient.dob)
  const ageGroupInfo = getAgeGroupInfo(patient.dob)

  return (
    <div className="space-y-8 select-none">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href="/patients" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pacientes
        </Link>
        <Link href={`/exams/new?patientId=${patient.id}`}>
          <Button className="bg-indigo-600 hover:bg-indigo-500 font-bold gap-2 shadow-lg shadow-indigo-500/10">
            <FilePlus2 className="h-4.5 w-4.5" />
            Lançar Novo Exame
          </Button>
        </Link>
      </div>

      {/* Patient Demographic Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic demography */}
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
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-2">Observações Clínicas</div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                  {patient.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Exams History (timeline) & Alerts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Alert Information */}
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Lembretes & Recalls do Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.alerts.length === 0 ? (
                <div className="text-xs text-slate-400 font-semibold italic">Nenhum lembrete gerado ainda. Lembretes são criados automaticamente ao salvar um exame.</div>
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

          {/* Medical Timeline of Refraction Exams */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Histórico de Exames</h3>

            {patient.exams.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-sm font-semibold flex flex-col items-center gap-2 bg-slate-50/20">
                <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <span>Nenhum exame refrativo registrado para este paciente.</span>
                <Link href={`/exams/new?patientId=${patient.id}`} className="mt-2">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 font-bold">
                    Iniciar Primeiro Exame
                  </Button>
                </Link>
              </div>
            ) : (
              patient.exams.map((exam: PatientExam) => (
                <Card key={exam.id} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Exam Card Header */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/40 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-400" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Exame Realizado em: {new Date(exam.exam_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-slate-400 font-semibold">
                      Examinado por: {exam.examiner.full_name} {exam.examiner.crm ? `(${exam.examiner.crm})` : ''}
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* The Prescription Grid */}
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-center text-xs font-semibold">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950/20 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2.5">Olho</th>
                            <th className="py-2.5">Esférico (SPH)</th>
                            <th className="py-2.5">Cilíndrico (CYL)</th>
                            <th className="py-2.5">Eixo (AXIS)</th>
                            <th className="py-2.5">Acuidade (VA)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {/* Right eye */}
                          <tr>
                            <td className="py-3 px-4 font-bold text-slate-400 bg-slate-50/30 dark:bg-slate-950/10">OD (Direito)</td>
                            <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                              {exam.od_sph ? `${Number(exam.od_sph) > 0 ? '+' : ''}${Number(exam.od_sph).toFixed(2)}` : 'Plano'}
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">
                              {exam.od_cyl ? `${Number(exam.od_cyl).toFixed(2)}` : '0.00'}
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">
                              {exam.od_axis ? `${exam.od_axis}°` : '-'}
                            </td>
                            <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">{exam.od_va || '-'}</td>
                          </tr>
                          {/* Left eye */}
                          <tr>
                            <td className="py-3 px-4 font-bold text-slate-400 bg-slate-50/30 dark:bg-slate-950/10">OE (Esquerdo)</td>
                            <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                              {exam.oe_sph ? `${Number(exam.oe_sph) > 0 ? '+' : ''}${Number(exam.oe_sph).toFixed(2)}` : 'Plano'}
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">
                              {exam.oe_cyl ? `${Number(exam.oe_cyl).toFixed(2)}` : '0.00'}
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">
                              {exam.oe_axis ? `${exam.oe_axis}°` : '-'}
                            </td>
                            <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">{exam.oe_va || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Secondary Measurements Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Adição (ADD)</div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {exam.addition ? `+${Number(exam.addition).toFixed(2)} D` : 'Sem adição'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Dist. Pupilar (DP)</div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {exam.pd ? `${Number(exam.pd).toFixed(1)} mm` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Prescription notes */}
                    {exam.prescription_notes && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações da Receita</div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold bg-slate-50 dark:bg-slate-950/10 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          {exam.prescription_notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
