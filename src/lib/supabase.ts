import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Client configuration
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (!!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
};

export const getSupabaseConfig = () => {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
};

let supabaseAdminInstance: SupabaseClient | null = null;
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Client có quyền quản trị backend (Service Role hoặc Anon Key)
 * Dùng cho các Route Handlers trên máy chủ (Server-side)
 */
export const getSupabaseAdmin = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminInstance;
};

/**
 * Client tiêu chuẩn dùng cho Frontend
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(url, key);
  }
  return supabaseClientInstance;
};
