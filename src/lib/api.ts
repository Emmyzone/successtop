import { supabase } from './supabase';
import type { Branch, Category, Product, Promotion, Settings } from './types';

// Small in-memory cache so moving between pages feels instant (no refetch for 60s).
const TTL = 60_000;
const store = new Map<string, { t: number; p: Promise<unknown> }>();

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.p as Promise<T>;
  const p = fn().catch((e) => {
    store.delete(key);
    throw e;
  });
  store.set(key, { t: Date.now(), p });
  return p;
}

export const clearCache = () => store.clear();

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const fetchSettings = () =>
  cached('settings', async () => {
    const rows = unwrap(await supabase.from('bst_site_settings').select('key,value')) as { key: string; value: unknown }[];
    const out: Settings = {};
    for (const r of rows) out[r.key] = typeof r.value === 'string' ? r.value : r.value == null ? '' : String(r.value);
    return out;
  });

export const fetchBranches = () =>
  cached('branches', async () => {
    const rows = unwrap(await supabase.from('bst_branches').select('*').eq('is_active', true).order('sort_order')) as Branch[];
    return rows;
  });

export const fetchCategories = () =>
  cached('categories', async () => {
    const rows = unwrap(await supabase.from('bst_categories').select('*').eq('is_active', true).order('sort_order')) as Category[];
    return rows;
  });

export const fetchProducts = () =>
  cached('products', async () => {
    const rows = unwrap(
      await supabase
        .from('bst_products')
        .select('*, category:bst_categories(id,name,slug), variants:bst_product_variants(*)')
        .order('sort_order')
        .order('name'),
    ) as any[];
    return rows.map((p) => ({
      ...p,
      base_price: Number(p.base_price),
      compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
      variants: (p.variants ?? [])
        .map((v: any) => ({ ...v, price: Number(v.price) }))
        .sort((a: any, b: any) => a.sort_order - b.sort_order),
    })) as Product[];
  });

export const fetchPromotions = () =>
  cached('promotions', async () => {
    const now = new Date().toISOString();
    const rows = unwrap(
      await supabase
        .from('bst_promotions')
        .select('*, product:bst_products(name), category:bst_categories(name,slug)')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .order('ends_at'),
    ) as any[];
    return rows.map((p) => ({
      ...p,
      discount_percent: p.discount_percent == null ? null : Number(p.discount_percent),
      promo_price: p.promo_price == null ? null : Number(p.promo_price),
    })) as Promotion[];
  });
