import Link from 'next/link'

import {
  PATIENTS_TABS,
  buildPatientsTabHref,
  type PatientsTab,
} from '@/lib/patients/patients-tabs'

export default function PatientsTabs({ activeTab }: { activeTab: PatientsTab }) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm"
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
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
