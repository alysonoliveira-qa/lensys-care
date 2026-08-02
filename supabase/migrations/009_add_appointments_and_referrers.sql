-- 009_add_appointments_and_referrers.sql
-- Agenda de consultas + indicantes ("corretas").
--
-- Cria:
--   • enum public.appointment_status
--   • tabela public.referrers (indicante: nome + chave PIX + WhatsApp)
--   • tabela public.appointments (consulta: dia obrigatório, hora opcional/fila,
--     indicante opcional, marca de pagamento da indicação)
--
-- RLS: mesmo padrão tenant-scoped de public.patients (migration 002), usando
-- private.auth_clinic_id(). Acesso de domínio é server-side via Prisma/service_role
-- (que ignora RLS); as policies são defesa em profundidade para a Data API.

-- ─── Enum ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE public.appointment_status AS ENUM ('SCHEDULED', 'ATTENDED', 'CANCELED');
  END IF;
END
$$;

-- ─── Referrers (indicantes / "corretas") ───────────────────────────────────────
-- Criada ANTES de appointments por causa da FK referrer_id.
CREATE TABLE IF NOT EXISTS public.referrers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  pix_key    TEXT,
  whatsapp   TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrers_clinic ON public.referrers(clinic_id);

-- ─── Appointments (consultas / agenda) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL REFERENCES public.clinics(id)  ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id  UUID REFERENCES public.profiles(id)  ON DELETE SET NULL, -- reservado p/ futuro
  referrer_id      UUID REFERENCES public.referrers(id) ON DELETE SET NULL, -- indicante opcional
  referral_paid_at TIMESTAMPTZ,                        -- NULL = indicação pendente
  appointment_date DATE NOT NULL,                      -- dia da consulta (obrigatório)
  scheduled_time   TIME,                               -- hora local; NULL = fila do dia (FIFO)
  status           public.appointment_status NOT NULL DEFAULT 'SCHEDULED',
  created_by       UUID NOT NULL,                      -- Profile.id de quem criou (sem FK, igual invites.invited_by)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- desempate da fila
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON public.appointments(clinic_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient     ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_referrer    ON public.appointments(referrer_id);

-- Índice parcial para acelerar a contagem de indicações pendentes por indicante.
CREATE INDEX IF NOT EXISTS idx_appointments_pending_referrals
  ON public.appointments(clinic_id, referrer_id)
  WHERE status = 'ATTENDED' AND referrer_id IS NOT NULL AND referral_paid_at IS NULL;

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.referrers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.referrers, public.appointments FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.referrers    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;

-- referrers: tenant-scoped por clinic_id (sem exclusão dura — usa active = false)
CREATE POLICY "referrers_select_clinic" ON public.referrers
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "referrers_insert_clinic" ON public.referrers
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "referrers_update_clinic" ON public.referrers
  FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()))
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));

-- appointments: tenant-scoped por clinic_id (sem exclusão — cancelar é status)
CREATE POLICY "appointments_select_clinic" ON public.appointments
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "appointments_insert_clinic" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "appointments_update_clinic" ON public.appointments
  FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()))
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));
