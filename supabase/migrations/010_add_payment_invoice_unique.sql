-- ─────────────────────────────────────────────────────────────────────────────
-- 010_add_payment_invoice_unique.sql
-- Idempotência dos webhooks do Stripe.
--
-- O Stripe reentrega o mesmo evento em falha de rede, timeout ou retry manual.
-- Sem unicidade na invoice, cada reentrega de invoice.payment_succeeded criava
-- um pagamento novo, inflando o histórico financeiro da clínica.
--
-- NULL é permitido em múltiplas linhas por um unique index do Postgres, então
-- pagamentos sem invoice (lançamento manual/legado) seguem funcionando.
-- ─────────────────────────────────────────────────────────────────────────────

create unique index if not exists payments_stripe_invoice_id_key
  on public.payments (stripe_invoice_id);
