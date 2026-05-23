import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const highlights = [
  'Pacientes e histórico clínico organizados',
  'Exames, atendimentos e evolução em um só lugar',
  'Fluxo simples para a rotina do profissional optometrista',
]

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 text-white selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute left-[-20%] top-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center py-16">
        <div className="w-full max-w-3xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Lensys <span className="text-indigo-400">Care</span>
          </h1>

          <p className="mt-3 text-sm font-medium text-slate-400 sm:text-base">
            Sistema de gestão para optometria clínica
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Pacientes, exames, atendimentos e evolução clínica em uma plataforma feita para
            profissionais da visão.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="premium" size="lg" className="w-full sm:w-auto">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full border-slate-800 bg-slate-900/50 text-white hover:border-indigo-400/40 hover:bg-slate-900 sm:w-auto"
            >
              <Link href="/register">Criar conta</Link>
            </Button>
          </div>

          <div className="mt-4">
            <Link
              href="/planos"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
            >
              Ver planos
            </Link>
          </div>

          <div className="mt-12 flex flex-col items-center gap-3 text-sm text-slate-400">
            {highlights.map((item) => (
              <div
                key={item}
                className="rounded-full border border-slate-800/80 bg-slate-900/40 px-4 py-2"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
