// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/providers/meta.ts
// WhatsApp Cloud API — a API oficial da Meta, sem intermediário.
//
// Por que direto e não via Twilio: o Twilio cobra taxa de plataforma POR CIMA do
// que a Meta já cobra pela mensagem. Indo direto se paga só a Meta. O custo de
// entrada é burocrático (verificar o Business Manager, aprovar template) e se
// paga uma vez; a taxa do intermediário se paga todo mês.
//
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
// ─────────────────────────────────────────────────────────────────────────────

import { normalizePhoneBR } from '../phone'

const GRAPH_VERSION = 'v21.0'

interface MetaSendResponse {
  messages?: Array<{ id?: string }>
  error?: { message?: string; code?: number; error_subcode?: number }
}

/**
 * Formato que a Meta espera: dígitos com código do país, sem `+`, sem espaço e
 * sem pontuação. É o mesmo que a Z-API quer, então a regra mora em
 * `lib/messaging/phone.ts` e os dois provedores compartilham.
 */
export const normalizePhoneForMeta = normalizePhoneBR

export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_TOKEN)
}

/**
 * Envia uma mensagem de **template** pela Cloud API.
 *
 * Template e não texto livre, e isso não é preferência: a Meta só aceita texto
 * livre dentro da janela de 24 horas desde a última mensagem DO CLIENTE. Um
 * lembrete de recall é iniciado pela clínica, meses depois do último contato —
 * fora de qualquer janela. Texto livre ali volta com o erro 131047.
 *
 * O template precisa estar aprovado no Business Manager antes de qualquer envio,
 * e a categoria certa é "utility" (lembrete de serviço), não "marketing":
 * utility é mais barato e tem aprovação mais simples.
 *
 * @param to         Telefone do paciente, em qualquer formato de cadastro
 * @param parametros Valores que preenchem as variáveis do corpo, na ordem
 */
export async function sendWhatsAppTemplateViaMeta(
  to: string,
  parametros: string[]
): Promise<void> {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.META_WHATSAPP_TOKEN
  const template = process.env.META_WHATSAPP_TEMPLATE ?? 'lembrete_retorno'
  const idioma = process.env.META_WHATSAPP_TEMPLATE_LANG ?? 'pt_BR'

  if (!phoneNumberId || !token) {
    throw new Error(
      'Credenciais da Meta ausentes. Defina META_WHATSAPP_PHONE_NUMBER_ID e META_WHATSAPP_TOKEN.'
    )
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhoneForMeta(to),
        type: 'template',
        template: {
          name: template,
          language: { code: idioma },
          components: parametros.length
            ? [
                {
                  type: 'body',
                  parameters: parametros.map((text) => ({ type: 'text', text })),
                },
              ]
            : [],
        },
      }),
    }
  )

  const resultado = (await response.json().catch(() => ({}))) as MetaSendResponse

  if (!response.ok || resultado.error) {
    // A mensagem da Meta é específica e útil (template não aprovado, número não
    // registrado, janela expirada). Propagar em vez de resumir: quem lê o log de
    // um recall que não saiu precisa do motivo, não de "falhou".
    const detalhe = resultado.error?.message ?? `HTTP ${response.status}`
    const codigo = resultado.error?.code ? ` (código ${resultado.error.code})` : ''

    throw new Error(`Meta WhatsApp recusou o envio${codigo}: ${detalhe}`)
  }

  console.log(`[meta] WhatsApp enviado: ${resultado.messages?.[0]?.id ?? 'sem id'}`)
}
