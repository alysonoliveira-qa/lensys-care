import Link from 'next/link'
import { ArrowRight, Bell, ClipboardPlus, LayoutDashboard, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    title: 'Pacientes e prontuário',
    description: 'Histórico clínico organizado para acompanhar cada paciente com segurança.',
    icon: Users,
  },
  {
    title: 'Exames e refração',
    description: 'Registros claros de avaliações e evolução visual em um único lugar.',
    icon: ClipboardPlus,
  },
  {
    title: 'Alertas de retorno',
    description: 'Acompanhamento de recalls para manter o cuidado contínuo.',
    icon: Bell,
  },
  {
    title: 'Dashboard clínico',
    description: 'Visão rápida da rotina da clínica e das próximas ações.',
    icon: LayoutDashboard,
  },
]

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute left-[-20%] top-[-25%] h-[620px] w-[620px] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-25%] right-[-18%] h-[620px] w-[620px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold tracking-tight text-white">Lensys Care</p>
              <p className="hidden text-xs text-slate-400 sm:block">Optometria clínica</p>
            </div>
          </div>

          <Link href="/login" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
            Entrar
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-14 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
          <div className="max-w-xl lg:flex-1">
            <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Lensys Care
            </span>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Sistema de gestão para{' '}
              <span className="bg-gradient-to-r from-violet-300 via-indigo-300 to-blue-300 bg-clip-text text-transparent">
                optometria clínica
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Organize pacientes, atendimentos, exames e evolução clínica em uma plataforma
              feita para profissionais da visão.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="premium" size="lg" className="w-full gap-2 sm:w-auto">
                <Link href="/login">
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-slate-700 bg-slate-900/40 text-white hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white sm:w-auto"
              >
                <Link href="/register">Criar conta</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="w-full text-slate-300 hover:bg-slate-900 hover:text-white sm:w-auto"
              >
                <Link href="/planos">Ver planos</Link>
              </Button>
            </div>
          </div>

          <div className="w-full max-w-lg lg:flex-1">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-2xl shadow-indigo-950/30 backdrop-blur-md sm:p-6">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800/70 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Painel clínico
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">Visão geral da clínica</p>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  Atualizado
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Atendimentos', value: '24', detail: 'Esta semana' },
                  { label: 'Exames', value: '18', detail: 'Registrados' },
                  { label: 'Retornos', value: '07', detail: 'Pendentes' },
                  { label: 'Pacientes', value: '156', detail: 'Em acompanhamento' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-indigo-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-10 sm:pb-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/45 p-5 transition-colors hover:border-indigo-500/30 hover:bg-slate-900/70"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold text-white">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
