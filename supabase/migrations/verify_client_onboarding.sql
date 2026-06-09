-- ============================================================================
-- Verification for client_onboarding  (run AFTER applying the migration)
--
-- Dashboard-compatible: pure SQL, no psql meta-commands (\d etc).
-- Run each lettered block in the Supabase SQL Editor and check the result
-- against the "Expect:" note. Block E is self-cleaning (it rolls back).
-- ============================================================================


-- ── A. Table + columns exist with the right types ──────────────────────────
-- Expect 6 rows: id (uuid, not null, gen_random_uuid()), business_name (text),
-- contact_name (text), submission_date (text), responses (jsonb, NOT null),
-- created_at (timestamptz, not null, now()).
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'client_onboarding'
order by ordinal_position;


-- ── B. RLS is enabled ───────────────────────────────────────────────────────
-- Expect: relrowsecurity = true.
select relname, relrowsecurity
from pg_class
where oid = 'public.client_onboarding'::regclass;


-- ── C. The anon INSERT policy exists (and only that one) ────────────────────
-- Expect 1 row: policyname = 'anon can insert onboarding submissions',
-- cmd = 'INSERT', roles = {anon}, with_check = 'true', qual = NULL.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'client_onboarding';


-- ── D. created_at desc index exists ─────────────────────────────────────────
-- Expect the primary key index plus client_onboarding_created_at_idx
-- (indexdef contains "created_at DESC").
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'client_onboarding';


-- ── E. RLS behaviour test as the anon role (self-cleaning) ──────────────────
-- Simulates a real anon request inside a transaction, then ROLLS BACK so the
-- test row is discarded and the role resets — nothing persists.
begin;
  set local role anon;

  -- E1: anon INSERT should SUCCEED (returns the new id).
  insert into public.client_onboarding (business_name, contact_name, submission_date, responses)
  values ('__rls_probe__', 'Verifier', '2026-06-09', '{"probe": true}'::jsonb)
  returning id, business_name;

  -- E2: anon SELECT should return 0 (write-only: RLS hides every row,
  --     including the one just inserted in this same transaction).
  select count(*) as anon_visible_rows from public.client_onboarding;
rollback;  -- discards the probe row AND resets role back to the editor user


-- ── F. Confirm nothing persisted from the test ──────────────────────────────
-- Runs as the editor role (service_role-equivalent, bypasses RLS).
-- Expect 0 on a fresh table; otherwise unchanged from before the test.
select count(*) as total_rows from public.client_onboarding;
