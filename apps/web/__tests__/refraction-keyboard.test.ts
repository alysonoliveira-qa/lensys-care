import { describe, expect, it } from 'vitest'

import {
  navDirectionFromKey,
  nextNavIndex,
  stepVisualAcuity,
} from '../lib/exams/refraction-keyboard'

describe('navDirectionFromKey', () => {
  it('maps the side arrows to field navigation', () => {
    expect(navDirectionFromKey('ArrowRight')).toBe(1)
    expect(navDirectionFromKey('ArrowLeft')).toBe(-1)
  })

  it('leaves every other key alone', () => {
    expect(navDirectionFromKey('ArrowUp')).toBeNull()
    expect(navDirectionFromKey('Tab')).toBeNull()
    expect(navDirectionFromKey('1')).toBeNull()
  })
})

describe('nextNavIndex', () => {
  it('moves one field in either direction', () => {
    expect(nextNavIndex(2, 10, 1)).toBe(3)
    expect(nextNavIndex(2, 10, -1)).toBe(1)
  })

  it('stops at the ends instead of wrapping over filled fields', () => {
    expect(nextNavIndex(9, 10, 1)).toBeNull()
    expect(nextNavIndex(0, 10, -1)).toBeNull()
  })

  it('ignores a field that is not part of the sequence', () => {
    expect(nextNavIndex(-1, 10, 1)).toBeNull()
  })
})

describe('stepVisualAcuity', () => {
  it('goes up towards 20/20 and down towards 20/200', () => {
    expect(stepVisualAcuity('20/40', 1)).toBe('20/30')
    expect(stepVisualAcuity('20/40', -1)).toBe('20/50')
  })

  it('clamps at both ends of the list', () => {
    expect(stepVisualAcuity('20/20', 1)).toBe('20/20')
    expect(stepVisualAcuity('20/200', -1)).toBe('20/200')
  })

  it('starts from the previous exam when the field is empty', () => {
    expect(stepVisualAcuity('', -1, '20/60')).toBe('20/80')
  })

  it('starts from 20/20 without a usable reference', () => {
    expect(stepVisualAcuity('', -1)).toBe('20/25')
    expect(stepVisualAcuity('20/15', -1, 'conta dedos')).toBe('20/25')
  })
})
