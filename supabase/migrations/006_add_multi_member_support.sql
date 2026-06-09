-- 006_add_multi_member_support.sql
-- Multi-member support: clinic ownership, profile updated_at, and invites.
-- Mirrors the Prisma schema changes (Clinic.owner_id, Profile.updated_at,
-- InviteStatus enum, Invite model).

-- ─── Clinic ownership ──────────────────────────────────────────────────────────
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Backfill owner_id with the existing OWNER profile of each clinic.
UPDATE public.clinics c
SET owner_id = p.id
FROM public.profiles p
WHERE p.clinic_id = c.id
  AND p.role = 'OWNER'
  AND c.owner_id IS NULL;

-- ─── Profile updated_at ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Keep profiles.updated_at fresh on every update (reuses the hardening trigger fn).
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─── Invite status enum ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
    CREATE TYPE public.invite_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
  END IF;
END
$$;

-- ─── Invites table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        public.role NOT NULL,
  token       UUID NOT NULL DEFAULT gen_random_uuid(),
  status      public.invite_status NOT NULL DEFAULT 'PENDING',
  invited_by  UUID NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_key ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_clinic_status ON public.invites(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);

-- Apenas UM convite PENDING por (clinic_id, email). Índice único parcial:
-- não restringe linhas ACCEPTED/EXPIRED/REVOKED, então revogar e reconvidar
-- continua possível. (Setups novos já nascem corretos; a migration 007 aplica
-- a mesma regra em bancos que receberam a constraint antiga.)
CREATE UNIQUE INDEX IF NOT EXISTS invites_clinic_id_email_pending_unique
  ON public.invites (clinic_id, email)
  WHERE status = 'PENDING';

-- RLS: deny-by-default. Invites are only read/written server-side through the
-- service role (Prisma / Supabase Admin), which bypasses RLS. No anon/auth
-- policies are granted, matching the project's hardening posture.
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
