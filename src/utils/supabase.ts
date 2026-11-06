import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : null) || (globalThis as any).process?.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// Security Verification: Client must NEVER use service_role key
function isSafeAnonKey(key: string): boolean {
  if (!key) return false;
  try {
    // JWT token payload inspection
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === 'service_role') {
        console.error(
          'CRITICAL SECURITY ALERT: service_role key detected in client environment! Refusing to initialize Supabase client.'
        );
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

const safeAnon = isSafeAnonKey(supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && safeAnon);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Upload file to private Supabase Storage bucket with strict file size limits (default 50MB)
 */
export async function uploadPrivateMedia(
  bucket: string,
  filePath: string,
  file: Blob | File,
  maxSizeBytes: number = 50 * 1024 * 1024
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase chưa được cấu hình trên hệ thống.' };
  }

  // 1. Strictly enforce upload file size limit
  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return { success: false, error: `Dung lượng tệp vượt quá hạn mức tối đa cho phép (${maxMb}MB).` };
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate a short-lived Signed URL for private bucket objects (Default 1 hour expiration)
 */
export async function createSignedDownloadUrl(
  bucket: string,
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase chưa được cấu hình trên hệ thống.' };
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
