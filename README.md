# 4Pie Labs — Client Onboarding

A standalone [Next.js 16](https://nextjs.org) (App Router) app for the 4Pie Labs
client onboarding form. It is a **separate repo and deployment** from the main
marketing site, but it writes to the **same Supabase project** via its own
environment variables.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** — design tokens via `@theme` in [`src/app/globals.css`](src/app/globals.css) (dark + amber brand)
- **Supabase** — `@supabase/supabase-js`, clients in [`src/lib/supabase.ts`](src/lib/supabase.ts)
- Deployed on **Vercel**

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. You should see the dark + amber placeholder page.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in the real values
(`.env.local` is gitignored). Set the **same** variables in Vercel for the
deployment.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) | Anon key — respects Row Level Security |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Bypasses RLS — never exposed to the client |
| `ONBOARDING_WEBHOOK_URL` | **Server-only**, optional | Webhook the submit action POSTs each submission to. If unset, the step is skipped gracefully. |

The two `NEXT_PUBLIC_*` values power the anon client (`supabase`), safe for
browser and server use. `SUPABASE_SERVICE_ROLE_KEY` and `ONBOARDING_WEBHOOK_URL`
are read only inside the server-side submit action (`src/app/actions.ts`) and
the `createServiceRoleClient()` factory — they never reach the browser.

## How the form submits

The wizard lives at `/` ([src/components/OnboardingWizard.tsx](src/components/OnboardingWizard.tsx))
and submits through a server action ([src/app/actions.ts](src/app/actions.ts)) so
secrets stay server-side. On submit the action:

1. Drops bot submissions via a honeypot field, then validates required fields.
2. Inserts a row into `client_onboarding` using the **service-role** client
   (`business_name` / `contact_name` / `submission_date` columns + all answers
   in the `responses` jsonb keyed by stable field ids). This is the priority.
3. Best-effort POSTs the full payload to `ONBOARDING_WEBHOOK_URL` (skipped if
   unset). The two steps are independent — one failing doesn't block the other.

In-progress answers are held in `sessionStorage` for 30 minutes (restored on
reload, discarded if older, cleared on successful submit). The route is
`noindex` and not in any sitemap — it's a private client link.

## Supabase note

This app **shares the main 4Pie Labs site's Supabase project** (same database)
but is a **separate deployment** with its own env vars. Point all three
variables at that shared project. Schema and Row Level Security are managed
alongside the main site.

## Project structure

```
src/
  app/
    layout.tsx      # root layout, fonts, dark theme
    page.tsx        # placeholder home route
    globals.css     # Tailwind v4 + @theme brand design tokens
  lib/
    supabase.ts     # anon client + server-only service-role factory
```
