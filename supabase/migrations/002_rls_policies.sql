-- 002_rls_policies.sql
-- Tenant-scoped RLS for the Lensys Care tables.
-- Privileged helper functions live outside the exposed public schema.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.auth_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT clinic_id
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::TEXT
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
$$;

REVOKE ALL ON FUNCTION private.auth_clinic_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.auth_role() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_role() TO authenticated;

ALTER TABLE public.clinics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.clinics, public.profiles, public.patients, public.exams,
  public.alerts, public.subscriptions, public.stripe_customers, public.payments FROM anon;

GRANT SELECT, UPDATE ON public.clinics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.stripe_customers TO authenticated;
GRANT SELECT ON public.payments TO authenticated;

CREATE POLICY "clinics_select_own" ON public.clinics
  FOR SELECT TO authenticated
  USING (id = (SELECT private.auth_clinic_id()));

CREATE POLICY "clinics_update_owner" ON public.clinics
  FOR UPDATE TO authenticated
  USING (id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER')
  WITH CHECK (id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER');

CREATE POLICY "profiles_select_clinic" ON public.profiles
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "profiles_insert_owner" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER');

CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER')
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER');

CREATE POLICY "profiles_delete_owner" ON public.profiles
  FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER');

CREATE POLICY "patients_select_clinic" ON public.patients
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "patients_insert_clinic" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "patients_update_clinic" ON public.patients
  FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()))
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "patients_delete_staff" ON public.patients
  FOR DELETE TO authenticated
  USING (
    clinic_id = (SELECT private.auth_clinic_id())
    AND (SELECT private.auth_role()) IN ('OWNER', 'OPTOMETRIST')
  );

CREATE POLICY "exams_select_clinic" ON public.exams
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  );

CREATE POLICY "exams_insert_clinic" ON public.exams
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  );

CREATE POLICY "exams_update_clinic" ON public.exams
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  );

CREATE POLICY "exams_delete_staff" ON public.exams
  FOR DELETE TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
    AND (SELECT private.auth_role()) IN ('OWNER', 'OPTOMETRIST')
  );

CREATE POLICY "alerts_select_clinic" ON public.alerts
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  );

CREATE POLICY "alerts_insert_clinic" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  );

CREATE POLICY "alerts_update_clinic" ON public.alerts
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE clinic_id = (SELECT private.auth_clinic_id())
    )
  );

CREATE POLICY "subscriptions_select_clinic" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "subscriptions_insert_owner" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER');

CREATE POLICY "subscriptions_update_owner" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER')
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER');

CREATE POLICY "stripe_customers_select_clinic" ON public.stripe_customers
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "stripe_customers_insert_owner" ON public.stripe_customers
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()) AND (SELECT private.auth_role()) = 'OWNER');

CREATE POLICY "payments_select_clinic" ON public.payments
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));
