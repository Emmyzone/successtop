import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PRODUCT_BUCKET, publicImageUrl } from '../lib/supabase';
import { useData } from '../hooks/useData';
import { naira, slugify } from '../lib/format';
import { EmptyState, ErrorBox, Spinner } from '../components/States';
import { adminError, publish, run } from './db';
import { Badge, Field, FormError, ImageUpload, Modal, PageHeader, Toggle, useFlash } from './ui';

interface VariantRow { id?: string; name: string; price: string; is_available: boolean; sort_order: number }
interface ProductRow {
  id: string; name: string; slug: string; description: string | null; category_id: string | null;
  base_price: number; compare_at_price: number | null; image_path: string | null; image_alt: string | null;
  is_available: boolean; is_featured: boolean; sort_order: number;
  category: { name: string } | null;
  variants: { id: string; name: string; price: number; is_available: boolean; sort_order: number }[];
}
interface Cat { id: string; name: string }

interface Form {
  id?: string; name: string; slug: string; slugTouched: boolean; description: string; category_id: string;
  base_price: string; compare_at_price: string; image_path: string; image_alt: string;
  is_available: boolean; is_featured: boolean; sort_order: string; variants: VariantRow[];
}

const blank = (): Form => ({
  name: '', slug: '', slugTouched: false, description: '', category_id: '', base_price: '', compare_at_price: '',
  image_path: '', image_alt: '', is_available: true, is_featured: false, sort_order: '0', variants: [],
});

const toForm = (p: ProductRow): Form => ({
  id: p.id, name: p.name, slug: p.slug, slugTouched: true, description: p.description ?? '',
  category_id: p.category_id ?? '', base_price: String(p.base_price),
  compare_at_price: p.compare_at_price == null ? '' : String(p.compare_at_price),
  image_path: p.image_path ?? '', image_alt: p.image_alt ?? '', is_available: p.is_available,
  is_featured: p.is_featured, sort_order: String(p.sort_order),
  variants: [...p.variants].sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ id: v.id, name: v.name, price: String(v.price), is_available: v.is_available, sort_order: v.sort_order })),
});

export default function Products() {
  const { data, loading, error, reload } = useData(async () => {
    const [products, cats] = await Promise.all([
      run<ProductRow[]>(supabase.from('bst_products').select('*, category:bst_categories(name), variants:bst_product_variants(*)').order('name') as any),
      run<Cat[]>(supabase.from('bst_categories').select('id,name').order('sort_order') as any),
    ]);
    return { products, cats };
  });
  const [editing, setEditing] = useState<Form | null>(null);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [listError, setListError] = useState<string | null>(null);
  const { flash, flashNode } = useFlash();

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!cat || p.category_id === cat));
  }, [data, search, cat]);

  async function quickToggle(p: ProductRow, field: 'is_available' | 'is_featured') {
    setListError(null);
    try {
      await run(supabase.from('bst_products').update({ [field]: !p[field] }).eq('id', p.id) as any);
      publish();
      reload();
    } catch (e) {
      setListError(adminError(e));
    }
  }

  async function remove(p: ProductRow) {
    if (!window.confirm(`Delete "${p.name}"? Old order requests keep their copy of the name and price. To just hide it, mark it unavailable instead.`)) return;
    setListError(null);
    try {
      await run(supabase.from('bst_products').delete().eq('id', p.id) as any);
      publish();
      flash('Product deleted');
      reload();
    } catch (e) {
      setListError(adminError(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        hint="Add what you sell, set prices and photos. Unavailable products stay on the menu but are greyed out and cannot be ordered."
        action={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" /> Add product</button>}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="field max-w-xs" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
        <select className="field max-w-[200px]" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {data?.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {listError && <ErrorBox message={listError} />}
      {data && data.products.length === 0 && (
        <EmptyState title="No products yet" action={<button className="btn-primary" onClick={() => setEditing(blank())}>Add your first product</button>}>
          Your menu is empty. Add products and they appear on the website straight away.
        </EmptyState>
      )}
      {data && data.products.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-crumb/60 text-xs uppercase text-muted">
              <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const img = publicImageUrl(PRODUCT_BUCKET, p.image_path);
                const prices = p.variants.length ? p.variants.map((v) => v.price) : [p.base_price];
                const lo = Math.min(...prices), hi = Math.max(...prices);
                return (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-crumb">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</div>
                        <div><p className="font-semibold">{p.name}</p>{p.variants.length > 0 && <p className="text-xs text-muted">{p.variants.length} options</p>}</div>
                      </div>
                    </td>
                    <td className="p-3 text-muted">{p.category?.name ?? '—'}</td>
                    <td className="p-3">{lo === hi ? naira(lo) : `${naira(lo)} – ${naira(hi)}`}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => quickToggle(p, 'is_available')} title="Click to change"><Badge tone={p.is_available ? 'green' : 'red'}>{p.is_available ? 'Available' : 'Unavailable'}</Badge></button>
                        <button onClick={() => quickToggle(p, 'is_featured')} title="Click to change" aria-label={p.is_featured ? 'Featured. Click to unfeature' : 'Click to feature'}>
                          <Badge tone={p.is_featured ? 'amber' : 'gray'}><Star className="mr-1 inline h-3 w-3" />{p.is_featured ? 'Featured' : 'Not featured'}</Badge>
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button className="rounded-lg p-2 hover:bg-crumb" onClick={() => setEditing(toForm(p))} aria-label={`Edit ${p.name}`}><Pencil className="h-4 w-4" /></button>
                        <button className="rounded-lg p-2 text-red-700 hover:bg-red-50" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No products match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editing && data && (
        <ProductEditor
          initial={editing}
          cats={data.cats}
          existingVariantIds={data.products.find((p) => p.id === editing.id)?.variants.map((v) => v.id) ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); publish(); flash('Product saved'); reload(); }}
        />
      )}
      {flashNode}
    </>
  );
}

function ProductEditor({ initial, cats, existingVariantIds, onClose, onSaved }: {
  initial: Form; cats: Cat[]; existingVariantIds: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    setF((s) => ({ ...s, variants: s.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const base = Number(f.base_price);
    const compare = f.compare_at_price.trim() === '' ? null : Number(f.compare_at_price);
    if (!f.name.trim()) return setErr('Enter a product name.');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) return setErr('The web address (slug) can only use lowercase letters, numbers and single hyphens.');
    if (!Number.isFinite(base) || base < 0) return setErr('Enter a valid price.');
    if (compare !== null && (!Number.isFinite(compare) || compare < 0)) return setErr('The "was" price is not valid.');
    for (const v of f.variants) {
      if (!v.name.trim()) return setErr('Every option needs a name, or remove it.');
      if (!Number.isFinite(Number(v.price)) || Number(v.price) < 0 || v.price.trim() === '') return setErr(`Enter a valid price for the option "${v.name}".`);
    }
    setBusy(true);
    try {
      const row = {
        name: f.name.trim(), slug: f.slug, description: f.description.trim() || null,
        category_id: f.category_id || null, base_price: base, compare_at_price: compare,
        image_path: f.image_path || null, image_alt: f.image_alt.trim() || null,
        is_available: f.is_available, is_featured: f.is_featured, sort_order: Number(f.sort_order) || 0,
      };
      let id = f.id;
      if (id) {
        await run(supabase.from('bst_products').update(row).eq('id', id) as any);
      } else {
        const created = await run<{ id: string }>(supabase.from('bst_products').insert(row).select('id').single() as any);
        id = created.id;
      }
      // Sync options: remove deleted ones, update existing, add new.
      const keep = new Set(f.variants.filter((v) => v.id).map((v) => v.id as string));
      const removed = existingVariantIds.filter((vid) => !keep.has(vid));
      if (removed.length) await run(supabase.from('bst_product_variants').delete().in('id', removed) as any);
      for (let i = 0; i < f.variants.length; i++) {
        const v = f.variants[i];
        const vrow = { product_id: id, name: v.name.trim(), price: Number(v.price), is_available: v.is_available, sort_order: i };
        if (v.id) await run(supabase.from('bst_product_variants').update(vrow).eq('id', v.id) as any);
        else await run(supabase.from('bst_product_variants').insert(vrow) as any);
      }
      onSaved();
    } catch (e2) {
      setErr(adminError(e2));
      setBusy(false);
    }
  }

  return (
    <Modal title={f.id ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input className="field" value={f.name} required maxLength={120} onChange={(e) => setF((s) => ({ ...s, name: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value) }))} />
        </Field>
        <Field label="Web address (slug)" hint="Filled in automatically. Lowercase letters, numbers and hyphens.">
          <input className="field" value={f.slug} required onChange={(e) => setF((s) => ({ ...s, slug: e.target.value, slugTouched: true }))} />
        </Field>
        <Field label="Category">
          <select className="field" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">No category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Description"><textarea className="field" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (₦)" hint="Used when the product has no options below.">
            <input className="field" inputMode="decimal" required value={f.base_price} onChange={(e) => set('base_price', e.target.value)} />
          </Field>
          <Field label="Old price (₦), optional" hint="Shown crossed out, for a reduced price.">
            <input className="field" inputMode="decimal" value={f.compare_at_price} onChange={(e) => set('compare_at_price', e.target.value)} />
          </Field>
        </div>
        <ImageUpload folder="products" value={f.image_path} onChange={(p) => set('image_path', p)} label="Main photo" />
        <Field label="Photo description" hint="Short description for people using screen readers, e.g. “Golden sliced bread loaf”.">
          <input className="field" value={f.image_alt} onChange={(e) => set('image_alt', e.target.value)} />
        </Field>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold">Sizes or options (optional)</legend>
          <p className="mb-3 text-xs text-muted">e.g. Small / Medium / Large. If you add options, customers must pick one and the option’s price is used.</p>
          <div className="space-y-2">
            {f.variants.map((v, i) => (
              <div key={v.id ?? `new-${i}`} className="flex flex-wrap items-center gap-2">
                <input className="field min-w-[120px] flex-1" placeholder="Name" aria-label="Option name" value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} />
                <input className="field w-28" placeholder="Price" inputMode="decimal" aria-label="Option price" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} />
                <Toggle label="Available" checked={v.is_available} onChange={(c) => setVariant(i, { is_available: c })} />
                <button type="button" className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label="Remove option" onClick={() => setF((s) => ({ ...s, variants: s.variants.filter((_, idx) => idx !== i) }))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-outline mt-3 !px-4 !py-2" onClick={() => setF((s) => ({ ...s, variants: [...s.variants, { name: '', price: '', is_available: true, sort_order: s.variants.length }] }))}>
            <Plus className="h-4 w-4" /> Add option
          </button>
        </fieldset>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Toggle label="Available to order" checked={f.is_available} onChange={(v) => set('is_available', v)} />
          <Toggle label="Show on homepage (featured)" checked={f.is_featured} onChange={(v) => set('is_featured', v)} />
          <Field label="Order on menu"><input className="field w-24" inputMode="numeric" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
        </div>
        <FormError message={err} />
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </Modal>
  );
}
