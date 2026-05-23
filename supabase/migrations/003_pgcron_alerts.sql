-- 003_pgcron_alerts.sql
-- Alert lifecycle support. The outbound daily job must be configured only
-- after the production URL and CRON_SECRET have been stored in Vault.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION private.cancel_previous_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.alerts
  SET status = 'DISMISSED'
  WHERE patient_id = NEW.patient_id
    AND status = 'PENDING';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.cancel_previous_alerts() FROM PUBLIC;

CREATE TRIGGER dismiss_old_alerts_on_new_exam
  AFTER INSERT ON public.exams
  FOR EACH ROW EXECUTE FUNCTION private.cancel_previous_alerts();

-- Configure the daily HTTP job in a follow-up migration after creating Vault
-- secrets for the deployed app URL and CRON_SECRET. Do not commit secrets.
