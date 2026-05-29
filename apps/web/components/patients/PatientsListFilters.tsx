'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  buildPatientsListQuery,
  type PatientSortOption,
} from '@/lib/patients/patient-list-sorting'

interface PatientsListFiltersProps {
  initialSearch: string
  initialSort: PatientSortOption
}

export default function PatientsListFilters({
  initialSearch,
  initialSort,
}: PatientsListFiltersProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [sort, setSort] = useState(initialSort)

  const navigate = (nextSearch: string, nextSort: PatientSortOption) => {
    router.push(buildPatientsListQuery({
      search: nextSearch,
      sort: nextSort,
      page: 1,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(search, sort)
  }

  const handleSortChange = (nextSort: PatientSortOption) => {
    setSort(nextSort)
    navigate(search, nextSort)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="relative flex-1">
        <Input
          name="search"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por nome completo ou e-mail..."
          className="h-10 border-slate-200 bg-slate-50 pl-9 dark:border-slate-800 dark:bg-slate-950/20"
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      <div className="flex flex-col gap-1 md:w-56">
        <label htmlFor="patients-sort" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ordenar por
        </label>
        <select
          id="patients-sort"
          value={sort}
          onChange={(event) => handleSortChange(event.target.value as PatientSortOption)}
          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200"
          data-cy="patients-sort-select"
        >
          <option value="recent">Mais recentes</option>
          <option value="name">Nome A-Z</option>
          <option value="birthdate">Data de nascimento</option>
        </select>
      </div>

      <Button type="submit" variant="secondary" className="h-10 px-6 font-semibold">
        Filtrar
      </Button>
    </form>
  )
}
