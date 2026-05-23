'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(
          signInError.status === 400
            ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
            : signInError.message
        )
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError('Ocorreu um erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4 select-none">
      {/* Decorative Glowing Mesh in background */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 transition-all duration-300 transform scale-100 hover:scale-[1.01]">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-3 animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Opto<span className="text-indigo-400">Tech</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">SaaS para Optometristas & Clínicas Ópticas</p>
        </div>

        <Card glass className="border-slate-800 bg-slate-900/60 shadow-2xl relative">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-white text-center">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-slate-400 text-center text-sm">
              Insira seus dados para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider" htmlFor="email">
                  E-mail profissional
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@clinicamail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider" htmlFor="password">
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-11 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="premium"
                className="w-full h-11 text-base font-semibold transition-all duration-200 mt-2"
                disabled={loading}
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
            <div className="text-sm text-slate-400 text-center">
              Ainda não tem conta?{' '}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                Criar conta grátis
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
