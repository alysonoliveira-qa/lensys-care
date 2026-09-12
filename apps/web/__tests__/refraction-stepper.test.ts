import { describe, expect, it } from 'vitest'

import {
  REFRACTION_FIELD_SPECS,
  clampFieldValue,
  formatFieldValue,
  parseFieldValue,
  stepRefractionValue,
  stepsFromDrag,
} from '../lib/exams/refraction-stepper'

const { sph, cyl, axis, addition, pd } = REFRACTION_FIELD_SPECS

describe('parseFieldValue', () => {
  it('reads plain and negative decimals', () => {
    expect(parseFieldValue('-1.25')).toBe(-1.25)
    expect(parseFieldValue('  2.50 ')).toBe(2.5)
  })

  it('accepts the comma a brazilian user types', () => {
    expect(parseFieldValue('1,25')).toBe(1.25)
  })

  it('treats mid-typing fragments as empty instead of NaN', () => {
    expect(parseFieldValue('')).toBeNull()
    expect(parseFieldValue('-')).toBeNull()
    expect(parseFieldValue('.')).toBeNull()
    expect(parseFieldValue('abc')).toBeNull()
  })
})

describe('formatFieldValue', () => {
  it('keeps two decimals on dioptric fields and none on axis', () => {
    expect(formatFieldValue(-1.5, sph)).toBe('-1.50')
    expect(formatFieldValue(90, axis)).toBe('90')
    expect(formatFieldValue(63.5, pd)).toBe('63.5')
  })

  it('never prints a negative zero', () => {
    expect(formatFieldValue(-0.0000001, sph)).toBe('0.00')
  })
})

describe('clampFieldValue', () => {
  it('holds dioptric fields inside their range', () => {
    expect(clampFieldValue(-40, sph)).toBe(-20)
    expect(clampFieldValue(40, sph)).toBe(20)
    expect(clampFieldValue(2, cyl)).toBe(0)
    expect(clampFieldValue(-12, cyl)).toBe(-10)
  })

  it('wraps the axis instead of clamping it', () => {
    // 0° e 180° são o mesmo meridiano — passar de 180 volta para 1.
    expect(clampFieldValue(181, axis)).toBe(1)
    expect(clampFieldValue(180, axis)).toBe(180)
    expect(clampFieldValue(0, axis)).toBe(180)
    expect(clampFieldValue(-1, axis)).toBe(179)
  })
})

describe('stepRefractionValue', () => {
  it('moves one step per unit on the dioptric grid', () => {
    expect(stepRefractionValue('-1.00', 1, sph)).toBe('-0.75')
    expect(stepRefractionValue('-1.00', -1, sph)).toBe('-1.25')
    expect(stepRefractionValue('0.00', 4, sph)).toBe('1.00')
  })

  it('does not drift after repeated steps', () => {
    let value = '0.00'
    for (let index = 0; index < 12; index += 1) {
      value = stepRefractionValue(value, 1, sph)
    }
    expect(value).toBe('3.00')
  })

  it('snaps an off-grid value to the next grid house in the travel direction', () => {
    // Grau herdado de outro sistema: +1 tem que dar 1.50, não 1.55.
    expect(stepRefractionValue('1.30', 1, sph)).toBe('1.50')
    expect(stepRefractionValue('1.30', -1, sph)).toBe('1.25')
    expect(stepRefractionValue('1.30', 2, sph)).toBe('1.75')
  })

  it('starts from the field origin when empty', () => {
    expect(stepRefractionValue('', 1, sph)).toBe('0.25')
    expect(stepRefractionValue('', -1, sph)).toBe('-0.25')
    expect(stepRefractionValue('', 1, pd)).toBe('62.5')
  })

  it('lands on plano when stepping an empty cylinder upward', () => {
    // origin 0 + 0.25 estoura o max 0 do cilindro negativo e volta para plano.
    expect(stepRefractionValue('', 1, cyl)).toBe('0.00')
    expect(stepRefractionValue('', -1, cyl)).toBe('-0.25')
  })

  it('respects each field range at the edges', () => {
    expect(stepRefractionValue('20.00', 1, sph)).toBe('20.00')
    expect(stepRefractionValue('-20.00', -1, sph)).toBe('-20.00')
    expect(stepRefractionValue('0.00', 1, cyl)).toBe('0.00')
    expect(stepRefractionValue('4.00', 1, addition)).toBe('4.00')
  })

  it('wraps the axis across 180', () => {
    expect(stepRefractionValue('180', 1, axis)).toBe('1')
    expect(stepRefractionValue('1', -1, axis)).toBe('180')
    expect(stepRefractionValue('90', 5, axis)).toBe('95')
  })
})

describe('stepsFromDrag', () => {
  it('turns rightward travel into an increase', () => {
    expect(stepsFromDrag(24, sph)).toBe(3)
    expect(stepsFromDrag(-24, sph)).toBe(-3)
  })

  it('ignores travel shorter than a full step', () => {
    expect(stepsFromDrag(7, sph)).toBe(0)
    expect(stepsFromDrag(-7, sph)).toBe(0)
  })

  it('slows down three-fold while shift is held', () => {
    expect(stepsFromDrag(24, sph, true)).toBe(1)
  })

  it('sweeps the axis faster than the dioptric fields', () => {
    expect(stepsFromDrag(24, axis)).toBe(8)
  })
})
