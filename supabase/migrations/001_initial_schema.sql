-- ─────────────────────────────────────────────────────────────────────────────
-- 001_initial_schema.sql
-- Initial schema for OptoTech. Run once against the Supabase database.
-- Note: Prisma migrations are the source of truth for schema changes in dev.
-- This file is provided for Supabase Dashboard imports and CI resets.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE role AS ENUM ('OWNER', 'OPTOMETRIST', 'RECEPTIONIST');
CREATE TYPE alert_status AS ENUM ('PENDING', 'SENT', 'DISMISSED');
CREATE TYPE alert_channel AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
CREATE TYPE plan AS ENUM ('ESSENTIAL', 'CONECTA');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'TRIALING', 'CANCELED', 'PAST_DUE');
CREATE TYPE payment_status AS ENUM ('SUCCEEDED', 'FAILED', 'PENDING', 'REFUNDED');

-- ─── Clinics ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  cnpj       TEXT,
  phone      TEXT,
  email      TEXT NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY, -- mirrors auth.users.id
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  role       role NOT NULL DEFAULT 'OPTOMETRIST',
  crm        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Patients ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  dob        DATE NOT NULL,
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Exams ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  performed_by       UUID NOT NULL REFERENCES profiles(id),
  exam_date          DATE NOT NULL,
  -- Right eye
  od_sph             NUMERIC(4,2),
  od_cyl             NUMERIC(4,2),
  od_axis            SMALLINT CHECK (od_axis BETWEEN 0 AND 180),
  od_va              TEXT,
  -- Left eye
  oe_sph             NUMERIC(4,2),
  oe_cyl             NUMERIC(4,2),
  oe_axis            SMALLINT CHECK (oe_axis BETWEEN 0 AND 180),
  oe_va              TEXT,
  -- Additional
  addition           NUMERIC(3,2),
  pd                 NUMERIC(4,1),
  prescription_notes TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Alerts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  exam_id    UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  due_date   DATE NOT NULL,
  status     alert_status NOT NULL DEFAULT 'PENDING',
  channel    alert_channel NOT NULL,
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Subscriptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id              UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  plan                   plan NOT NULL DEFAULT 'ESSENTIAL',
  status                 subscription_status NOT NULL DEFAULT 'TRIALING',
  trial_ends_at          TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  payment_provider       TEXT,
  external_id            TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id        TEXT,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Stripe Customers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_customers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id          UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Payments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id             UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  stripe_payment_intent TEXT,
  stripe_invoice_id     TEXT,
  amount_cents          INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'brl',
  status                payment_status NOT NULL DEFAULT 'PENDING',
  description           TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id     ON profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id     ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_exams_patient_id       ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id      ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_due_date_status ON alerts(due_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id     ON payments(clinic_id);
