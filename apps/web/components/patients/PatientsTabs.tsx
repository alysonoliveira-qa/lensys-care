import Link from 'next/link'

import {
  PATIENTS_TABS,
  buildPatientsTabHref,
  type PatientsTab,
} from '@/lib/patients/patients-tabs'

export default function PatientsTabs({ activeTab }: { activeTab: PatientsTab }) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      data-cy="patients-tabs"
    >
      {PATIENTS_TABS.map((tab) => {
        const isActive = tab.id === activeTab

        return (
          <Link
            key={tab.id}
            href={buildPatientsTabHref(tab.id)}
            data-cy={tab.dataCy}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-950/40'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
