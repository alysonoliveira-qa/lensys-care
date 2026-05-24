import Link from 'next/link'
import { Activity, Bell, LayoutDashboard, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const benefits = [
  {
    title: 'Pacientes e histórico clínico organizados',
    icon: Users,
  },
  {
    title: 'Registro de exames e refração',
    icon: Activity,
  },
  {
    title: 'Alertas de retorno e renovação',
    icon: Bell,
  },
  {
    title: 'Dashboard clínico da rotina',
    icon: LayoutDashboard,
  },
]

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute left-[-18%] top-[-18%] h-[34rem] w-[34rem] rounded-full bg-violet-600/12 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-18%] right-[-18%] h-[34rem] w-[34rem] rounded-full bg-indigo-600/12 blur-[120px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-7 w-7 text-white" />
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Lensys <span className="text-indigo-400">Care</span>
            </h1>

            <p className="mt-3 text-sm font-medium text-slate-400 sm:text-base">
              Sistema de gestão para optometria clínica
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Pacientes, exames, atendimentos e evolução clínica em uma plataforma feita
              para profissionais da visão.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Durante a fase de validação, o acesso ao sistema está gratuito.
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="premium" size="lg" className="w-full sm:w-auto">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-slate-700 bg-slate-900/50 text-white hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white sm:w-auto"
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

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon

              return (
                <Card
                  key={benefit.title}
                  className="border-slate-800 bg-slate-900/55 shadow-xl shadow-slate-950/20 backdrop-blur-sm"
                >
                  <CardContent className="flex items-start gap-3 p-5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-200">
                      {benefit.title}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
