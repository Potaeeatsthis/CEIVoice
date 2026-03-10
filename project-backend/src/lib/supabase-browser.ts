// src/lib/supabase-browser.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables');
}

let client: SupabaseClient | null = null;

export const supabaseBrowser = (() => {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
})();
