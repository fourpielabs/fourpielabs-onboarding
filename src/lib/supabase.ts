import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients for the onboarding app.
 *
 * This app talks to the SAME Supabase project as the main 4Pie Labs
 * marketing site, but it is a separate deployment with its own env vars.
 * All keys are read from `process.env` only — never hardcode them.
 *
 * Clients are created lazily so that simply importing this module never
 * throws (keeps `next build` green when env vars aren't present at build
 * time). The error only fires if you actually try to use a client without
 * the required vars set.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} (see .env.example).`);
  }
  return value;
}

let anonClient: SupabaseClient | null = null;

/**
 * Public (anon) client — safe for browser and server. Subject to Row Level
 * Security. In this app, RLS makes the onboarding table write-only for anon.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    );
  }
  return anonClient;
}

/**
 * Lazy anon-client proxy — `supabase.from(...)` works, but the underlying
 * client isn't constructed (and env isn't read) until first use.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/**
 * Service-role client — SERVER ONLY.
 *
 * Bypasses Row Level Security, so it must NEVER reach the browser. The
 * service-role key is read lazily inside this factory (it is not a
 * NEXT_PUBLIC_ var, so it is never bundled into client code), and a runtime
 * guard refuses to construct it if somehow invoked client-side.
 *
 * Call this only from server code (Server Actions, Route Handlers, Server
 * Components).
 */
export function createServiceRoleClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "createServiceRoleClient() must never be called in the browser.",
    );
  }

  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
