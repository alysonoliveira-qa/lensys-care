import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import PrintExamActions from '@/components/exams/PrintExamActions'
import styles from './print.module.css'

interface PrintExamPageProps {
  params: {
    id: string
  }
}

export const revalidate = 0

function formatSphere(value: { toString(): string } | null) {
  if (!value) {
    return 'Plano'
  }

  const numericValue = Number(value)
  return `${numericValue > 0 ? '+' : ''}${numericValue.toFixed(2)}`
}

function formatCylinder(value: { toString(): string } | null) {
  return value ? Number(value).toFixed(2) : '0.00'
}

export default async function PrintExamPage({ params }: PrintExamPageProps) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub

  if (error || !userId) {
    redirect('/login')
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: params.id,
      patient: {
        clinic: {
          profiles: {
            some: { id: userId },
          },
        },
      },
    },
    select: {
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
      patient: {
        select: {
          id: true,
          full_name: true,
          dob: true,
          clinic: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!exam) {
    notFound()
  }

  return (
    <main className={`${styles.page} print-surface px-4 py-6 sm:px-8`}>
      <div className="mx-auto max-w-[190mm]">
        <PrintExamActions patientId={exam.patient.id} className={styles.noPrint} />

        <article className={`${styles.document} border border-slate-200 p-7 sm:p-10`}>
          <header className="mb-8 flex items-start justify-between gap-6 border-b border-slate-300 pb-6">
            <div>
              <p className="text-2xl font-bold tracking-tight">Lensys Care</p>
              <p className="mt-1 text-sm text-slate-500">Sistema de gestão para optometria clínica</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{exam.patient.clinic.name}</p>
              {exam.patient.clinic.phone && <p>{exam.patient.clinic.phone}</p>}
              {exam.patient.clinic.email && <p>{exam.patient.clinic.email}</p>}
            </div>
          </header>

          <section className="mb-8 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Paciente</p>
              <p className="mt-1 text-base font-semibold">{exam.patient.full_name}</p>
              <p className="text-sm text-slate-600">
                Nascimento: {exam.patient.dob.toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Data do exame</p>
              <p className="mt-1 text-base font-semibold">{exam.exam_date.toLocaleDateString('pt-BR')}</p>
              <p className="text-sm text-slate-600">
                Profissional: {exam.examiner.full_name}{exam.examiner.crm ? ` - ${exam.examiner.crm}` : ''}
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h1 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">Graduação Refrativa</h1>
            <table className="w-full border-collapse text-center text-sm">
              <thead>
                <tr className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <th className="border border-slate-300 px-3 py-3 text-left">Olho</th>
                  <th className="border border-slate-300 px-3 py-3">Esférico</th>
                  <th className="border border-slate-300 px-3 py-3">Cilíndrico</th>
                  <th className="border border-slate-300 px-3 py-3">Eixo</th>
                  <th className="border border-slate-300 px-3 py-3">Acuidade Visual</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-3 py-4 text-left font-semibold">OD (Direito)</td>
                  <td className="border border-slate-300 px-3 py-4 font-semibold">{formatSphere(exam.od_sph)}</td>
                  <td className="border border-slate-300 px-3 py-4">{formatCylinder(exam.od_cyl)}</td>
                  <td className="border border-slate-300 px-3 py-4">{exam.od_axis ? `${exam.od_axis}°` : '-'}</td>
                  <td className="border border-slate-300 px-3 py-4 font-semibold">{exam.od_va || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-4 text-left font-semibold">OE (Esquerdo)</td>
                  <td className="border border-slate-300 px-3 py-4 font-semibold">{formatSphere(exam.oe_sph)}</td>
                  <td className="border border-slate-300 px-3 py-4">{formatCylinder(exam.oe_cyl)}</td>
                  <td className="border border-slate-300 px-3 py-4">{exam.oe_axis ? `${exam.oe_axis}°` : '-'}</td>
                  <td className="border border-slate-300 px-3 py-4 font-semibold">{exam.oe_va || '-'}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-slate-300 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Adição (ADD)</p>
              <p className="mt-1 text-base font-semibold">
                {exam.addition ? `+${Number(exam.addition).toFixed(2)} D` : 'Sem adição'}
              </p>
            </div>
            <div className="border border-slate-300 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Distância Pupilar (DP)</p>
              <p className="mt-1 text-base font-semibold">
                {exam.pd ? `${Number(exam.pd).toFixed(1)} mm` : '-'}
              </p>
            </div>
          </section>

          <section className="mb-14 min-h-24 border border-slate-300 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Observações</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {exam.prescription_notes || 'Sem observações registradas.'}
            </p>
          </section>

          <footer className="mt-14 grid gap-8 sm:grid-cols-2">
            <div className="border-t border-slate-400 pt-2 text-center text-sm text-slate-600">
              Assinatura do profissional
            </div>
            <div className="border-t border-slate-400 pt-2 text-center text-sm text-slate-600">
              {exam.examiner.full_name}{exam.examiner.crm ? ` - ${exam.examiner.crm}` : ''}
            </div>
          </footer>
        </article>
      </div>
    </main>
  )
}
