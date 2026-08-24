import { describe, expect, it } from 'vitest'

import { resolveAlertChannel } from '../lib/alerts/alert-channel'

const COM_TUDO = { email: 'paciente@exemplo.com', phone: '11999990000' }
const SO_TELEFONE = { email: null, phone: '11999990000' }
const SO_EMAIL = { email: 'paciente@exemplo.com', phone: null }
const SEM_CONTATO = { email: null, phone: null }

const CONECTA = { whatsapp: true, sms: true }
const ESSENCIAL = { whatsapp: false, sms: false }

describe('resolveAlertChannel', () => {
  it('respeita o canal gravado quando dá para entregar por ele', () => {
    expect(resolveAlertChannel('EMAIL', COM_TUDO, CONECTA).canal).toBe('EMAIL')
    expect(resolveAlertChannel('WHATSAPP', COM_TUDO, CONECTA).canal).toBe('WHATSAPP')
    expect(resolveAlertChannel('SMS', COM_TUDO, CONECTA).canal).toBe('SMS')
  })

  it('cai para WhatsApp quando o paciente não tem e-mail', () => {
    // Este é o caso da base real: 1.096 pacientes com telefone, 5 com e-mail, e
    // TODOS os alertas gravados como EMAIL. Antes disso, o recall disparava e
    // não alcançava ninguém.
    const { canal, motivo } = resolveAlertChannel('EMAIL', SO_TELEFONE, CONECTA)

    expect(canal).toBe('WHATSAPP')
    expect(motivo).toContain('EMAIL indisponível')
  })

  it('cai para e-mail quando o paciente não tem telefone', () => {
    expect(resolveAlertChannel('WHATSAPP', SO_EMAIL, CONECTA).canal).toBe('EMAIL')
    expect(resolveAlertChannel('SMS', SO_EMAIL, CONECTA).canal).toBe('EMAIL')
  })

  it('não usa canal que o plano não inclui', () => {
    // No Essencial, paciente só com telefone não tem por onde receber: WhatsApp
    // e SMS são do Conecta. O certo é pular e dizer o motivo, não tentar e falhar.
    const { canal, motivo } = resolveAlertChannel('EMAIL', SO_TELEFONE, ESSENCIAL)

    expect(canal).toBeNull()
    expect(motivo).toContain('plano não inclui')
  })

  it('entrega por e-mail no Essencial quando o paciente tem e-mail', () => {
    expect(resolveAlertChannel('EMAIL', COM_TUDO, ESSENCIAL).canal).toBe('EMAIL')
    expect(resolveAlertChannel('WHATSAPP', COM_TUDO, ESSENCIAL).canal).toBe('EMAIL')
  })

  it('pula quando não há contato nenhum, dizendo isso', () => {
    const { canal, motivo } = resolveAlertChannel('EMAIL', SEM_CONTATO, CONECTA)

    expect(canal).toBeNull()
    expect(motivo).toBe('paciente sem e-mail e sem telefone')
  })

  it('prefere WhatsApp a SMS no fallback', () => {
    // Os dois entregam para quem tem telefone; WhatsApp tem leitura muito maior
    // e, no Brasil, custa menos que SMS.
    expect(resolveAlertChannel('EMAIL', SO_TELEFONE, CONECTA).canal).toBe('WHATSAPP')
  })

  it('usa SMS quando o plano tem SMS mas não WhatsApp', () => {
    expect(
      resolveAlertChannel('EMAIL', SO_TELEFONE, { whatsapp: false, sms: true }).canal
    ).toBe('SMS')
  })

  it('sempre devolve motivo, inclusive no caminho feliz', () => {
    // O motivo vai para a resposta do cron. Um pulo sem explicação repetiria o
    // problema que custou meia sessão: "failed: 1" sem dizer por quê.
    for (const resolucao of [
      resolveAlertChannel('EMAIL', COM_TUDO, CONECTA),
      resolveAlertChannel('EMAIL', SO_TELEFONE, CONECTA),
      resolveAlertChannel('EMAIL', SEM_CONTATO, CONECTA),
    ]) {
      expect(resolucao.motivo.length).toBeGreaterThan(0)
    }
  })
})
