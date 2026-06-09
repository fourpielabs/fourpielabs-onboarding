-- ============================================================================
-- Migration: create client_onboarding
-- App:       fourpielabs-onboarding (shares the main 4Pie Labs Supabase project,
--            separate deployment)
--
-- Access model: WRITE-ONLY for the public form.
--   - The form is reached by a private link and submits via the anon key.
--   - anon may INSERT only. anon may NOT SELECT / UPDATE / DELETE.
--   - Only the service_role (server-side) can read submissions (it bypasses RLS).
-- ============================================================================

create table if not exists public.client_onboarding (
  id              uuid primary key default gen_random_uuid(),
  -- Intro fields (also duplicated inside `responses` for a complete record)
  business_name   text,
  contact_name    text,
  submission_date text,
  -- All 24 question answers, keyed by a stable field id
  responses       jsonb not null,
  created_at      timestamptz not null default now()
);

comment on table public.client_onboarding is
  'Public onboarding form submissions. Write-only for anon; readable only by service_role.';

-- Newest-first reads for the service-role dashboard/exports.
create index if not exists client_onboarding_created_at_idx
  on public.client_onboarding (created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.client_onboarding enable row level security;

-- Tight insert: anon can write, with no read-back. No SELECT/UPDATE/DELETE
-- policy exists for anon, so RLS denies those by default.
drop policy if exists "anon can insert onboarding submissions" on public.client_onboarding;
create policy "anon can insert onboarding submissions"
  on public.client_onboarding
  for insert
  to anon
  with check (true);

-- ----------------------------------------------------------------------------
-- Table-level grants (defense in depth, independent of RLS).
-- Supabase grants table privileges to anon/authenticated/service_role by
-- default; we make the intended shape explicit and revoke read/modify from anon
-- so the table stays write-only even if a policy is ever loosened.
-- ----------------------------------------------------------------------------
grant insert on public.client_onboarding to anon;
revoke select, update, delete on public.client_onboarding from anon;
