'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LOGIN_REDIRECT_PERFORMANCE_KEY } from '@/components/performance/LoginDestinationPerformance'

interface LoginPageContentProps {
  sourcePath: '/login' | '/auth/login'
  showHomeLink?: boolean
  includeTestSelectors?: boolean
  notice?: string | null
}

export default function LoginPageContent({
  sourcePath,
  showHomeLink = false,
  includeTestSelectors = false,
  notice = null,
}: LoginPageContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    const loginAttemptId = crypto.randomUUID().slice(0, 8)
    const loginStartedAt = performance.now()
    const loginStartedAtEpochMs = Date.now()
    console.info(`[perf][${loginAttemptId}] client login ${sourcePath}.submit_started: 0.0ms`)

    if (!email || !password) {
      console.info(`[perf][${loginAttemptId}] client login ${sourcePath}.validation_failed: ${(performance.now() - loginStartedAt).toFixed(1)}ms`)
      setError('Por favor, preencha todos os campos.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const signInStartedAt = performance.now()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      console.info(
        `[perf][${loginAttemptId}] client login ${sourcePath}.auth.signInWithPassword: ${(performance.now() - signInStartedAt).toFixed(1)}ms`
      )

      if (signInError) {
        console.info(`[perf][${loginAttemptId}] client login ${sourcePath}.total (auth_error): ${(performance.now() - loginStartedAt).toFixed(1)}ms`)
        setError(
          signInError.status === 400
            ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
            : signInError.message
        )
        setLoading(false)
      } else {
        window.sessionStorage.setItem(
          LOGIN_REDIRECT_PERFORMANCE_KEY,
          JSON.stringify({
            id: loginAttemptId,
            source: sourcePath,
            destination: '/dashboard',
            startedAt: loginStartedAtEpochMs,
          })
        )
        console.info(
          `[perf][${loginAttemptId}] client login ${sourcePath}.redirect_requested /dashboard: ${(performance.now() - loginStartedAt).toFixed(1)}ms`
        )
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      console.info(`[perf][${loginAttemptId}] client login ${sourcePath}.total (exception): ${(performance.now() - loginStartedAt).toFixed(1)}ms`)
      setError('Ocorreu um erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
    // Sucesso: mantém `loading` durante o redirect para /dashboard — o componente
    // desmonta na navegação, evitando o "piscar" do botão de volta ao estado ocioso.
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 select-none">
      <div className="pointer-events-none absolute left-[-20%] top-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="z-10 w-full max-w-md transform transition-all duration-300 hover:scale-[1.01]">
        {showHomeLink && (
          <div className="mb-5 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Link>
          </div>
        )}

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Lensys <span className="text-indigo-400">Care</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Sistema de gestão para optometria clínica</p>
        </div>

        <Card glass className="relative border-slate-800 bg-slate-900/60 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-2xl font-bold text-white">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-center text-sm text-slate-400">
              Insira seus dados para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4" data-cy={includeTestSelectors ? 'login-form' : undefined}>
              {notice && (
                <div
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-medium text-emerald-400"
                  data-cy="login-notice"
                >
                  {notice}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400 animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="email">
                  E-mail profissional
                </label>
                <Input
                  id="email"
                  type="email"
                  data-cy={includeTestSelectors ? 'login-email-input' : undefined}
                  placeholder="exemplo@clinicamail.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 border-slate-800 bg-slate-950/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="password">
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    data-cy={includeTestSelectors ? 'login-password-input' : undefined}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 border-slate-800 bg-slate-950/50 pr-10 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="premium"
                className="mt-2 h-11 w-full text-base font-semibold transition-all duration-200"
                disabled={loading}
                data-cy={includeTestSelectors ? 'login-submit-button' : undefined}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  'Entrar na conta'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/60 pt-4">
            <div className="text-center text-sm text-slate-400">
              Ainda não tem conta?{' '}
              <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
                Criar conta grátis
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
