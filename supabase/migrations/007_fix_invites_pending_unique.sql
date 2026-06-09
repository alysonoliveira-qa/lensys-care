-- 007_fix_invites_pending_unique.sql
-- Corrige a unicidade de convites.
--
-- Uma constraint anterior, UNIQUE (clinic_id, email, status), impedia revogar
-- um convite (UPDATE de PENDING -> REVOKED) quando já existia uma linha REVOKED
-- para o mesmo (clinic_id, email): o par (clinic_id, email, 'REVOKED') colidia.
--
-- A regra correta é "apenas UM convite PENDING por (clinic_id, email)".
-- Isso se expressa com um índice ÚNICO PARCIAL (WHERE status = 'PENDING'),
-- que não restringe linhas ACCEPTED/EXPIRED/REVOKED.

-- Remove a constraint/índice antigo, se existir (criado por migration anterior).
ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS "invites_clinic_id_email_status_key";

DROP INDEX IF EXISTS public."invites_clinic_id_email_status_key";

-- Garante no banco que só pode haver um convite PENDING por e-mail/clínica.
CREATE UNIQUE INDEX IF NOT EXISTS invites_clinic_id_email_pending_unique
  ON public.invites (clinic_id, email)
  WHERE status = 'PENDING';
