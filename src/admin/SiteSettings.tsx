import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useData } from '../hooks/useData';
import { DEFAULT_SETTINGS } from '../context/SettingsContext';
import { ErrorBox, Spinner } from '../components/States';
import { adminError, publish, run } from './db';
import { Field, FormError, ImageUpload, PageHeader, useFlash } from './ui';

type Kind = 'text' | 'area';
const GROUPS: { title: string; fields: { key: string; label: string; kind: Kind; hint?: string }[] }[] = [
  { title: 'Business details', fields: [
    { key: 'business_name', label: 'Business name', kind: 'text' },
    { key: 'tagline', label: 'Tagline', kind: 'text' },
    { key: 'phone', label: 'Phone number', kind: 'text' },
    { key: 'email', label: 'Email', kind: 'text' },
    { key: 'whatsapp_number', label: 'WhatsApp number', kind: 'text', hint: 'Orders open WhatsApp on this number. Example: 07067877868' },
  ] },
  { title: 'Homepage', fields: [
    { key: 'hero_headline', label: 'Main headline', kind: 'text' },
    { key: 'hero_text', label: 'Intro text', kind: 'area' },
    { key: 'hero_image_alt', label: 'Main image description', kind: 'text', hint: 'For screen readers and search engines.' },
  ] },
  { title: 'About page', fields: [
    { key: 'about_text', label: 'About text', kind: 'area', hint: 'Leave a blank line between paragraphs.' },
  ] },
  { title: 'Bulk orders and events', fields: [
    { key: 'bulk_title', label: 'Resellers title', kind: 'text' },
    { key: 'bulk_text', label: 'Resellers text', kind: 'area' },
    { key: 'catering_title', label: 'Events title', kind: 'text' },
    { key: 'catering_text', label: 'Events text', kind: 'area' },
    { key: 'contact_callout', label: 'Contact page message', kind: 'text' },
  ] },
  { title: 'Footer and search engines', fields: [
    { key: 'footer_text', label: 'Footer text', kind: 'text' },
    { key: 'seo_title', label: 'Search result title', kind: 'text' },
    { key: 'seo_description', label: 'Search result description', kind: 'area' },
  ] },
];

export default function SiteSettings() {
  const { data, loading, error, reload } = useData(async () => {
    const rows = await run<{ key: string; value: unknown }[]>(supabase.from('bst_site_settings').select('key,value') as any);
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = typeof r.value === 'string' ? r.value : r.value == null ? '' : String(r.value);
    return out;
  });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { flash, flashNode } = useFlash();

  useEffect(() => { if (data) setVals({ ...DEFAULT_SETTINGS, ...data }); }, [data]);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const rows = Object.entries(vals).map(([key, value]) => ({ key, value }));
      await run(supabase.from('bst_site_settings').upsert(rows, { onConflict: 'key' }) as any);
      publish();
      flash('Site text saved');
    } catch (e2) { setErr(adminError(e2)); }
    setBusy(false);
  }

  const setImage = async (key: string, path: string) => {
    setVals((v) => ({ ...v, [key]: path }));
    // Save images straight away so an upload is never lost.
    try {
      await run(supabase.from('bst_site_settings').upsert([{ key, value: path }], { onConflict: 'key' }) as any);
      publish();
      flash('Image updated');
    } catch (e) { setErr(adminError(e)); }
  };

  return (
    <>
      <PageHeader title="Site text & images" hint="Change the words and pictures on the public website. Changes appear after you save." />
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <form onSubmit={save} className="space-y-8">
          <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
            <h2 className="font-bold">Images</h2>
            <ImageUpload site folder="site" label="Logo" value={vals.logo_path || null} onChange={(p) => setImage('logo_path', p)} />
            <ImageUpload site folder="site" label="Homepage main image" value={vals.hero_image_path || null} onChange={(p) => setImage('hero_image_path', p)} />
          </section>
          {GROUPS.map((g) => (
            <section key={g.title} className="space-y-4 rounded-2xl border border-line bg-white p-5">
              <h2 className="font-bold">{g.title}</h2>
              {g.fields.map((fl) => (
                <Field key={fl.key} label={fl.label} hint={fl.hint}>
                  {fl.kind === 'area'
                    ? <textarea className="field" rows={4} value={vals[fl.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [fl.key]: e.target.value }))} />
                    : <input className="field" value={vals[fl.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [fl.key]: e.target.value }))} />}
                </Field>
              ))}
            </section>
          ))}
          <FormError message={err} />
          <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 p-4 sm:-mx-8 sm:px-8">
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      )}
      {flashNode}
    </>
  );
}
