import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Did you copy .env.example to .env and fill in the values?'
  );
}

// Service-role client: bypasses RLS entirely. Only ever used server-side,
// for trusted operations (seeding data, validating stock during checkout).
// NEVER send this key to the browser.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Per-request client: built fresh for each authenticated request, using the
// anon key PLUS the user's own access token. This means every query made
// with this client is still subject to RLS as that specific user — exactly
// the "users can only touch their own rows" behavior we set up in schema.sql.
export function supabaseForUser(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

// Plain anon client with no user context — used for public, logged-out-safe
// reads like browsing products and categories.
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
