-- ─────────────────────────────────────────────────────────────────────────────
-- 012_revoke_public_execute_on_rls_auto_enable.sql
--
-- `public.rls_auto_enable()` é SECURITY DEFINER e nasceu com o EXECUTE padrão
-- do Postgres, que é PUBLIC. Como a função vive no schema `public`, o PostgREST
-- a expõe em `/rest/v1/rpc/rls_auto_enable` para os papéis `anon` e
-- `authenticated` — foi isso que o linter do Supabase apontou.
--
-- Na prática ela não é chamável: retorna `event_trigger`, e o Postgres recusa
-- executar função de gatilho fora do contexto do gatilho. Ou seja, isto é
-- defesa em profundidade, não fechamento de brecha explorável — mas uma função
-- SECURITY DEFINER com EXECUTE para PUBLIC é exatamente o tipo de coisa que não
-- deve ficar aberta esperando a próxima mudança de assinatura torná-la
-- chamável.
--
-- Revogar EXECUTE **não** afeta o gatilho de evento: ele roda com o privilégio
-- do dono do gatilho, não do papel que disparou o DDL.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
