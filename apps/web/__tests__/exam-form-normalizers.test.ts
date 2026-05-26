import { describe, expect, it } from 'vitest'
import {
  emptyStringToNull,
  parseOptionalDecimal,
  parseOptionalInteger,
} from '../lib/exams/exam-form-normalizers'

describe('exam form normalizers', () => {
  it('preserves decimal parsing with point notation', () => {
    expect(parseOptionalDecimal('-1.25')).toBe(-1.25)
  })

  it('keeps optional numeric fields empty when no value is entered', () => {
    expect(parseOptionalDecimal('')).toBe('')
    expect(parseOptionalInteger('')).toBe('')
  })

  it('preserves existing axis integer conversion', () => {
    expect(parseOptionalInteger('180')).toBe(180)
  })

  it('converts only empty text to null and preserves visual acuity values', () => {
    expect(emptyStringToNull('')).toBeNull()
    expect(emptyStringToNull('20/20')).toBe('20/20')
    expect(emptyStringToNull('20/37')).toBe('20/37')
  })

  it('preserves prescription note text without trimming it', () => {
    expect(emptyStringToNull('  Antirreflexo.\nRetorno em 12 meses.  '))
      .toBe('  Antirreflexo.\nRetorno em 12 meses.  ')
  })
})
