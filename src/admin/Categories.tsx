import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../hooks/useData';
import { slugify } from '../lib/format';
import { EmptyState, ErrorBox, Spinner } from '../components/States';
import { adminError, publish, run } from './db';
import { Badge, Field, FormError, ImageUpload, Modal, PageHeader, Toggle, useFlash } from './ui';

interface Cat { id: string; name: string; slug: string; description: string | null; image_path: string | null; sort_order: number; is_active: boolean }
interface Form { id?: string; name: string; slug: string; slugTouched: boolean; description: string; image_path: string; sort_order: string; is_active: boolean }
const blank = (): Form => ({ name: '', slug: '', slugTouched: false, description: '', image_path: '', sort_order: '0', is_active: true });

export default function Categories() {
  const { data, loading, error, reload } = useData(() => run<Cat[]>(supabase.from('bst_categories').select('*').order('sort_order') as any));
  const [editing, setEditing] = useState<Form | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const { flash, flashNode } = useFlash();

  async function remove(c: Cat) {
    if (!window.confirm(`Delete the category "${c.name}"? This only works if it has no products. To hide it, switch it off instead.`)) return;
    setListError(null);
    try {
      await run(supabase.from('bst_categories').delete().eq('id', c.id) as any);
      publish(); flash('Category deleted'); reload();
    } catch (e) {
      const ex = e as { code?: string };
      setListError(ex.code === '23503' ? 'This category still has products. Move or delete them first, or just switch the category off.' : adminError(e));
    }
  }

  return (
    <>
      <PageHeader title="Categories" hint="The groups on your menu. Switching a category off hides it and its products from the website."
        action={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" /> Add category</button>} />
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {listError && <ErrorBox message={listError} />}
      {data && data.length === 0 && <EmptyState title="No categories yet">Add a category to start organising your menu.</EmptyState>}
      {data && data.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div><p className="font-semibold">{c.name} {!c.is_active && <Badge tone="red">Hidden</Badge>}</p><p className="text-xs text-muted">/{c.slug}</p></div>
              <div className="flex gap-1">
                <button className="rounded-lg p-2 hover:bg-crumb" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, slugTouched: true, description: c.description ?? '', image_path: c.image_path ?? '', sort_order: String(c.sort_order), is_active: c.is_active })}><Pencil className="h-4 w-4" /></button>
                <button className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${c.name}`} onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <CatEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); publish(); flash('Category saved'); reload(); }} />}
      {flashNode}
    </>
  );
}

function CatEditor({ initial, onClose, onSaved }: { initial: Form; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim()) return setErr('Enter a name.');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) return setErr('The web address (slug) can only use lowercase letters, numbers and single hyphens.');
    setBusy(true);
    try {
      const row = { name: f.name.trim(), slug: f.slug, description: f.description.trim() || null, image_path: f.image_path || null, sort_order: Number(f.sort_order) || 0, is_active: f.is_active };
      if (f.id) await run(supabase.from('bst_categories').update(row).eq('id', f.id) as any);
      else await run(supabase.from('bst_categories').insert(row) as any);
      onSaved();
    } catch (e2) { setErr(adminError(e2)); setBusy(false); }
  }

  return (
    <Modal title={f.id ? 'Edit category' : 'Add category'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name"><input className="field" required maxLength={80} value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value) }))} /></Field>
        <Field label="Web address (slug)"><input className="field" required value={f.slug} onChange={(e) => setF((s) => ({ ...s, slug: e.target.value, slugTouched: true }))} /></Field>
        <Field label="Description (optional)"><textarea className="field" rows={2} value={f.description} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} /></Field>
        <ImageUpload folder="categories" value={f.image_path} onChange={(p) => setF((s) => ({ ...s, image_path: p }))} label="Photo (shown on the homepage)" />
        <div className="flex flex-wrap items-end gap-6">
          <Toggle label="Show on website" checked={f.is_active} onChange={(v) => setF((s) => ({ ...s, is_active: v }))} />
          <Field label="Order on menu"><input className="field w-24" inputMode="numeric" value={f.sort_order} onChange={(e) => setF((s) => ({ ...s, sort_order: e.target.value }))} /></Field>
        </div>
        <FormError message={err} />
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}