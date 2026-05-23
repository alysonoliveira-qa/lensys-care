import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
            Lensys Care
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Sistema de gestão para optometria clínica
            </h1>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
              Base inicial do MVP para profissionais optometristas: autenticação, dashboard protegido e a estrutura para pacientes e atendimento clínico.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/login">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 sm:w-auto">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full border-slate-700 bg-transparent text-white hover:bg-slate-900 sm:w-auto">
                Criar conta
              </Button>
            </Link>
            <Link href="/planos">
              <Button variant="ghost" className="w-full text-slate-300 hover:bg-slate-900 hover:text-white sm:w-auto">
                Ver planos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
