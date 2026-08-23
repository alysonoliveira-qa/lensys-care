// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/recipient.ts
// Resolve o destinatário de uma mensagem a partir do paciente, nunca do corpo
// da requisição.
//
// As rotas de disparo manual aceitavam um número `to` arbitrário vindo do
// cliente. Quem estivesse autenticado num plano com mensageria podia usar o
// saldo Twilio/Z-API da clínica para mandar mensagem para qualquer número do
// mundo — custo direto na conta de quem paga a assinatura, e sem nenhum vínculo
// com paciente que permitisse auditar depois. Aqui o telefone passa a vir do
// banco, escopado pela clínica da sessão: o cliente escolhe *para qual
// paciente*, não *para qual número*.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'

/** Teto de tamanho da mensagem — evita payload absurdo e SMS multipartes caros. */
export const MAX_MESSAGE_LENGTH = 1000

export type MessagingRecipient = {
  patientId: string
  patientName: string
  phone: string
}

/**
 * Devolve o destinatário quando o paciente pertence à clínica e tem telefone.
 * `null` cobre os três casos em que não há para quem mandar — paciente de outra
 * clínica, paciente inexistente e paciente sem telefone — de propósito: a rota
 * responde a mesma coisa nos três, sem revelar qual deles ocorreu.
 */
export async function resolvePatientRecipient(
  clinicId: string,
  patientId: string
): Promise<MessagingRecipient | null> {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinic_id: clinicId },
    select: { id: true, full_name: true, phone: true },
  })

  if (!patient?.phone) return null

  const phone = patient.phone.trim()
  if (!phone) return null

  return { patientId: patient.id, patientName: patient.full_name, phone }
}
