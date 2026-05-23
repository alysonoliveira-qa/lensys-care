'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgeGroup } from '@/hooks/useAgeGroup'
import { ArrowLeft, Loader2, Sparkles, UserPlus } from 'lucide-react'

export default function NewPatientPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use hook to compute age group & addition in real time as DOB changes!
  const { age, ageGroup, suggestedAddition } = useAgeGroup(dob)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !dob) {
      setError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          dob,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao salvar paciente.')
      }

      router.push(`/patients/${data.patient.id}`)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none">
      {/* Navigation and Title */}
      <div className="flex flex-col gap-2">
        <Link href="/patients" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pacientes
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-indigo-500" />
          <span>Cadastrar Novo Paciente</span>
        </h2>
        <p className="text-sm text-slate-500">
          Preencha os dados cadastrais básico do paciente para iniciar o prontuário.
        </p>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Name */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nome Completo do Paciente *
                </label>
                <Input
                  type="text"
                  placeholder="ex: João da Silva Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 h-10"
                  required
                  disabled={loading}
                />
              </div>

              {/* Date of birth */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Data de Nascimento *
                </label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 h-10"
                  required
                  disabled={loading}
                />
              </div>

              {/* Real-time age calculator box */}
              <div className="space-y-2 md:col-span-1 flex flex-col justify-end">
                {dob && age !== null && ageGroup ? (
                  <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 flex items-center justify-between animate-fadeIn h-10">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Idade: <span className="font-bold">{age} anos</span>
                    </span>
                    <Badge variant="premium" className="text-[9px] py-0.5">
                      {ageGroup}
                    </Badge>
                  </div>
                ) : (
                  <div className="h-10 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 rounded-xl flex items-center px-4 text-slate-400 text-xs italic">
                    Insira a data de nascimento para calcular a idade
                  </div>
                )}
              </div>

              {/* Suggestions banner */}
              {dob && age !== null && age >= 40 && (
                <div className="md:col-span-2 p-3.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold animate-fadeIn">
                  <Sparkles className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
                  <span>
                    Paciente com presbiopia. Adição presbiópica sugerida: <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">+{suggestedAddition.toFixed(2)} D</span>
                  </span>
                </div>
              )}

              {/* Patient Phone */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Celular / WhatsApp
                </label>
                <Input
                  type="tel"
                  placeholder="ex: (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 h-10"
                  disabled={loading}
                />
              </div>

              {/* Patient Email */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="ex: joao@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 h-10"
                  disabled={loading}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Observações Clínicas Gerais
                </label>
                <textarea
                  placeholder="Insira patologias prévias, histórico familiar ou outras notas clínicas relevantes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-slate-50 dark:bg-slate-950/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 focus:border-primary/30"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
              <Link href="/patients">
                <Button type="button" variant="outline" className="h-10 px-6 font-semibold border-slate-200 dark:border-slate-800" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" className="h-10 px-8 font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/10" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Paciente'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
