-- 008_add_patient_search_trgm.sql
-- Índice de busca por substring (ILIKE) na lista de pacientes.
--
-- A busca em /patients usa `full_name ILIKE '%termo%'` e `email ILIKE '%termo%'`
-- (Prisma `contains` + `mode: 'insensitive'`). O wildcard à esquerda (`%termo`) impede
-- o uso de índices btree comuns, resultando em sequential scan que escala mal conforme
-- a base de pacientes cresce. O pg_trgm com índice GIN suporta `ILIKE '%...%'` de forma
-- eficiente.
--
-- Observação: a filtragem por tenant (`clinic_id = ...`) é combinada pelo planner via
-- bitmap AND. As duas colunas buscadas recebem índices GIN separados para permitir
-- bitmap OR na cláusula `OR` da busca.
--
-- Em uma tabela de produção já grande, prefira executar os CREATE INDEX com CONCURRENTLY
-- fora de uma transação para evitar lock de escrita. Aqui (base ainda pequena na fase de
-- validação) o CREATE INDEX simples é aceitável.

-- 1. Habilita a extensão de trigramas no schema padrão do Supabase (idempotente).
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2. Índices GIN de trigramas cobrindo os campos usados na busca.
CREATE INDEX IF NOT EXISTS patients_full_name_trgm_idx
  ON public.patients USING gin (full_name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS patients_email_trgm_idx
  ON public.patients USING gin (email extensions.gin_trgm_ops);
