import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Note: We're not using the Database generic type here because our types
// are structured for application use, not for Supabase's type system.
// Use type assertions (e.g., `data as Site[]`) when querying.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
