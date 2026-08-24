// ─────────────────────────────────────────────────────────────────────────────
// lib/alerts/alert-channel.ts
// Escolha do canal de envio, no momento do disparo.
// ─────────────────────────────────────────────────────────────────────────────

export type AlertChannel = 'EMAIL' | 'WHATSAPP' | 'SMS'

export interface ContatoPaciente {
  email: string | null
  phone: string | null
}

export interface CanaisPermitidos {
  whatsapp: boolean
  sms: boolean
}

export interface ResolucaoDeCanal {
  canal: AlertChannel | null
  /** Por que este canal — ou por que nenhum. Vai para o relatório do cron. */
  motivo: string
}

/**
 * Ordem de tentativa quando o canal gravado não dá para entregar.
 *
 * WhatsApp na frente por alcance: a base real tem 1.096 pacientes com telefone
 * e 5 com e-mail. Manter e-mail como primeira opção seria escolher o canal que
 * não chega a ninguém só porque é o mais barato.
 */
const ORDEM_DE_FALLBACK: AlertChannel[] = ['WHATSAPP', 'EMAIL', 'SMS']

function podeEntregar(
  canal: AlertChannel,
  contato: ContatoPaciente,
  permitidos: CanaisPermitidos
): boolean {
  switch (canal) {
    case 'EMAIL':
      return Boolean(contato.email)
    case 'WHATSAPP':
      return Boolean(contato.phone) && permitidos.whatsapp
    case 'SMS':
      return Boolean(contato.phone) && permitidos.sms
  }
}

/**
 * Decide por onde o lembrete sai.
 *
 * O canal ficava congelado na criação do alerta — `createAlertForExam` grava
 * `EMAIL` e nenhum chamador nunca passou outra coisa. Resultado: os 1.126
 * alertas de produção são todos EMAIL, e 1.121 deles são para pacientes que não
 * têm e-mail. O recall existia, disparava, e não alcançava ninguém.
 *
 * Congelar o canal na criação também é errado por natureza: entre o exame e o
 * lembrete passa **um ano**. Nesse intervalo o paciente ganha WhatsApp, a
 * clínica muda de plano, o e-mail deixa de existir. A decisão pertence ao
 * momento do envio, com o contato e o plano de agora.
 *
 * O canal gravado vira preferência, não ordem: se der para entregar por ele,
 * é ele. Só quando não dá é que o fallback entra.
 */
export function resolveAlertChannel(
  preferido: AlertChannel,
  contato: ContatoPaciente,
  permitidos: CanaisPermitidos
): ResolucaoDeCanal {
  if (podeEntregar(preferido, contato, permitidos)) {
    return { canal: preferido, motivo: `canal preferido (${preferido}) entregável` }
  }

  for (const candidato of ORDEM_DE_FALLBACK) {
    if (candidato === preferido) continue

    if (podeEntregar(candidato, contato, permitidos)) {
      return {
        canal: candidato,
        motivo: `${preferido} indisponível; usando ${candidato}`,
      }
    }
  }

  if (!contato.email && !contato.phone) {
    return { canal: null, motivo: 'paciente sem e-mail e sem telefone' }
  }

  return {
    canal: null,
    motivo: contato.phone
      ? 'paciente só tem telefone, e o plano não inclui WhatsApp nem SMS'
      : 'nenhum canal disponível para os contatos deste paciente',
  }
}
