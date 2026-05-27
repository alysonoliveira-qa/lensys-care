'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface UpdatedProfileSummary {
  preferred_name: string | null
  full_name: string
  role: string
}

interface PreferredDisplayNameDialogProps {
  preferredName: string | null | undefined
  onClose: () => void
  onProfileUpdated: (profile: UpdatedProfileSummary) => void
}

export default function PreferredDisplayNameDialog({
  preferredName,
  onClose,
  onProfileUpdated,
}: PreferredDisplayNameDialogProps) {
  const router = useRouter()
  const successCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [preferredNameInput, setPreferredNameInput] = useState(preferredName ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const clearSuccessCloseTimer = () => {
    if (successCloseTimerRef.current) {
      clearTimeout(successCloseTimerRef.current)
      successCloseTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearSuccessCloseTimer()
    }
  }, [])

  const handleClose = () => {
    if (isSaving) {
      return
    }

    clearSuccessCloseTimer()
    setSaveError(null)
    setSaveSuccess(null)
    onClose()
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredName: preferredNameInput,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível atualizar o perfil.')
      }

      onProfileUpdated({
        preferred_name: data.profile.preferred_name,
        full_name: data.profile.full_name,
        role: data.profile.role,
      })
      setSaveSuccess('Perfil atualizado com sucesso.')
      window.dispatchEvent(new Event('profile-updated'))
      router.refresh()
      clearSuccessCloseTimer()
      successCloseTimerRef.current = setTimeout(() => {
        setSaveSuccess(null)
        successCloseTimerRef.current = null
        onClose()
      }, 850)
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveError(error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        data-cy="edit-profile-modal"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Editar perfil</h3>
            <p className="mt-1 text-sm text-slate-400">
              Atualize como o Lensys Care deve te chamar no dashboard e na sidebar.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Fechar modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Como prefere ser chamado?
          </label>
          <Input
            type="text"
            value={preferredNameInput}
            onChange={(event) => setPreferredNameInput(event.target.value)}
            placeholder="Ex: Dra. Ana ou Ana"
            className="border-slate-800 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20"
            maxLength={60}
            disabled={isSaving}
            data-cy="preferred-name-input"
          />
          <p className="text-xs text-slate-500">
            Se ficar em branco, o sistema usará seu nome completo, e-mail ou usuário.
          </p>
        </div>

        {saveError && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
            {saveSuccess}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-indigo-600 font-semibold hover:bg-indigo-500"
            onClick={handleSave}
            disabled={isSaving}
            data-cy="save-profile-button"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
