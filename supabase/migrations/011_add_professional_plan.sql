-- ─────────────────────────────────────────────────────────────────────────────
-- 011_add_professional_plan.sql
-- Adiciona o plano PROFESSIONAL ao enum `plan`.
--
-- A escada passa a ser Essencial (R$ 79,90) → Conecta (R$ 119,90, onde começam
-- alertas e mensagens) → Professional (R$ 149,90, automação + Financeiro).
--
-- O valor é anexado ao fim do enum, o que também deixa a ordem do tipo alinhada
-- com a ordem de preço. `IF NOT EXISTS` mantém a migration idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE plan ADD VALUE IF NOT EXISTS 'PROFESSIONAL';
