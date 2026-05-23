import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Search, Plus, Calendar, Mail, Phone, ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface PatientsPageProps {
  searchParams?: {
    search?: string
    page?: string
  }
}

export const revalidate = 0

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load clinic details
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { clinic_id: true },
  })

  if (!profile) {
    redirect('/login')
  }

  const clinicId = profile.clinic_id
  const search = searchParams?.search || ''
  const page = Number(searchParams?.page) || 1
  const limit = 10
  const skip = (page - 1) * limit

  // Query conditions
  const whereClause = {
    clinic_id: clinicId,
  }

  if (search) {
    whereClause.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [patients, totalCount] = await Promise.all([
    prisma.patient.findMany({
      where: whereClause,
      orderBy: { full_name: 'asc' },
      skip,
      take: limit,
      include: {
        exams: {
          orderBy: { exam_date: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.patient.count({
      where: whereClause,
    }),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            <span>Pacientes Cadastrados</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie prontuários refrativos e acompanhe o vencimento de receitas.
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 font-bold gap-2 shadow-lg shadow-indigo-500/10">
            <Plus className="h-4.5 w-4.5" />
            Cadastrar Paciente
          </Button>
        </Link>
      </div>

      {/* Search Filter Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
        <CardContent className="p-4">
          <form method="GET" action="/patients" className="flex gap-2">
            <div className="relative flex-1">
              <Input
                name="search"
                type="text"
                defaultValue={search}
                placeholder="Pesquisar por nome completo ou e-mail..."
                className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 h-10 pl-9"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            <Button type="submit" variant="secondary" className="h-10 px-6 font-semibold">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Patient List Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-700 animate-pulse" />
              <span>Nenhum paciente cadastrado ou correspondente à busca.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                    <th className="py-3 px-6">Nome Completo</th>
                    <th className="py-3 px-6">Data Nasc.</th>
                    <th className="py-3 px-6">Contato</th>
                    <th className="py-3 px-6">Último Exame</th>
                    <th className="py-3 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patients.map((p) => {
                    const lastExam = p.exams[0]
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-100">{p.full_name}</td>
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(p.dob).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="py-4 px-6 space-y-1">
                          {p.phone && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Phone className="h-3 w-3" />
                              {p.phone}
                            </span>
                          )}
                          {p.email && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Mail className="h-3 w-3" />
                              {p.email}
                            </span>
                          )}
                          {!p.phone && !p.email && <span className="text-xs text-slate-400 font-medium">-</span>}
                        </td>
                        <td className="py-4 px-6">
                          {lastExam ? (
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-indigo-400" />
                              {new Date(lastExam.exam_date).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 italic">Sem registros</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link href={`/patients/${p.id}`}>
                            <Button size="sm" variant="outline" className="h-8 font-bold border-slate-200 dark:border-slate-800">
                              Ver Ficha
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400 font-semibold">
            Página {page} de {totalPages} ({totalCount} pacientes no total)
          </span>
          <div className="flex gap-2">
            <Link href={`/patients?search=${encodeURIComponent(search)}&page=${page - 1}`} passHref>
              <Button size="sm" variant="outline" className="h-8 font-bold" disabled={page <= 1}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
            </Link>
            <Link href={`/patients?search=${encodeURIComponent(search)}&page=${page + 1}`} passHref>
              <Button size="sm" variant="outline" className="h-8 font-bold" disabled={page >= totalPages}>
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
