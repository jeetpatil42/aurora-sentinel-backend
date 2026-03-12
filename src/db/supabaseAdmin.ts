import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || '';

const isDevelopment = process.env.NODE_ENV !== 'production';

if (!supabaseUrl || !supabaseServiceKey) {
  if (isDevelopment) {
    console.error('❌ ERROR: Supabase credentials are missing or empty.');
    console.error('Please configure the following in backend/.env:');
    console.error('  SUPABASE_URL=<your-project-url>');
    console.error('  SUPABASE_SERVICE_ROLE=<your-service-role-key>');
    throw new Error('Supabase credentials are required. Please check your .env file.');
  } else {
    console.error('Missing Supabase configuration. Please check your .env file.');
    process.exit(1);
  }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
