-- 015_add_financial_entries.sql
-- Módulo Financeiro: caixa do dia (entradas e saídas) + pagamento de indicantes.
--
-- Cria:
--   • enum public.financial_entry_type  (INCOME | EXPENSE)
--   • enum public.payment_method        (formas de pagamento do caixa)
--   • tabela public.financial_entries   (lançamento do caixa)
--
-- RLS: mesmo padrão tenant-scoped de public.appointments (migration 009), usando
-- private.auth_clinic_id(). Acesso de domínio é server-side via Prisma/service_role
-- (que ignora RLS); as policies são defesa em profundidade para a Data API.

-- ─── Enums ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_entry_type') THEN
    CREATE TYPE public.financial_entry_type AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM (
      'CASH', 'PIX', 'DEBIT', 'CREDIT', 'TRANSFER', 'OTHER'
    );
  END IF;
END
$$;

-- ─── Financial entries (lançamentos do caixa) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,

  type           public.financial_entry_type NOT NULL,

  -- Dinheiro em centavos, inteiro. Nunca NUMERIC com casa decimal e nunca float:
  -- 0.1 + 0.2 não é 0.3, e caixa que não fecha por um centavo destrói a confiança
  -- no módulo inteiro. O sinal é carregado por `type`, não pelo número — valor
  -- negativo em INCOME seria um segundo jeito de dizer "saída", e dois jeitos de
  -- dizer a mesma coisa é como o relatório passa a somar errado.
  amount_cents   INTEGER NOT NULL CHECK (amount_cents > 0),

  description    TEXT NOT NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'CASH',

  -- Dia do lançamento como hora de parede, igual appointments.appointment_date.
  -- O Prisma devolve DATE como instante UTC: formatar sempre com getters UTC,
  -- senão o dia desloca em UTC-3 e o fechamento cai no dia anterior.
  entry_date     DATE NOT NULL,

  -- Vínculos opcionais. ON DELETE SET NULL de propósito: apagar um paciente não
  -- pode apagar o dinheiro que entrou por ele — o histórico do caixa tem que
  -- sobreviver à limpeza de cadastro.
  patient_id     UUID REFERENCES public.patients(id)     ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  referrer_id    UUID REFERENCES public.referrers(id)    ON DELETE SET NULL,

  created_by     UUID NOT NULL,                      -- Profile.id (sem FK, igual appointments)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- O fechamento do dia e o relatório por período são sempre (clínica, intervalo de
-- data): é este índice que os sustenta.
CREATE INDEX IF NOT EXISTS idx_financial_entries_clinic_date
  ON public.financial_entries(clinic_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_financial_entries_patient
  ON public.financial_entries(patient_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_referrer
  ON public.financial_entries(referrer_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.financial_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;

-- O service_role precisa dos grants explicitamente: eles se perderam no restore
-- da migração de região e voltaram pela migration 014. Tabela nova nasce com eles.
GRANT ALL ON public.financial_entries TO service_role;

CREATE POLICY "financial_entries_select_clinic" ON public.financial_entries
  FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "financial_entries_insert_clinic" ON public.financial_entries
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));

CREATE POLICY "financial_entries_update_clinic" ON public.financial_entries
  FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()))
  WITH CHECK (clinic_id = (SELECT private.auth_clinic_id()));

-- Diferente de appointments, aqui a exclusão existe: lançamento errado de caixa
-- se apaga, não se "cancela" — um estorno fantasma polui o fechamento do dia.
CREATE POLICY "financial_entries_delete_clinic" ON public.financial_entries
  FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.auth_clinic_id()));
