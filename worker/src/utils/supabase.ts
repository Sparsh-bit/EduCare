import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Hard timeout on every Supabase fetch so a slow DB never hangs a Worker indefinitely.
// Workers have a 30s wall-clock limit; we abort at 9s to leave room for the response.
function fetchWithTimeout(timeoutMs = 9000): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    return fetch(input as RequestInfo, { ...init, signal: controller.signal })
      .finally(() => clearTimeout(timer))
  }
}

export function getSupabase(env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { fetch: fetchWithTimeout(9000) },
  })
}
