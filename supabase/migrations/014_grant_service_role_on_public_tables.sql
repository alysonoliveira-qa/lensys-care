-- 014_grant_service_role_on_public_tables.sql
--
-- Restaura os privilégios do `service_role` no schema public.
--
-- Contexto: nenhuma migration deste repositório jamais concedeu algo a
-- `service_role`. A 002 revoga de `anon` e concede explicitamente a
-- `authenticated`; o `service_role` funcionava pelos *default privileges* que o
-- Supabase cria ao provisionar o projeto. A migração para `sa-east-1` (24/08/2026)
-- restaurou schema, RLS e policies, mas não esses grants de fábrica — e o
-- `service_role` ficou com zero SELECT/INSERT/UPDATE/DELETE nas 11 tabelas.
--
-- O que estava quebrado em produção por causa disso, tudo com 42501:
--   - /api/auth/register        → cadastro de conta nova
--   - /api/invites/accept       → aceitar convite de membro
--   - /api/alerts/[id]          → dispensar e reenviar alerta na mão
--   - lib/features.ts           → hasFeatureAsService, gate de plano server-to-server
--   - lib/alerts.ts             → disparo automático do recall
--
-- `service_role` é identidade exclusiva de servidor (a chave nunca vai ao
-- browser) e, por desenho do Supabase, ignora RLS. Por isso o grant é amplo
-- aqui: a proteção multi-tenant desse caminho é a validação explícita de
-- `clinic_id` na borda, não a RLS.
--
-- `anon` continua sem nada, de propósito: a 002 e a 009 revogam dele, nenhuma
-- rota pública usa PostgREST anônimo, e restaurar o padrão do Supabase (que dá
-- ALL a `anon` e conta com a RLS para negar) seria afrouxar o que este projeto
-- já decidiu apertar.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Tabela nova criada depois desta migration nasce com o grant, em vez de
-- reintroduzir o mesmo bug silenciosamente.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
