import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isMetaConfigured,
  normalizePhoneForMeta,
  sendWhatsAppTemplateViaMeta,
} from '../lib/messaging/providers/meta'

const ENV_ORIGINAL = { ...process.env }

function respostaOk(body: unknown = { messages: [{ id: 'wamid.123' }] }) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

describe('provider Meta WhatsApp Cloud API', () => {
  beforeEach(() => {
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = '1234567890'
    process.env.META_WHATSAPP_TOKEN = 'token-de-teste'
    delete process.env.META_WHATSAPP_TEMPLATE
    delete process.env.META_WHATSAPP_TEMPLATE_LANG
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = { ...ENV_ORIGINAL }
  })

  describe('normalizePhoneForMeta', () => {
    it('põe o código do país e tira a pontuação do cadastro', () => {
      // O telefone vem de digitação livre; não há formato garantido no banco.
      expect(normalizePhoneForMeta('(11) 99999-0000')).toBe('5511999990000')
      expect(normalizePhoneForMeta('11999990000')).toBe('5511999990000')
      expect(normalizePhoneForMeta('+55 11 99999-0000')).toBe('5511999990000')
    })

    it('não duplica o 55 de quem já veio com código do país', () => {
      expect(normalizePhoneForMeta('5511999990000')).toBe('5511999990000')
      expect(normalizePhoneForMeta('+5511999990000')).toBe('5511999990000')
    })
  })

  describe('isMetaConfigured', () => {
    it('exige as duas credenciais', () => {
      expect(isMetaConfigured()).toBe(true)

      delete process.env.META_WHATSAPP_TOKEN
      expect(isMetaConfigured()).toBe(false)

      process.env.META_WHATSAPP_TOKEN = 'token-de-teste'
      delete process.env.META_WHATSAPP_PHONE_NUMBER_ID
      expect(isMetaConfigured()).toBe(false)
    })
  })

  describe('envio', () => {
    it('manda TEMPLATE, não texto livre', async () => {
      // O ponto do provider inteiro: mensagem iniciada pela clínica, meses após
      // o último contato, está fora da janela de 24h. Texto livre ali volta com
      // erro 131047 e o recall não sai.
      const fetchMock = vi.fn().mockResolvedValue(respostaOk())
      vi.stubGlobal('fetch', fetchMock)

      await sendWhatsAppTemplateViaMeta('11999990000', ['Maria Silva'])

      const [url, init] = fetchMock.mock.calls[0]
      const corpo = JSON.parse(init.body)

      expect(url).toContain('/1234567890/messages')
      expect(init.headers.authorization).toBe('Bearer token-de-teste')
      expect(corpo.messaging_product).toBe('whatsapp')
      expect(corpo.type).toBe('template')
      expect(corpo.text).toBeUndefined()
      expect(corpo.to).toBe('5511999990000')
      expect(corpo.template.name).toBe('lembrete_retorno')
      expect(corpo.template.language.code).toBe('pt_BR')
      expect(corpo.template.components).toEqual([
        { type: 'body', parameters: [{ type: 'text', text: 'Maria Silva' }] },
      ])
    })

    it('respeita template e idioma configurados por ambiente', async () => {
      process.env.META_WHATSAPP_TEMPLATE = 'recall_lensys_v2'
      process.env.META_WHATSAPP_TEMPLATE_LANG = 'pt_PT'
      const fetchMock = vi.fn().mockResolvedValue(respostaOk())
      vi.stubGlobal('fetch', fetchMock)

      await sendWhatsAppTemplateViaMeta('11999990000', ['Ana'])

      const corpo = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(corpo.template.name).toBe('recall_lensys_v2')
      expect(corpo.template.language.code).toBe('pt_PT')
    })

    it('omite components quando não há parâmetro', async () => {
      // Template sem variável recusa `components` com body vazio.
      const fetchMock = vi.fn().mockResolvedValue(respostaOk())
      vi.stubGlobal('fetch', fetchMock)

      await sendWhatsAppTemplateViaMeta('11999990000', [])

      expect(JSON.parse(fetchMock.mock.calls[0][1].body).template.components).toEqual([])
    })

    it('propaga a mensagem de erro da Meta, que é o que diz o motivo', async () => {
      // "Template não aprovado" e "número não registrado" pedem ações diferentes.
      // Resumir para "falhou" obriga a adivinhar.
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            error: { message: 'Template name does not exist', code: 132001 },
          }),
        } as unknown as Response)
      )

      await expect(sendWhatsAppTemplateViaMeta('11999990000', ['Maria'])).rejects.toThrow(
        /132001.*Template name does not exist/
      )
    })

    it('trata erro que vem com HTTP 200 no corpo', async () => {
      // A Graph API às vezes devolve 200 com `error` no JSON.
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(respostaOk({ error: { message: 'Invalid parameter' } }))
      )

      await expect(sendWhatsAppTemplateViaMeta('11999990000', ['Maria'])).rejects.toThrow(
        /Invalid parameter/
      )
    })

    it('falha claro quando não há credencial, sem chamar a rede', async () => {
      delete process.env.META_WHATSAPP_TOKEN
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      await expect(sendWhatsAppTemplateViaMeta('11999990000', ['Maria'])).rejects.toThrow(
        /Credenciais da Meta ausentes/
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
