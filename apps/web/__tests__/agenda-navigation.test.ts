import { describe, expect, it } from 'vitest'

import {
  AGENDA_BASE_PATH,
  buildAgendaDayNavigation,
  buildAgendaHref,
  formatAgendaDateLabel,
  resolveAgendaDate,
} from '../lib/appointments/agenda-navigation'

describe('resolveAgendaDate', () => {
  const today = '2026-08-02'

  it('uses the requested date when it is valid', () => {
    expect(resolveAgendaDate('2026-07-15', today)).toBe('2026-07-15')
  })

  it('falls back to today when the query string is absent or garbage', () => {
    expect(resolveAgendaDate(undefined, today)).toBe(today)
    expect(resolveAgendaDate('', today)).toBe(today)
    expect(resolveAgendaDate('ontem', today)).toBe(today)
    expect(resolveAgendaDate('2026-02-30', today)).toBe(today)
  })
})

describe('buildAgendaHref', () => {
  it('keeps the date in the query string', () => {
    expect(buildAgendaHref('2026-08-02')).toBe(`${AGENDA_BASE_PATH}?date=2026-08-02`)
  })
})

describe('formatAgendaDateLabel', () => {
  it('formats in PT-BR without shifting the day', () => {
    expect(formatAgendaDateLabel('2026-08-02')).toContain('02/08/2026')
    expect(formatAgendaDateLabel('2026-01-01')).toContain('01/01/2026')
  })
})

describe('buildAgendaDayNavigation', () => {
  const today = '2026-08-02'

  it('exposes yesterday, today and tomorrow as links', () => {
    const navigation = buildAgendaDayNavigation(today, today)

    expect(navigation.previousHref).toBe(`${AGENDA_BASE_PATH}?date=2026-08-01`)
    expect(navigation.nextHref).toBe(`${AGENDA_BASE_PATH}?date=2026-08-03`)
    expect(navigation.todayHref).toBe(`${AGENDA_BASE_PATH}?date=2026-08-02`)
  })

  it('names the day relative to today', () => {
    expect(buildAgendaDayNavigation('2026-08-02', today).relativeLabel).toBe('Hoje')
    expect(buildAgendaDayNavigation('2026-08-01', today).relativeLabel).toBe('Ontem')
    expect(buildAgendaDayNavigation('2026-08-03', today).relativeLabel).toBe('Amanhã')
    expect(buildAgendaDayNavigation('2026-08-10', today).relativeLabel).toBeNull()
  })

  it('flags the current day and keeps past days navigable', () => {
    expect(buildAgendaDayNavigation(today, today).isToday).toBe(true)

    const past = buildAgendaDayNavigation('2026-07-01', today)
    expect(past.isToday).toBe(false)
    expect(past.previousHref).toBe(`${AGENDA_BASE_PATH}?date=2026-06-30`)
  })
})
