'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react'

import { FEATURE_UI_META, type PlanFeature } from '@/lib/plans/plan-feature-config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface UpgradeGateProps {
  feature: PlanFeature
  title?: string
  description?: string
}

export default function UpgradeGate({ feature, title, description }: UpgradeGateProps) {
  const meta = FEATURE_UI_META[feature]

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-3xl" />

      <CardContent className="relative z-10 flex flex-col items-center gap-6 p-8 md:flex-row md:items-start">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
          <Lock className="h-5 w-5 animate-pulse" />
        </div>

        <div className="flex-grow space-y-3 text-center md:text-left">
          <div className="flex flex-col justify-center gap-2 sm:flex-row sm:items-center md:justify-start">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title || meta.name}</h4>
            <div className="flex justify-center">
              <Badge variant="premium">Plano Conecta</Badge>
            </div>
          </div>

          <p className="max-w-xl text-sm text-muted-foreground">{description || meta.description}</p>

          <div className="py-2">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Benefícios Inclusos:</h5>
            <ul className="mx-auto grid max-w-lg grid-cols-1 gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 sm:grid-cols-2 md:mx-0">
              {meta.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center justify-center gap-2 sm:justify-start">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex w-full flex-shrink-0 items-center justify-center md:w-auto md:flex-col">
          <Link href="/subscription" passHref>
            <Button variant="premium" className="group shadow-md transition-all duration-200 hover:shadow-lg">
              Ativar Plano Conecta
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
