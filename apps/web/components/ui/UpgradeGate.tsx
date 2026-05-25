'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react'

export interface UpgradeGateProps {
  feature: 'whatsapp' | 'sms' | 'bulk_send'
  title?: string
  description?: string
}

const FEATURE_META = {
  whatsapp: {
    name: 'Alertas automáticos via WhatsApp',
    description: 'Envie notificações automáticas com alto índice de leitura para lembrar seus pacientes da data de vencimento da receita.',
    benefits: ['Disparo automático 1 ano após o exame', 'Mensagem direta e personalizada', 'Maior taxa de conversão em reconsultas'],
  },
  sms: {
    name: 'Alertas automatizados via SMS',
    description: 'Lembre seus pacientes de forma rápida e direta direto na caixa de entrada SMS dos celulares.',
    benefits: ['Cobertura de todas as operadoras nacionais', 'Envio automático em segundo plano', 'Custo-benefício excelente para recall'],
  },
  bulk_send: {
    name: 'Envio em massa e Recall Inteligente',
    description: 'Selecione e envie notificações promocionais e de retorno de exames para dezenas de pacientes simultaneamente.',
    benefits: ['Envio em um único clique', 'Filtro avançado por idade e vencimento', 'Relatório completo de entregas'],
  },
}

export default function UpgradeGate({ feature, title, description }: UpgradeGateProps) {
  const meta = FEATURE_META[feature]

  return (
    <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden relative">
      {/* Absolute Decorative Glow behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      <CardContent className="p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
        {/* Lock indicator */}
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <Lock className="h-5 w-5 animate-pulse" />
        </div>

        {/* Info */}
        <div className="flex-grow space-y-3 text-center md:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {title || meta.name}
            </h4>
            <div className="flex justify-center">
              <Badge variant="premium">Plano Conecta</Badge>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground max-w-xl">
            {description || meta.description}
          </p>

          <div className="py-2">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Benefícios Inclusos:</h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 max-w-lg mx-auto md:mx-0">
              {meta.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 justify-center sm:justify-start">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0 w-full md:w-auto flex md:flex-col justify-center items-center">
          <Link href="/dashboard/planos" passHref>
            <Button variant="premium" className="group shadow-md hover:shadow-lg transition-all duration-200">
              Ativar Plano Conecta
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
