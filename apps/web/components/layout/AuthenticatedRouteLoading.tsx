import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800 ${className}`} />
}

export function DashboardRouteLoading() {
  return (
    <div className="space-y-8 select-none" aria-busy="true" aria-label="Carregando painel">
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-3">
          <Pulse className="h-8 w-64" />
          <Pulse className="h-4 w-80 max-w-full" />
        </div>
        <Pulse className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
            <CardHeader className="space-y-3 pb-2">
              <Pulse className="h-3 w-28" />
              <Pulse className="h-9 w-16" />
            </CardHeader>
            <CardContent className="pt-2">
              <Pulse className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={3} />
        </div>
        <div className="space-y-6">
          <PanelSkeleton rows={3} />
          <PanelSkeleton rows={2} />
        </div>
      </div>
    </div>
  )
}

export function RecordsRouteLoading() {
  return (
    <div className="space-y-6 select-none" aria-busy="true" aria-label="Carregando conteúdo">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-3">
          <Pulse className="h-7 w-64" />
          <Pulse className="h-4 w-96 max-w-full" />
        </div>
        <Pulse className="h-10 w-40" />
      </div>
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
        <CardContent className="p-4">
          <Pulse className="h-10 w-full" />
        </CardContent>
      </Card>
      <PanelSkeleton rows={6} />
    </div>
  )
}

export function PlansRouteLoading() {
  return (
    <div className="space-y-7 select-none" aria-busy="true" aria-label="Carregando planos">
      <div className="space-y-3">
        <Pulse className="h-7 w-52" />
        <Pulse className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={4} />
      </div>
    </div>
  )
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
      <CardHeader className="space-y-3">
        <Pulse className="h-5 w-48" />
        <Pulse className="h-3 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <Pulse key={index} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}
