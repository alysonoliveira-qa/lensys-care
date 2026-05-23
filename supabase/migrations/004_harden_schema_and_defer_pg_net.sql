-- 004_harden_schema_and_defer_pg_net.sql
-- Findings from post-migration advisors and validation.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_exams_performed_by ON public.exams(performed_by);
CREATE INDEX IF NOT EXISTS idx_alerts_exam_id ON public.alerts(exam_id);

-- No HTTP cron job is configured yet, so pg_net is unnecessary until the
-- application URL and CRON_SECRET are stored securely in Vault.
DROP EXTENSION IF EXISTS pg_net;
