import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

// Falls back to harmless placeholders so the app can still render a clear
// "not connected" message instead of crashing when env vars are missing.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const PRODUCT_BUCKET = 'bst-product-images';
export const ASSET_BUCKET = 'bst-site-assets';

export function publicImageUrl(bucket: string, path?: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
