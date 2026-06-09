'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Trash2, UserPlus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  changeMemberRole,
  createInvite,
  removeMember,
  revokeInvite,
  type ChangeMemberRoleState,
  type InviteActionState,
  type RemoveMemberState,
} from '@/app/(dashboard)/account/actions'

interface Member {
  id: string
  fullName: string
  preferredName: string | null
  role: string
  createdAt: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expiresAt: string
}

interface TeamSectionProps {
  currentUserId: string
  isOwner: boolean
  members: Member[]
  pendingInvites: PendingInvite[]
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  OPTOMETRIST: 'Optometrista',
  RECEPTIONIST: 'Recepcionista',
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  OWNER: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
  OPTOMETRIST: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300',
  RECEPTIONIST: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300',
}

const idleInvite: InviteActionState = { status: 'idle', message: '' }
const idleRemove: RemoveMemberState = { status: 'idle', message: '' }
const idleRole: ChangeMemberRoleState = { status: 'idle', message: '' }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function RoleBadge({ role }: { role: string }) {
  const className = ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.RECEPTIONIST
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
      data-cy="member-role-badge"
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function InviteSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="h-11 rounded-xl bg-indigo-600 px-6 font-semibold shadow-lg shadow-indigo-500/15 hover:bg-indigo-500"
      disabled={pending}
      data-cy="invite-submit"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Enviar convite
    </Button>
  )
}

export default function TeamSection({
  currentUserId,
  isOwner,
  members,
  pendingInvites,
}: TeamSectionProps) {
  const router = useRouter()
  const [inviteState, inviteAction] = useFormState(createInvite, idleInvite)
  const [removeState, removeAction] = useFormState(removeMember, idleRemove)
  const [roleState, roleAction] = useFormState(changeMemberRole, idleRole)
  const [revokeState, revokeAction] = useFormState(revokeInvite, idleInvite)

  const inputClassName =
    'h-11 rounded-xl border border-slate-200/80 bg-white text-sm font-medium text-slate-700 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200'
  const selectClassName = `${inputClassName} px-3`

  // Refresh server data whenever any action succeeds.
  useEffect(() => {
    if (
      inviteState.status === 'success' ||
      removeState.status === 'success' ||
      roleState.status === 'success' ||
      revokeState.status === 'success'
    ) {
      router.refresh()
    }
  }, [router, inviteState.status, removeState.status, roleState.status, revokeState.status])

  const feedback =
    [inviteState, removeState, roleState, revokeState].find((state) => state.status !== 'idle') ?? null

  return (
    <Card
      className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
      data-cy="team-section"
    >
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 text-slate-600 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-300">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Equipe</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Membros da clínica</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gerencie quem tem acesso ao Lensys Care na sua clínica e quais funções cada pessoa exerce.
            </p>
          </div>
        </div>

        {feedback ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              feedback.status === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
            role="status"
            data-cy={feedback.status === 'success' ? 'team-success-message' : 'team-error-message'}
          >
            {feedback.message}
          </div>
        ) : null}

        {/* Members list */}
        <div className="space-y-3" data-cy="members-list">
          {members.map((member) => {
            const isSelf = member.id === currentUserId
            const canManage = isOwner && !isSelf && member.role !== 'OWNER'

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                data-cy="member-row"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100" data-cy="member-name">
                    {member.preferredName?.trim() ? member.preferredName : member.fullName}
                    {isSelf ? <span className="ml-2 text-xs font-normal text-slate-400">(você)</span> : null}
                  </p>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={member.role} />
                    <span className="text-xs text-slate-400">Desde {formatDate(member.createdAt)}</span>
                  </div>
                </div>

                {canManage ? (
                  <div className="flex items-center gap-2">
                    <form action={roleAction}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                        className={selectClassName}
                        aria-label={`Função de ${member.fullName}`}
                        data-cy="member-role-select"
                      >
                        <option value="OPTOMETRIST">Optometrista</option>
                        <option value="RECEPTIONIST">Recepcionista</option>
                      </select>
                    </form>

                    <form
                      action={removeAction}
                      onSubmit={(event) => {
                        if (!window.confirm(`Remover ${member.fullName} da clínica?`)) {
                          event.preventDefault()
                        }
                      }}
                    >
                      <input type="hidden" name="member_id" value={member.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        className="h-9 rounded-lg px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                        data-cy="member-remove-button"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Remover
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Pending invites (OWNER only) */}
        {isOwner ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Convites pendentes</h4>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-slate-400" data-cy="pending-invites-empty">
                Nenhum convite pendente.
              </p>
            ) : (
              <div className="space-y-2" data-cy="pending-invites-list">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/20 sm:flex-row sm:items-center sm:justify-between"
                    data-cy="pending-invite-row"
                  >
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <RoleBadge role={invite.role} />
                        <span className="text-xs text-slate-400">Expira em {formatDate(invite.expiresAt)}</span>
                      </div>
                    </div>

                    <form action={revokeAction}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        className="h-9 rounded-lg px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300"
                        data-cy="invite-revoke-button"
                      >
                        Revogar
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Invite form (OWNER only) */}
        {isOwner ? (
          <div className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Convidar novo membro</h4>
            <form
              action={inviteAction}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              data-cy="invite-create-form"
            >
              <div className="flex-1 space-y-2">
                <label
                  htmlFor="invite-email"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  E-mail
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  name="email"
                  required
                  placeholder="profissional@email.com"
                  className={inputClassName}
                  data-cy="invite-email-input"
                />
              </div>

              <div className="space-y-2 sm:w-48">
                <label
                  htmlFor="invite-role"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Função
                </label>
                <select
                  id="invite-role"
                  name="role"
                  defaultValue="OPTOMETRIST"
                  className={selectClassName}
                  data-cy="invite-role-select"
                >
                  <option value="OPTOMETRIST">Optometrista</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                </select>
              </div>

              <InviteSubmitButton />
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
