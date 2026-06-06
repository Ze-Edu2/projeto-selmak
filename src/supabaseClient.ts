import { createClient } from "@supabase/supabase-js";

// Retrieve Supabase credentials from Vite environment variables
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Custom logger or helper
if (!isSupabaseConfigured) {
  console.info(
    "Supabase credentials not fully configured in environment variables. Falling back to robust offline LocalStorage."
  );
}

// Generate the client instances
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
