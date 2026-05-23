import Link from 'next/link'
import { Activity, Bell, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

const highlights = [
  {
    title: 'Prontuário',
    description: 'Pacientes e histórico clínico',
    icon: FileText,
  },
  {
    title: 'Exames',
    description: 'Atendimentos e evolução',
    icon: Activity,
  },
  {
    title: 'Retornos',
    description: 'Alertas para acompanhamento',
    icon: Bell,
  },
]

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute left-[-20%] top-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Lensys Care
          </p>
        </div>

        <Card glass className="relative border-slate-800 bg-slate-900/60 shadow-2xl">
          <CardHeader className="px-6 pb-4 pt-8 text-center sm:px-10">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Sistema de gestão para{' '}
              <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                optometria clínica
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400 sm:text-base">
              Organize pacientes, atendimentos, exames e evolução clínica em uma plataforma
              feita para profissionais da visão.
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-7 pt-4 sm:px-10">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="premium" size="lg" className="w-full font-semibold">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-slate-700 bg-slate-950/40 text-white hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white"
              >
                <Link href="/register">Criar conta</Link>
              </Button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {highlights.map((highlight) => {
                const Icon = highlight.icon

                return (
                  <div
                    key={highlight.title}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-left"
                  >
                    <Icon className="mb-2 h-4 w-4 text-indigo-300" />
                    <p className="text-xs font-semibold text-white">{highlight.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{highlight.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-800/60 px-6 py-4">
            <Link
              href="/planos"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-indigo-300"
            >
              Conhecer planos e recursos
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
