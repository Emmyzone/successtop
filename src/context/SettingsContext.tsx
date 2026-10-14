import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchBranches, fetchSettings } from '../lib/api';
import { supabaseConfigured } from '../lib/supabase';
import { toWhatsAppNumber } from '../lib/whatsapp';
import type { Branch, Settings } from '../lib/types';

// Safe defaults so the site looks right even before settings load or are edited.
export const DEFAULT_SETTINGS: Settings = {
  business_name: 'SuccessTop',
  tagline: 'Freshly baked',
  phone: '07067877868',
  email: 'successtop@gmail.com',
  whatsapp_number: '2347067877868',
  description: 'SuccessTop is a bakery and food business in Ibadan. We make and sell bread, doughnuts, shawarma, puff-puff and other pastries.',
  about_text:
    'SuccessTop is a bakery and food business based in Ibadan, Oyo State. We produce and sell bread, doughnuts, shawarma, puff-puff and other pastries from two branches at Odo Ona Elewe.\n\nWe take orders for business meetings and special occasions, and we supply bread to resellers at competitive prices.',
  hero_headline: 'Freshly Baked. Made for Every Occasion.',
  hero_text: 'Bread, doughnuts, shawarma, puff-puff and pastries from our two branches in Ibadan. Order for yourself, for a meeting, or for an event.',
  hero_image_path: '',
  hero_image_alt: 'Fresh bakery products from SuccessTop',
  logo_path: '',
  bulk_title: 'Bread for resellers',
  bulk_text: 'Buying bread to resell? We supply bread in bulk at competitive prices. Message us on WhatsApp to talk about the quantities you need.',
  catering_title: 'Meetings, events and special occasions',
  catering_text: 'Planning a meeting, a business event or a celebration? Tell us what you need and our team will arrange it with you on WhatsApp.',
  contact_callout: 'Questions about an order? Message us on WhatsApp.',
  footer_text: 'Freshly baked in Ibadan.',
  seo_title: 'SuccessTop | Freshly baked in Ibadan',
  seo_description: 'SuccessTop is a bakery and food business in Ibadan selling bread, doughnuts, shawarma, puff-puff and pastries, with bulk bread supply for resellers.',
};

// Shown only if the branch table cannot be read, so the site never looks empty.
const FALLBACK_BRANCHES: Branch[] = [
  { id: 'fallback-1', name: 'Arapaja Branch', address: 'Arapaja, Odo Ona Elewe, Ibadan', phone: null, whatsapp_number: null, opening_hours: null, directions_url: null, is_active: true, sort_order: 1 },
  { id: 'fallback-2', name: 'Idioya Branch', address: 'Idioya, Odo Ona Elewe, Ibadan', phone: null, whatsapp_number: null, opening_hours: null, directions_url: null, is_active: true, sort_order: 2 },
];

interface SettingsValue {
  settings: Settings;
  branches: Branch[];
  whatsappNumber: string;
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [branches, setBranches] = useState<Branch[]>(FALLBACK_BRANCHES);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState<string | null>(supabaseConfigured ? null : 'The website is not connected to its database yet.');

  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    Promise.all([fetchSettings(), fetchBranches()])
      .then(([s, b]) => {
        if (!alive) return;
        setSettings({ ...DEFAULT_SETTINGS, ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== '')) });
        if (b.length) setBranches(b);
      })
      .catch(() => alive && setError('Some content could not be loaded. Showing default information.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({ settings, branches, whatsappNumber: toWhatsAppNumber(settings.whatsapp_number), loading, error }),
    [settings, branches, loading, error],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used inside SettingsProvider');
  return v;
}
