-- ─────────────────────────────────────────────────────────────────────────────
-- 013_drop_stray_demo_table.sql
--
-- `public."Lensys Care Demo"` não faz parte do schema: nasceu de um teste (o
-- nome com espaços e maiúsculas denuncia criação pela UI, não por migration).
-- Estava com RLS ligada e nenhuma política, o que a deixava inofensiva —
-- ninguém lê nem escreve — mas fazia o linter do Supabase apontar um alerta
-- toda vez. Alerta que aparece sempre e nunca significa nada é alerta que
-- ninguém lê no dia em que significar.
--
-- Conferido antes de remover: 0 linhas, nenhuma FK apontando para ela, nenhuma
-- view dependente.
--
-- Sem CASCADE de propósito: se algo inesperado depender dela, o Postgres deve
-- recusar e nos avisar, não destruir junto em silêncio.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public."Lensys Care Demo";
