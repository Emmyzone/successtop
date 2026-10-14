import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../hooks/useData';
import { formatDate, naira } from '../lib/format';
import { EmptyState, ErrorBox, Spinner } from '../components/States';
import { adminError, fromLocalInput, publish, run, toLocalInput } from './db';
import { Badge, Field, FormError, ImageUpload, Modal, PageHeader, Toggle, useFlash } from './ui';

interface Promo {
  id: string; title: string; description: string | null; image_path: string | null; product_id: string | null; category_id: string | null;
  discount_percent: number | null; promo_price: number | null; starts_at: string; ends_at: string; is_active: boolean;
}
interface Opt { id: string; name: string }
interface Form {
  id?: string; title: string; description: string; image_path: string; product_id: string; category_id: string;
  discount_percent: string; promo_price: string; starts_at: string; ends_at: string; is_active: boolean;
}

const blank = (): Form => {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 86400000);
  return { title: '', description: '', image_path: '', product_id: '', category_id: '', discount_percent: '', promo_price: '', starts_at: toLocalInput(now.toISOString()), ends_at: toLocalInput(end.toISOString()), is_active: true };
};

function status(p: Promo): { label: string; tone: 'green' | 'amber' | 'gray' } {
  const now = Date.now();
  if (!p.is_active) return { label: 'Switched off', tone: 'gray' };
  if (new Date(p.starts_at).getTime() > now) return { label: 'Scheduled', tone: 'amber' };
  if (new Date(p.ends_at).getTime() < now) return { label: 'Ended', tone: 'gray' };
  return { label: 'Live now', tone: 'green' };
}

export default function Promotions() {
  const { data, loading, error, reload } = useData(async () => {
    const [promos, products, cats] = await Promise.all([
      run<Promo[]>(supabase.from('bst_promotions').select('*').order('ends_at', { ascending: false }) as any),
      run<Opt[]>(supabase.from('bst_products').select('id,name').order('name') as any),
      run<Opt[]>(supabase.from('bst_categories').select('id,name').order('sort_order') as any),
    ]);
    return { promos, products, cats };
  });
  const [editing, setEditing] = useState<Form | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const { flash, flashNode } = useFlash();

  async function remove(p: Promo) {
    if (!window.confirm(`Delete the offer "${p.title}"?`)) return;
    setListError(null);
    try { await run(supabase.from('bst_promotions').delete().eq('id', p.id) as any); publish(); flash('Offer deleted'); reload(); }
    catch (e) { setListError(adminError(e)); }
  }

  return (
    <>
      <PageHeader title="Offers" hint="Promotions appear on the Offers page only between their start and end times."
        action={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" /> Add offer</button>} />
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {listError && <ErrorBox message={listError} />}
      {data && data.promos.length === 0 && <EmptyState title="No offers yet">No offers are running. Add one when you have a promotion.</EmptyState>}
      {data && data.promos.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {data.promos.map((p) => {
            const s = status(p);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{p.title} <Badge tone={s.tone}>{s.label}</Badge></p>
                  <p className="text-sm text-muted">
                    {formatDate(p.starts_at)} to {formatDate(p.ends_at)}
                    {p.discount_percent != null && ` · ${p.discount_percent}% off`}
                    {p.promo_price != null && ` · ${naira(p.promo_price)}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="rounded-lg p-2 hover:bg-crumb" aria-label={`Edit ${p.title}`} onClick={() => setEditing({ id: p.id, title: p.title, description: p.description ?? '', image_path: p.image_path ?? '', product_id: p.product_id ?? '', category_id: p.category_id ?? '', discount_percent: p.discount_percent == null ? '' : String(p.discount_percent), promo_price: p.promo_price == null ? '' : String(p.promo_price), starts_at: toLocalInput(p.starts_at), ends_at: toLocalInput(p.ends_at), is_active: p.is_active })}><Pencil className="h-4 w-4" /></button>
                  <button className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${p.title}`} onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && data && <Editor initial={editing} products={data.products} cats={data.cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); publish(); flash('Offer saved'); reload(); }} />}
      {flashNode}
    </>
  );
}

function Editor({ initial, products, cats, onClose, onSaved }: { initial: Form; products: Opt[]; cats: Opt[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof Form, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.title.trim()) return setErr('Enter a title.');
    if (!f.starts_at || !f.ends_at) return setErr('Choose a start and end time.');
    if (new Date(f.ends_at) <= new Date(f.starts_at)) return setErr('The end time must be after the start time.');
    const pct = f.discount_percent.trim() === '' ? null : Number(f.discount_percent);
    const price = f.promo_price.trim() === '' ? null : Number(f.promo_price);
    if (pct !== null && (!Number.isFinite(pct) || pct <= 0 || pct > 100)) return setErr('Discount must be between 1 and 100.');
    if (price !== null && (!Number.isFinite(price) || price < 0)) return setErr('Offer price is not valid.');
    setBusy(true);
    try {
      const row = {
        title: f.title.trim(), description: f.description.trim() || null, image_path: f.image_path || null,
        product_id: f.product_id || null, category_id: f.category_id || null, discount_percent: pct, promo_price: price,
        starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at), is_active: f.is_active,
      };
      if (f.id) await run(supabase.from('bst_promotions').update(row).eq('id', f.id) as any);
      else await run(supabase.from('bst_promotions').insert(row) as any);
      onSaved();
    } catch (e2) { setErr(adminError(e2)); setBusy(false); }
  }

  return (
    <Modal title={f.id ? 'Edit offer' : 'Add offer'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title"><input className="field" required maxLength={120} value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Details"><textarea className="field" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <ImageUpload folder="promotions" value={f.image_path} onChange={(p) => set('image_path', p)} label="Offer image (optional)" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Applies to a product (optional)">
            <select className="field" value={f.product_id} onChange={(e) => set('product_id', e.target.value)}><option value="">None</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </Field>
          <Field label="Applies to a category (optional)">
            <select className="field" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
          <Field label="Percent off (optional)"><input className="field" inputMode="decimal" value={f.discount_percent} onChange={(e) => set('discount_percent', e.target.value)} /></Field>
          <Field label="Offer price ₦ (optional)"><input className="field" inputMode="decimal" value={f.promo_price} onChange={(e) => set('promo_price', e.target.value)} /></Field>
          <Field label="Starts"><input type="datetime-local" className="field" required value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} /></Field>
          <Field label="Ends"><input type="datetime-local" className="field" required value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} /></Field>
        </div>
        <Toggle label="Switched on" checked={f.is_active} onChange={(v) => set('is_active', v)} />
        <FormError message={err} />
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save offer'}</button>
        </div>
      </form>
    </Modal>
  );
}
