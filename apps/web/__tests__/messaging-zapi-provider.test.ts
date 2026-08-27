import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isZAPIConfigured,
  sendWhatsAppViaZAPI,
} from '../lib/messaging/providers/zapi'
import { normalizePhoneBR } from '../lib/messaging/phone'

const ENV_ORIGINAL = { ...process.env }

function respostaOk(body: unknown = { messageId: 'msg-1' }) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

function respostaErro(status: number, body: unknown) {
  return { ok: false, status, json: async () => body } as unknown as Response
}

function ultimaChamada() {
  const chamada = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]

  return { url: chamada[0] as string, init: chamada[1] as RequestInit }
}

describe('provider Z-API', () => {
  beforeEach(() => {
    process.env.ZAPI_INSTANCE_ID = 'inst-1'
    process.env.ZAPI_TOKEN = 'tok-1'
    delete process.env.ZAPI_CLIENT_TOKEN
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = { ...ENV_ORIGINAL }
  })

  describe('normalizePhoneBR', () => {
    it('põe o código do país e tira a pontuação do cadastro', () => {
      expect(normalizePhoneBR('(11) 99999-0000')).toBe('5511999990000')
      expect(normalizePhoneBR('11999990000')).toBe('5511999990000')
      expect(normalizePhoneBR('+55 11 99999-0000')).toBe('5511999990000')
    })

    it('não duplica o 55 de quem já veio com código do país', () => {
      expect(normalizePhoneBR('5511999990000')).toBe('5511999990000')
      expect(normalizePhoneBR('+5511999990000')).toBe('5511999990000')
    })
  })

  describe('isZAPIConfigured', () => {
    it('exige instância e token', () => {
      expect(isZAPIConfigured()).toBe(true)

      delete process.env.ZAPI_TOKEN
      expect(isZAPIConfigured()).toBe(false)
    })

    // O Client-Token nasce desativado na conta; exigi-lo aqui deixaria de fora
    // toda conta nova, que é justamente quem está tentando ligar o provedor.
    it('não exige o Client-Token', () => {
      delete process.env.ZAPI_CLIENT_TOKEN
      expect(isZAPIConfigured()).toBe(true)
    })
  })

  describe('sendWhatsAppViaZAPI', () => {
    it('falha claro quando falta credencial', async () => {
      delete process.env.ZAPI_INSTANCE_ID

      await expect(sendWhatsAppViaZAPI('11999990000', 'oi')).rejects.toThrow(
        /ZAPI_INSTANCE_ID/
      )
    })

    it('monta a URL com instância e token, e normaliza o telefone', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(respostaOk())

      await sendWhatsAppViaZAPI('(11) 99999-0000', 'Olá, Maria!')

      const { url, init } = ultimaChamada()
      expect(url).toBe('https://api.z-api.io/instances/inst-1/token/tok-1/send-text')
      expect(JSON.parse(init.body as string)).toEqual({
        phone: '5511999990000',
        message: 'Olá, Maria!',
      })
    })

    it('não manda o header Client-Token quando ele não existe', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(respostaOk())

      await sendWhatsAppViaZAPI('11999990000', 'oi')

      const { init } = ultimaChamada()
      expect(init.headers).not.toHaveProperty('Client-Token')
    })

    // O bug que este PR corrige: sem o header, todo envio quebra no dia em que a
    // conta ativa o token de segurança.
    it('manda o header Client-Token quando configurado', async () => {
      process.env.ZAPI_CLIENT_TOKEN = 'client-abc'
      globalThis.fetch = vi.fn().mockResolvedValue(respostaOk())

      await sendWhatsAppViaZAPI('11999990000', 'oi')

      const { init } = ultimaChamada()
      expect((init.headers as Record<string, string>)['Client-Token']).toBe('client-abc')
    })

    it('propaga o erro da Z-API em vez de resumir', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(respostaErro(400, { error: 'phone not found' }))

      await expect(sendWhatsAppViaZAPI('11999990000', 'oi')).rejects.toThrow(
        /phone not found/
      )
    })

    // `null not allowed` não menciona header nenhum: sem tradução, procura-se o
    // erro no número e na instância por horas.
    it('traduz "null not allowed" para a causa real', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(respostaErro(401, { error: 'null not allowed' }))

      await expect(sendWhatsAppViaZAPI('11999990000', 'oi')).rejects.toThrow(
        /ZAPI_CLIENT_TOKEN/
      )
    })

    it('não sugere o Client-Token quando ele já estava configurado', async () => {
      process.env.ZAPI_CLIENT_TOKEN = 'client-abc'
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(respostaErro(401, { error: 'null not allowed' }))

      await expect(sendWhatsAppViaZAPI('11999990000', 'oi')).rejects.toThrow(
        /null not allowed/
      )
    })

    it('não quebra quando o corpo do erro não é JSON', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('não é json')
        },
      } as unknown as Response)

      await expect(sendWhatsAppViaZAPI('11999990000', 'oi')).rejects.toThrow(/HTTP 502/)
    })
  })
})
