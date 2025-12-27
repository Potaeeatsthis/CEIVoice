import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Client for public interactions (respects RLS policies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for admin actions (bypasses RLS) - Use carefully!
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY!
);
