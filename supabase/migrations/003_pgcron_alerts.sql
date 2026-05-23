-- ─────────────────────────────────────────────────────────────────────────────
-- 003_pgcron_alerts.sql
-- Configures pg_cron to run the daily alert dispatch job.
-- Also creates the trigger that cancels previous alerts when a new exam is saved.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_cron extension (requires Supabase Pro or pg_cron installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Cancel previous alerts trigger ─────────────────────────────────────────
-- When a new exam is inserted for a patient, DISMISS all pending alerts
-- for that patient so they don't receive stale reminders.

CREATE OR REPLACE FUNCTION cancel_previous_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE alerts
  SET status = 'DISMISSED'
  WHERE
    patient_id = NEW.patient_id
    AND status = 'PENDING'
    AND id != (
      -- Exclude the alert that will be created for this new exam
      -- (alert is created after exam, so at trigger time it doesn't exist yet)
      SELECT id FROM alerts
      WHERE exam_id = NEW.id
      LIMIT 1
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER dismiss_old_alerts_on_new_exam
  AFTER INSERT ON exams
  FOR EACH ROW EXECUTE FUNCTION cancel_previous_alerts();

-- ─── Scheduled job: daily alert dispatch ─────────────────────────────────────
-- Runs every day at 08:00 Brasília time (UTC-3 = 11:00 UTC).
-- The job calls our Next.js API endpoint via an HTTP request.
-- The CRON_SECRET is embedded as a Bearer token for authentication.
--
-- IMPORTANT: Replace <YOUR_APP_URL> and <YOUR_CRON_SECRET> before running.
-- In production, use Supabase Vault to store secrets:
--   SELECT vault.create_secret('cron_secret', '<value>', 'OptoTech CRON_SECRET');
--   Then use: SELECT vault.decrypt_secret('cron_secret')

SELECT cron.schedule(
  'optotech-daily-alerts',           -- job name (unique)
  '0 11 * * *',                      -- 11:00 UTC = 08:00 BRT
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.app_url') || '/api/alerts/send',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ─── Store app settings (run once, adjust values) ────────────────────────────
-- These are read by the cron job above.
-- ALTER DATABASE postgres SET app.settings.app_url = 'https://your-app.vercel.app';
-- ALTER DATABASE postgres SET app.settings.cron_secret = 'your-cron-secret';

-- ─── Verify job was created ───────────────────────────────────────────────────
-- SELECT * FROM cron.job WHERE jobname = 'optotech-daily-alerts';
