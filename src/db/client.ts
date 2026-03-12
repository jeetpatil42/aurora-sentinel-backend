import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
// Support both SUPABASE_SERVICE_ROLE and SUPABASE_SERVICE_KEY for backward compatibility
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';
const supabaseAnonKey = process.env.SUPABASE_KEY || 'placeholder-key';

const isDevelopment = process.env.NODE_ENV !== 'production';
const hasValidCredentials = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY);

if (!hasValidCredentials) {
  if (isDevelopment) {
    console.warn('⚠️  WARNING: Supabase credentials not configured. Database operations will fail.');
    console.warn('⚠️  Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env file.');
  } else {
    console.error('Missing Supabase configuration. Please check your .env file.');
    process.exit(1);
  }
}

// Service client for admin operations (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client for client-side operations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Note: Direct SQL queries should use Supabase client methods
// The Supabase client handles all database operations
