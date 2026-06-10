'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email/invite'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InviteRole = 'OPTOMETRIST' | 'RECEPTIONIST'

export interface InviteActionState {
  status: 'idle' | 'success' | 'error'
  message: string
}

export interface RemoveMemberState {
  status: 'idle' | 'success' | 'error'
  message: string
}

export interface ChangeMemberRoleState {
  status: 'idle' | 'success' | 'error'
  message: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna o perfil do usuário autenticado com clinic_id e role. */
async function getAuthenticatedProfile() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('id', user.id)
    .single()

  return profile ?? null
}

// ─── createInvite ─────────────────────────────────────────────────────────────
// Cria um convite para um novo membro entrar na clínica.
// Apenas OWNER pode convidar.

export async function createInvite(
  _previousState: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const email = formData.get('email')?.toString().trim().toLowerCase()
  const role = formData.get('role')?.toString()

  if (!email) {
    return { status: 'error', message: 'Informe o e-mail do convidado.' }
  }

  if (role !== 'OPTOMETRIST' && role !== 'RECEPTIONIST') {
    return { status: 'error', message: 'Função inválida. Selecione Optometrista ou Recepcionista.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) {
    return { status: 'error', message: 'Sua sessão expirou. Entre novamente.' }
  }

  if (profile.role !== 'OWNER') {
    return { status: 'error', message: 'Apenas o proprietário da clínica pode enviar convites.' }
  }

  // Verifica se já existe convite PENDING e válido para este e-mail nesta clínica
  const existingInvite = await prisma.invite.findFirst({
    where: {
      clinic_id: profile.clinic_id,
      email,
      status: 'PENDING',
      expires_at: { gt: new Date() },
    },
  })

  if (existingInvite) {
    return {
      status: 'error',
      message:
        'Já existe um convite pendente para este e-mail. Aguarde a expiração ou revogue-o antes de reenviar.',
    }
  }

  // Cria o convite com validade de 72h
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

  const invite = await prisma.invite.create({
    data: {
      clinic_id: profile.clinic_id,
      email,
      role,
      invited_by: profile.id,
      expires_at: expiresAt,
    },
    include: {
      clinic: { select: { name: true } },
    },
  })

  // Dispara o email de convite diretamente (não bloqueia a action)
  sendInviteEmail({
    to: email,
    token: invite.token,
    clinicName: invite.clinic.name,
    role,
  }).catch((err) => console.error('Falha ao enfileirar email de convite:', err))

  revalidatePath('/account')

  return {
    status: 'success',
    message: `Convite enviado para ${email}. O link expira em 72 horas.`,
  }
}

// ─── revokeInvite ─────────────────────────────────────────────────────────────
// Revoga um convite pendente. Apenas OWNER pode revogar.

export async function revokeInvite(
  _previousState: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const inviteId = formData.get('invite_id')?.toString()

  if (!inviteId) {
    return { status: 'error', message: 'Convite não identificado.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) {
    return { status: 'error', message: 'Sua sessão expirou. Entre novamente.' }
  }

  if (profile.role !== 'OWNER') {
    return { status: 'error', message: 'Apenas o proprietário pode revogar convites.' }
  }

  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, clinic_id: profile.clinic_id, status: 'PENDING' },
  })

  if (!invite) {
    return { status: 'error', message: 'Convite não encontrado ou já processado.' }
  }

  await prisma.invite.update({
    where: { id: inviteId },
    data: { status: 'REVOKED' },
  })

  revalidatePath('/account')

  return { status: 'success', message: 'Convite revogado com sucesso.' }
}

// ─── removeMember ────────────────────────────────────────────────────────────
// Remove um membro da clínica. Apenas OWNER pode remover.
// OWNER não pode remover a si mesmo.
// Observação: o usuário do Supabase Auth não é excluído — o membro apenas perde
// o acesso por não ter mais Profile, mantendo a conta Auth para reuso futuro.

export async function removeMember(
  _previousState: RemoveMemberState,
  formData: FormData
): Promise<RemoveMemberState> {
  const memberId = formData.get('member_id')?.toString()

  if (!memberId) {
    return { status: 'error', message: 'Membro não identificado.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) {
    return { status: 'error', message: 'Sua sessão expirou. Entre novamente.' }
  }

  if (profile.role !== 'OWNER') {
    return { status: 'error', message: 'Apenas o proprietário pode remover membros.' }
  }

  if (memberId === profile.id) {
    return { status: 'error', message: 'O proprietário não pode remover a si mesmo da clínica.' }
  }

  const member = await prisma.profile.findFirst({
    where: { id: memberId, clinic_id: profile.clinic_id },
  })

  if (!member) {
    return { status: 'error', message: 'Membro não encontrado nesta clínica.' }
  }

  await prisma.profile.delete({ where: { id: memberId } })

  revalidatePath('/account')

  return { status: 'success', message: 'Membro removido da clínica.' }
}

// ─── changeMemberRole ────────────────────────────────────────────────────────
// Altera o role de um membro. Apenas OWNER pode alterar.
// Não permite alterar o próprio role nem promover outro a OWNER.

export async function changeMemberRole(
  _previousState: ChangeMemberRoleState,
  formData: FormData
): Promise<ChangeMemberRoleState> {
  const memberId = formData.get('member_id')?.toString()
  const newRole = formData.get('role')?.toString()

  if (!memberId || !newRole) {
    return { status: 'error', message: 'Dados inválidos.' }
  }

  if (newRole !== 'OPTOMETRIST' && newRole !== 'RECEPTIONIST') {
    return { status: 'error', message: 'Função inválida.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) {
    return { status: 'error', message: 'Sua sessão expirou. Entre novamente.' }
  }

  if (profile.role !== 'OWNER') {
    return { status: 'error', message: 'Apenas o proprietário pode alterar funções.' }
  }

  if (memberId === profile.id) {
    return { status: 'error', message: 'Você não pode alterar a sua própria função.' }
  }

  const member = await prisma.profile.findFirst({
    where: { id: memberId, clinic_id: profile.clinic_id },
  })

  if (!member) {
    return { status: 'error', message: 'Membro não encontrado nesta clínica.' }
  }

  await prisma.profile.update({
    where: { id: memberId },
    data: { role: newRole },
  })

  revalidatePath('/account')

  return { status: 'success', message: 'Função do membro atualizada.' }
}

// ─── changePassword ──────────────────────────────────────────────────────────
// Altera a senha do usuário autenticado. Confirma a senha atual via
// signInWithPassword antes de aplicar a nova senha com updateUser.

export interface ChangePasswordState {
  status: 'idle' | 'success' | 'error'
  message: string
}

export async function changePassword(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const currentPassword = formData.get('current_password')?.toString()
  const newPassword = formData.get('new_password')?.toString()
  const confirmPassword = formData.get('confirm_password')?.toString()

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { status: 'error', message: 'Preencha todos os campos.' }
  }
  if (newPassword.length < 8) {
    return { status: 'error', message: 'A nova senha deve ter pelo menos 8 caracteres.' }
  }
  if (newPassword !== confirmPassword) {
    return { status: 'error', message: 'A confirmação não confere com a nova senha.' }
  }
  if (currentPassword === newPassword) {
    return { status: 'error', message: 'A nova senha não pode ser igual à atual.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { status: 'error', message: 'Sua sessão expirou. Entre novamente.' }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (signInError) {
    return { status: 'error', message: 'Senha atual incorreta.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

  if (updateError) {
    console.error('changePassword — updateUser error:', updateError)
    return { status: 'error', message: 'Não foi possível atualizar a senha. Tente novamente.' }
  }

  return { status: 'success', message: 'Senha alterada com sucesso.' }
}
