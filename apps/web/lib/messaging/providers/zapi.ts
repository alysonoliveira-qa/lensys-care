// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/providers/zapi.ts
// Z-API — provedor brasileiro de WhatsApp, não-oficial (protocolo do WhatsApp
// Web, como o Baileys, mas hospedado por eles).
//
// Por que ele existe aqui: a Cloud API da Meta exige app sob um portfólio
// empresarial, e portfólio exige um perfil pessoal do Facebook em situação
// regular. Quando esse caminho está fechado, a Z-API entrega hoje — ao custo de
// operar fora dos termos oficiais do WhatsApp, com risco de banimento do número
// pareado. É ponte, não destino: o destino é BSP oficial ou Cloud API direta.
//
// Vantagem prática sobre a Meta: aceita **texto livre**, sem janela de 24h e sem
// template aprovado — é sessão de WhatsApp Web, não a API de negócios. Por isso
// `sendWhatsAppRecall` manda template na Meta e texto pronto aqui.
//
// Docs: https://developer.z-api.io
// ─────────────────────────────────────────────────────────────────────────────

import { normalizePhoneBR } from '../phone'

const ZAPI_BASE_URL = 'https://api.z-api.io'

interface ZAPIMessageResponse {
  zaapId?: string
  messageId?: string
  id?: string
  error?: string
}

/** @deprecated Use `normalizePhoneBR`. Mantido para não quebrar importadores. */
export const normalizePhoneForZAPI = normalizePhoneBR

/**
 * Envia mensagem de texto pelo WhatsApp via Z-API.
 *
 * @param to      Telefone do destinatário, em qualquer formato de cadastro
 * @param message Corpo da mensagem (texto livre)
 */
export async function sendWhatsAppViaZAPI(to: string, message: string): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token) {
    throw new Error(
      'Credenciais da Z-API ausentes. Defina ZAPI_INSTANCE_ID e ZAPI_TOKEN.'
    )
  }

  const phone = normalizePhoneBR(to)
  const url = `${ZAPI_BASE_URL}/instances/${instanceId}/token/${token}/send-text`

  // `Client-Token` é o "token de segurança da conta", gerado na aba Segurança do
  // painel. Ele nasce **desativado**, então uma integração sem o header funciona
  // — até alguém ativar a proteção, e aí todo envio passa a falhar de uma vez.
  // Mandar sempre que existir evita a quebra silenciosa no dia do aperto.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (clientToken) {
    headers['Client-Token'] = clientToken
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone, message }),
  })

  const resultado = (await response.json().catch(() => ({}))) as ZAPIMessageResponse

  if (!response.ok || resultado.error) {
    const detalhe = resultado.error ?? `HTTP ${response.status}`

    // A Z-API responde `null not allowed` quando o Client-Token é exigido e não
    // veio. A mensagem crua não menciona header nenhum, e já custou tarde de
    // gente procurando erro no número e na instância.
    if (!clientToken && /null not allowed/i.test(detalhe)) {
      throw new Error(
        'Z-API recusou o envio: o token de segurança da conta está ativo e o header ' +
          '`Client-Token` não foi enviado. Preencha ZAPI_CLIENT_TOKEN (painel da ' +
          'Z-API → aba Segurança → Token de segurança da conta).'
      )
    }

    throw new Error(`Z-API recusou o envio: ${detalhe}`)
  }

  console.log(`[z-api] WhatsApp enviado: ${resultado.messageId ?? 'sem id'}`)
}

/**
 * `true` quando a Z-API pode ser usada.
 *
 * `ZAPI_CLIENT_TOKEN` fica **fora** desta checagem de propósito: ele só é
 * obrigatório depois que a conta ativa a proteção, e exigi-lo aqui deixaria de
 * fora quem ainda não ativou — que é o estado de toda conta nova.
 */
export function isZAPIConfigured(): boolean {
  return Boolean(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN)
}
