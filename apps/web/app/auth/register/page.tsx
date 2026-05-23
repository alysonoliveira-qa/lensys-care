'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Sparkles, Loader2, User, Mail, ShieldAlert, Building2, Phone } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [phone, setPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerName || !email || !password || !clinicName) {
      setError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Call custom server endpoint to handle auth + DB transaction
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          clinicName,
          ownerName,
          phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao realizar o cadastro.')
      }

      // 2. Automatically log the newly registered user in
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        console.error('Auto login failed:', loginError)
        setError('Cadastro concluído! Por favor, acesse a página de login para entrar.')
        setLoading(false)
        return
      }

      // 3. Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erro de conexão. Tente novamente mais tarde.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden py-12 px-4 select-none">
      {/* Decorative background glow */}
      <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg z-10 transition-all duration-300 transform scale-100 hover:scale-[1.005]">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-3 animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Opto<span className="text-indigo-400">Tech</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Primeiro mês grátis sem compromisso</p>
        </div>

        <Card glass className="border-slate-800 bg-slate-900/60 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white text-center">Criar conta clínica</CardTitle>
            <CardDescription className="text-slate-400 text-center text-sm">
              Registre sua clínica e seu perfil administrador em segundos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center flex items-center justify-center gap-2 animate-shake">
                  <ShieldAlert className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clinic Section */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <Building2 className="h-4 w-4 text-violet-400" />
                    Informações da Clínica
                  </h3>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Nome da Clínica / Consultório *
                  </label>
                  <Input
                    type="text"
                    placeholder="ex: Consultório Clínico de Optometria Dr. Silva"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-10"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2 md:col-span-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Telefone para Contato
                  </label>
                  <div className="relative">
                    <Input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-10 pl-9"
                      disabled={loading}
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                {/* Professional Admin Section */}
                <div className="space-y-4 md:col-span-2 pt-2">
                  <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <User className="h-4 w-4 text-indigo-400" />
                    Informações do Administrador
                  </h3>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Seu nome completo"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-10 pl-9"
                      required
                      disabled={loading}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    E-mail profissional *
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="exemplo@clinicamail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-10 pl-9"
                      required
                      disabled={loading}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Definir Senha de Acesso *
                  </label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950/50 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20 h-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="premium"
                className="w-full h-11 text-base font-semibold transition-all duration-200 mt-6"
                disabled={loading}
              >
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
            <div className="text-sm text-slate-400 text-center">
              Já possui uma conta ativa?{' '}
              <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                Fazer login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
