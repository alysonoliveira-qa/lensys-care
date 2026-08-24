// Este arquivo força o fuso ANTES de qualquer `Date` existir. Sem isso, o teste
// passaria por acidente numa máquina em UTC — que é exatamente como o bug
// sobreviveu: a Vercel roda em UTC e o servidor nunca reproduziu o problema que
// o navegador brasileiro tinha.
process.env.TZ = 'America/Sao_Paulo'

import { describe, expect, it } from 'vitest'

import { isFutureDateOnly, parseDateOnly } from '../lib/patients/patient-dob'
import { calculateAge, getAgeGroupInfo } from '../lib/refraction'

describe('data de nascimento em fuso negativo (UTC-3)', () => {
  it('o ambiente do teste está mesmo deslocado — senão o resto não prova nada', () => {
    expect(new Date('1990-04-12').getDate()).toBe(11)
  })

  describe('parseDateOnly', () => {
    it('interpreta YYYY-MM-DD como o dia digitado, não o anterior', () => {
      const data = parseDateOnly('1990-04-12')

      expect(data).not.toBeNull()
      expect(data!.toISOString()).toBe('1990-04-12T00:00:00.000Z')
      expect(data!.toISOString().slice(0, 10)).toBe('1990-04-12')
    })

    it('recusa data que não existe em vez de deslizar para o mês seguinte', () => {
      // `new Date(Date.UTC(2026, 1, 31))` vira 3 de março em silêncio.
      expect(parseDateOnly('2026-02-31')).toBeNull()
      expect(parseDateOnly('2025-02-29')).toBeNull()
      expect(parseDateOnly('2024-02-29')).not.toBeNull() // bissexto de verdade
    })

    it('recusa o que não é data', () => {
      expect(parseDateOnly('nao-e-data')).toBeNull()
      expect(parseDateOnly('12/04/1990')).toBeNull()
      expect(parseDateOnly('')).toBeNull()
      expect(parseDateOnly(null)).toBeNull()
      expect(parseDateOnly(undefined)).toBeNull()
      expect(parseDateOnly(19900412)).toBeNull()
    })
  })

  describe('isFutureDateOnly', () => {
    it('barra a data de amanhã — o bug antigo deixava passar em UTC-3', () => {
      const agora = new Date('2026-08-24T12:00:00Z')

      expect(isFutureDateOnly(parseDateOnly('2026-08-25')!, agora)).toBe(true)
      expect(isFutureDateOnly(parseDateOnly('2026-08-24')!, agora)).toBe(false)
      expect(isFutureDateOnly(parseDateOnly('2026-08-23')!, agora)).toBe(false)
    })

    it('não barra hoje nem no fim do dia em UTC', () => {
      const fimDoDia = new Date('2026-08-24T23:59:59Z')

      expect(isFutureDateOnly(parseDateOnly('2026-08-24')!, fimDoDia)).toBe(false)
    })
  })

  describe('calculateAge', () => {
    // A coluna é DATE; o Prisma entrega meia-noite UTC. Com getters locais, em
    // UTC-3 isso lê como o dia anterior — e a idade vira um dia mais velha,
    // porque o aniversário parece já ter passado.
    const nascimento = new Date('1981-12-02T00:00:00.000Z')

    it('na véspera do aniversário, a idade ainda não virou', () => {
      const vespera = new Date(2026, 11, 1, 10, 0, 0) // 1º de dezembro, hora local

      expect(calculateAge(nascimento, vespera)).toBe(44)
    })

    it('no dia do aniversário, a idade vira', () => {
      const aniversario = new Date(2026, 11, 2, 10, 0, 0)

      expect(calculateAge(nascimento, aniversario)).toBe(45)
    })

    it('a sugestão de adição vira no dia certo na fronteira dos 40 anos', () => {
      // 39 → 40 é onde a tabela começa a sugerir adição para presbiopia
      // (0,00 → 0,75). Um dia de erro aqui muda a refração sugerida.
      const quarenta = new Date('1986-12-02T00:00:00.000Z')
      const vespera = new Date(2026, 11, 1, 10, 0, 0)
      const aniversario = new Date(2026, 11, 2, 10, 0, 0)

      expect(calculateAge(quarenta, vespera)).toBe(39)
      expect(getAgeGroupInfo(quarenta, vespera).suggestedAddition).toBe(0)

      expect(calculateAge(quarenta, aniversario)).toBe(40)
      expect(getAgeGroupInfo(quarenta, aniversario).suggestedAddition).toBe(0.75)
    })
  })
})
