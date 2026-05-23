'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Check, X, ArrowLeft, Loader2, CreditCard, ExternalLink } from 'lucide-react'

const PLANS = {
  essential: {
    name: 'Essencial',
    price: 'Grátis',
    description: 'Tudo o que sua clínica precisa para gerenciar prontuários e fidelizar clientes por e-mail.',
    features: [
      'Cadastro de pacientes ilimitado',
      'Prontuário refrativo completo',
      'Adição por presbiopia inteligente',
      'Alertas de renovação por e-mail',
      'Painel de controle básico',
    ],
    unavailable: [
      'Notificações por WhatsApp',
      'Notificações por SMS',
      'Disparos em massa (Recall)',
    ],
  },
  conecta: {
    name: 'Conecta',
    price: {
      monthly: 'R$ 149',
      annual: 'R$ 119',
    },
    description: 'Alcance máximo e automatização total através de alertas diretos via WhatsApp e SMS com recall instantâneo.',
    features: [
      'Tudo do plano Essencial',
      'Notificações por WhatsApp inclusas',
      'Notificações por SMS inclusas',
      'Disparos em massa (Recall de Pacientes)',
      'Filtros de recall automatizados',
      'Trial de 7 dias grátis',
      'Suporte prioritário via WhatsApp',
    ],
    unavailable: [],
  },
}

export default function PlanosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [loadingUser, setLoadingUser] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState(false)
  const [canceledMsg, setCanceledMsg] = useState(false)

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          // Fetch their subscription from Supabase DB via client
          const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

          if (profile?.clinic_id) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('clinic_id', profile.clinic_id)
              .single()

            if (sub) {
              setSubscription(sub)
            }
          }
        }
      } catch (err) {
        console.error('Error loading subscription info:', err)
      } finally {
        setLoadingUser(false)
      }
    }
    checkUser()

    if (searchParams.get('success') === 'true') {
      setSuccessMsg(true)
    }
    if (searchParams.get('canceled') === 'true') {
      setCanceledMsg(true)
    }
  }, [supabase, searchParams])

  const handleAction = async (planKey: 'essential' | 'conecta') => {
    if (!userId) {
      router.push('/register')
      return
    }

    if (planKey === 'essential') {
      router.push('/dashboard')
      return
    }

    // Handle subscription / checkout
    setLoadingCheckout('conecta')
    try {
      if (subscription?.plan === 'CONECTA' && subscription?.status !== 'CANCELED') {
        // Open Billing Portal
        const res = await fetch('/api/stripe/portal', {
          method: 'POST',
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          alert(data.message || 'Erro ao carregar portal de faturamento.')
        }
      } else {
        // Open Checkout Session
        const priceKey = billingPeriod === 'monthly' ? 'conecta_monthly' : 'conecta_annual'
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceKey }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          alert(data.message || 'Erro ao iniciar checkout Stripe.')
        }
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao processar requisição.')
    } finally {
      setLoadingCheckout(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden select-none py-16 px-4">
      {/* Decorative gradient blur background */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto z-10 relative space-y-12">
        {/* Nav Header */}
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-sm font-semibold text-slate-400 hover:text-white transition-colors gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o início
          </Link>
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 rounded-full shadow-sm text-xs font-bold">
            <Sparkles className="h-3 w-3 text-white" />
            <span>Planos Atualizados</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Escolha o plano ideal para sua <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-300">clínica crescer</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            Tenha prontuários inteligentes, alertas de vencimento integrados e conecte-se com seus pacientes na ferramenta que eles mais usam.
          </p>

          {/* Billing Toggle */}
          <div className="pt-6 flex justify-center items-center gap-4">
            <span className={`text-sm font-semibold ${billingPeriod === 'monthly' ? 'text-white' : 'text-slate-500'}`}>Mensal</span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="w-14 h-8 bg-slate-900 border border-slate-800 rounded-full p-1 transition-all focus:outline-none"
            >
              <div className={`w-6 h-6 rounded-full bg-indigo-500 transition-all ${billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-semibold flex items-center gap-1.5 ${billingPeriod === 'annual' ? 'text-white' : 'text-slate-500'}`}>
              Anual
              <Badge variant="success" className="text-[10px] px-1.5 py-0">Economize 20%</Badge>
            </span>
          </div>
        </div>

        {/* Message banners */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold text-center max-w-md mx-auto animate-bounce">
            Assinatura Conecta concluída com sucesso! Obrigado pela preferência. 🎉
          </div>
        )}
        {canceledMsg && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold text-center max-w-md mx-auto">
            O processo de assinatura foi cancelado. Você pode tentar novamente quando quiser.
          </div>
        )}

        {/* Grid cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-4">
          {/* ESSENTIAL PLAN CARD */}
          <Card className="border-slate-800 bg-slate-900/40 relative flex flex-col justify-between overflow-hidden">
            <CardHeader className="space-y-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">{PLANS.essential.name}</CardTitle>
                {subscription?.plan === 'ESSENTIAL' && (
                  <Badge variant="secondary">Seu plano atual</Badge>
                )}
              </div>
              <div className="py-2">
                <span className="text-4xl font-extrabold text-white">{PLANS.essential.price}</span>
              </div>
              <CardDescription className="text-slate-400 text-sm">{PLANS.essential.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              <div className="border-t border-slate-800/80 my-4" />
              <ul className="space-y-3 text-sm">
                {PLANS.essential.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
                {PLANS.essential.unavailable.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 opacity-40">
                    <X className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-500 line-through">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-6">
              <Button
                variant="outline"
                className="w-full h-11 border-slate-800 bg-transparent text-slate-300 hover:bg-slate-900 hover:text-white"
                onClick={() => handleAction('essential')}
                disabled={loadingUser || subscription?.plan === 'ESSENTIAL'}
              >
                {subscription?.plan === 'ESSENTIAL' ? 'Já Ativo' : 'Começar Gratuitamente'}
              </Button>
            </CardFooter>
          </Card>

          {/* CONECTA PLAN CARD */}
          <Card className="border-indigo-500/30 bg-slate-900/60 relative flex flex-col justify-between overflow-hidden shadow-indigo-500/5 shadow-2xl">
            {/* Ribbon banner */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-violet-600 to-indigo-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider">
              Recomendado
            </div>

            <CardHeader className="space-y-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold text-indigo-300">{PLANS.conecta.name}</CardTitle>
                {subscription?.plan === 'CONECTA' && subscription?.status !== 'CANCELED' && (
                  <Badge variant="premium">Assinatura Ativa</Badge>
                )}
              </div>
              <div className="py-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">
                  {billingPeriod === 'monthly' ? PLANS.conecta.price.monthly : PLANS.conecta.price.annual}
                </span>
                <span className="text-slate-400 text-xs font-semibold">/mês</span>
              </div>
              <CardDescription className="text-slate-300 text-sm">{PLANS.conecta.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              <div className="border-t border-slate-800/80 my-4" />
              <ul className="space-y-3 text-sm">
                {PLANS.conecta.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-100 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-6">
              <Button
                variant="premium"
                className="w-full h-11 text-base font-bold shadow-indigo-500/10 flex items-center justify-center gap-2 group"
                onClick={() => handleAction('conecta')}
                disabled={loadingUser || loadingCheckout === 'conecta'}
              >
                {loadingCheckout === 'conecta' ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Processando...
                  </>
                ) : subscription?.plan === 'CONECTA' && subscription?.status !== 'CANCELED' ? (
                  <>
                    <CreditCard className="h-4.5 w-4.5" />
                    Gerenciar Assinatura
                  </>
                ) : (
                  <>
                    Ativar 7 dias de Trial Grátis
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
