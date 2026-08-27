-- 016_add_consultation_price.sql
-- Preço da consulta, por clínica. Alimenta o botão de cobrança rápida na ficha
-- do paciente e na lista de pacientes (módulo Financeiro, plano Professional).

-- NULL = ainda não configurado, e isso é diferente de zero. A tela usa essa
-- distinção para pedir a configuração em vez de lançar consulta de R$ 0,00 —
-- valor zero configurado por engano geraria caixa cheio de linha sem dinheiro,
-- e ninguém desconfiaria, porque "0,00" parece resposta e não ausência.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS consultation_price_cents INTEGER;

-- Mesma defesa da `financial_entries.amount_cents`: preço não é negativo, e
-- zero aqui é o mesmo que não ter preço — quem não cobra não precisa do botão.
ALTER TABLE public.clinics
  DROP CONSTRAINT IF EXISTS clinics_consultation_price_positive;

ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_consultation_price_positive
  CHECK (consultation_price_cents IS NULL OR consultation_price_cents > 0);
