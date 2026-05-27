'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Loader2, Mail, Phone, ShieldAlert, Sparkles, User } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface RegisterPageContentProps {
  showHomeLink?: boolean
  includeTestSelectors?: boolean
}

export default function RegisterPageContent({
  showHomeLink = false,
  includeTestSelectors = false,
}: RegisterPageContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [ownerName, setOwnerName] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ownerName || !email || !password || !clinicName) {
      setError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, clinicName, ownerName, preferredName, phone }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao realizar o cadastro.')
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

      if (loginError) {
        console.error('Auto login failed:', loginError)
        setError('Cadastro concluído! Por favor, acesse a página de login para entrar.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (registerError: unknown) {
      console.error(registerError)
      setError(registerError instanceof Error ? registerError.message : 'Erro de conexão. Tente novamente mais tarde.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 select-none">
      <div className="pointer-events-none absolute right-[-20%] top-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="z-10 w-full max-w-lg transform transition-all duration-300 hover:scale-[1.005]">
        {showHomeLink && (
          <div className="mb-5 flex justify-center">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white">
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

        <Card glass className="border-slate-800 bg-slate-900/60 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-white">Criar conta clínica</CardTitle>
            <CardDescription className="text-center text-sm text-slate-400">
              Registre sua clínica e seu perfil administrador em segundos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4" data-cy={includeTestSelectors ? 'register-form' : undefined}>
              {error && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400 animate-shake">
                  <ShieldAlert className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-4 md:col-span-2">
                  <h3 className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-sm font-semibold text-slate-400">
                    <Building2 className="h-4 w-4 text-violet-400" />
                    Informações da Clínica
                  </h3>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Nome da Clínica / Consultório *</label>
                  <Input type="text" placeholder="ex: Consultório Clínico de Optometria Dr. Silva" value={clinicName} onChange={(event) => setClinicName(event.target.value)} className="h-10 border-slate-800 bg-slate-950/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20" required disabled={loading} />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Telefone para Contato</label>
                  <div className="relative">
                    <Input type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-10 border-slate-800 bg-slate-950/50 pl-9 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20" disabled={loading} />
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-4 pt-2 md:col-span-2">
                  <h3 className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-sm font-semibold text-slate-400">
                    <User className="h-4 w-4 text-indigo-400" />
                    Informações do Administrador
                  </h3>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Nome Completo *</label>
                  <div className="relative">
                    <Input type="text" placeholder="Seu nome completo" data-cy={includeTestSelectors ? 'register-name-input' : undefined} value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className="h-10 border-slate-800 bg-slate-950/50 pl-9 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20" required disabled={loading} />
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Como prefere ser chamado?</label>
                  <Input type="text" placeholder="Ex: Dra. Ana ou Ana" value={preferredName} onChange={(event) => setPreferredName(event.target.value)} className="h-10 border-slate-800 bg-slate-950/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20" maxLength={60} disabled={loading} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">E-mail profissional *</label>
                  <div className="relative">
                    <Input type="email" placeholder="exemplo@clinicamail.com" data-cy={includeTestSelectors ? 'register-email-input' : undefined} value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 border-slate-800 bg-slate-950/50 pl-9 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20" required disabled={loading} />
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Definir Senha de Acesso *</label>
                  <Input type="password" placeholder="Mínimo 6 caracteres" data-cy={includeTestSelectors ? 'register-password-input' : undefined} value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 border-slate-800 bg-slate-950/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20" required disabled={loading} />
                </div>
              </div>

              <Button type="submit" variant="premium" className="mt-6 h-11 w-full text-base font-semibold transition-all duration-200" disabled={loading} data-cy={includeTestSelectors ? 'register-submit-button' : undefined}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando infraestrutura...
                  </>
                ) : (
                  'Concluir cadastro da clínica'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/60 pt-4">
            <div className="text-center text-sm text-slate-400">
              Já possui uma conta ativa?{' '}
              <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
                Fazer login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
