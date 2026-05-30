'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Search } from 'lucide-react'

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

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }

  const inputClassName =
    'h-11 w-full rounded-xl border border-slate-200/80 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-700 dark:placeholder:text-slate-500'

  const selectClassName =
    'h-11 w-full appearance-none rounded-xl border border-slate-200/80 bg-white px-4 pr-10 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-700'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex-1">
        <label
          htmlFor="patients-search"
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Busca
        </label>
        <div className="relative">
          <Input
            id="patients-search"
            name="search"
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Pesquisar por nome completo ou e-mail..."
            className={inputClassName}
            data-cy="patients-search-input"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="flex flex-col gap-1 md:w-56">
        <label htmlFor="patients-sort" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ordenar por
        </label>
        <div className="relative">
          <select
            id="patients-sort"
            value={sort}
            onChange={(event) => handleSortChange(event.target.value as PatientSortOption)}
            className={selectClassName}
            data-cy="patients-sort-select"
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome A-Z</option>
            <option value="birthdate">Data de nascimento</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="h-11 rounded-xl border border-slate-200/80 bg-white px-6 font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-700 dark:hover:bg-slate-950"
      >
        Filtrar
      </Button>
    </form>
  )
}
