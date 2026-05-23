-- ─────────────────────────────────────────────────────────────────────────────
-- 002_rls_policies.sql
-- Row Level Security policies for all OptoTech tables.
-- Every policy gates access to records belonging to the authenticated user's clinic.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Helper function: get current user's clinic_id ───────────────────────────
-- Reads the clinic_id from the profiles table for the authenticated user.
-- Used in every RLS policy to avoid subquery duplication.
CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid()
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid()
$$;

-- ─── Enable RLS on all tables ────────────────────────────────────────────────
ALTER TABLE clinics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINICS
-- ─────────────────────────────────────────────────────────────────────────────
-- Users can only view their own clinic
CREATE POLICY "clinics_select_own" ON clinics
  FOR SELECT USING (id = auth_clinic_id());

-- Only OWNER can update clinic info
CREATE POLICY "clinics_update_owner" ON clinics
  FOR UPDATE USING (id = auth_clinic_id() AND auth_role() = 'OWNER');

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
-- All clinic members can view colleagues' profiles
CREATE POLICY "profiles_select_clinic" ON profiles
  FOR SELECT USING (clinic_id = auth_clinic_id());

-- Only OWNER can insert / update / delete profiles
CREATE POLICY "profiles_insert_owner" ON profiles
  FOR INSERT WITH CHECK (clinic_id = auth_clinic_id() AND auth_role() = 'OWNER');

CREATE POLICY "profiles_update_owner" ON profiles
  FOR UPDATE USING (clinic_id = auth_clinic_id() AND auth_role() = 'OWNER');

CREATE POLICY "profiles_delete_owner" ON profiles
  FOR DELETE USING (clinic_id = auth_clinic_id() AND auth_role() = 'OWNER');

-- ─────────────────────────────────────────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "patients_select_clinic" ON patients
  FOR SELECT USING (clinic_id = auth_clinic_id());

CREATE POLICY "patients_insert_clinic" ON patients
  FOR INSERT WITH CHECK (clinic_id = auth_clinic_id());

CREATE POLICY "patients_update_clinic" ON patients
  FOR UPDATE USING (clinic_id = auth_clinic_id());

-- Only OWNER or OPTOMETRIST can delete patients
CREATE POLICY "patients_delete_staff" ON patients
  FOR DELETE USING (
    clinic_id = auth_clinic_id()
    AND auth_role() IN ('OWNER', 'OPTOMETRIST')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- EXAMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "exams_select_clinic" ON exams
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id = auth_clinic_id()
    )
  );

CREATE POLICY "exams_insert_clinic" ON exams
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id = auth_clinic_id()
    )
  );

CREATE POLICY "exams_update_clinic" ON exams
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id = auth_clinic_id()
    )
  );

CREATE POLICY "exams_delete_staff" ON exams
  FOR DELETE USING (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id = auth_clinic_id()
    )
    AND auth_role() IN ('OWNER', 'OPTOMETRIST')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ALERTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "alerts_select_clinic" ON alerts
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id = auth_clinic_id()
    )
  );

CREATE POLICY "alerts_insert_clinic" ON alerts
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id = auth_clinic_id()
    )
  );

CREATE POLICY "alerts_update_clinic" ON alerts
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM patients WHERE clinic_id = auth_clinic_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- All clinic members can read subscription (needed for hasFeature())
CREATE POLICY "subscriptions_select_clinic" ON subscriptions
  FOR SELECT USING (clinic_id = auth_clinic_id());

-- Only OWNER can manage subscription
CREATE POLICY "subscriptions_insert_owner" ON subscriptions
  FOR INSERT WITH CHECK (clinic_id = auth_clinic_id() AND auth_role() = 'OWNER');

CREATE POLICY "subscriptions_update_owner" ON subscriptions
  FOR UPDATE USING (clinic_id = auth_clinic_id() AND auth_role() = 'OWNER');

-- ─────────────────────────────────────────────────────────────────────────────
-- STRIPE CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "stripe_customers_select_clinic" ON stripe_customers
  FOR SELECT USING (clinic_id = auth_clinic_id());

CREATE POLICY "stripe_customers_insert_owner" ON stripe_customers
  FOR INSERT WITH CHECK (clinic_id = auth_clinic_id() AND auth_role() = 'OWNER');

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────
-- All clinic members can view payment history
CREATE POLICY "payments_select_clinic" ON payments
  FOR SELECT USING (clinic_id = auth_clinic_id());

-- Payments are inserted only by service role (via webhook), not directly by users
-- No INSERT policy needed for authenticated users

-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICE ROLE BYPASS
-- The service role key (used by Stripe webhook handler and pg_cron)
-- bypasses RLS automatically — no additional policies needed.
-- NEVER expose the service role key to the client.
-- ─────────────────────────────────────────────────────────────────────────────
