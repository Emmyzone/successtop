import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../hooks/useData';
import { EmptyState, ErrorBox, Spinner } from '../components/States';
import { adminError, publish, run } from './db';
import { Badge, Field, FormError, Modal, PageHeader, Toggle, useFlash } from './ui';

interface Branch { id: string; name: string; address: string; phone: string | null; whatsapp_number: string | null; opening_hours: string | null; directions_url: string | null; is_active: boolean; sort_order: number }
interface Form { id?: string; name: string; address: string; phone: string; whatsapp_number: string; opening_hours: string; directions_url: string; is_active: boolean; sort_order: string }
const blank = (): Form => ({ name: '', address: '', phone: '', whatsapp_number: '', opening_hours: '', directions_url: '', is_active: true, sort_order: '0' });

export default function Branches() {
  const { data, loading, error, reload } = useData(() => run<Branch[]>(supabase.from('bst_branches').select('*').order('sort_order') as any));
  const [editing, setEditing] = useState<Form | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const { flash, flashNode } = useFlash();

  async function remove(b: Branch) {
    if (!window.confirm(`Delete "${b.name}"? To just hide it, switch it off instead.`)) return;
    setListError(null);
    try { await run(supabase.from('bst_branches').delete().eq('id', b.id) as any); publish(); flash('Branch deleted'); reload(); }
    catch (e) { setListError(adminError(e)); }
  }

  return (
    <>
      <PageHeader title="Branches" hint="Your shop locations, shown on the Branches page and in the order form."
        action={<button className="btn-primary" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" /> Add branch</button>} />
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {listError && <ErrorBox message={listError} />}
      {data && data.length === 0 && <EmptyState title="No branches yet">Add your first branch.</EmptyState>}
      {data && data.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {data.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div><p className="font-semibold">{b.name} {!b.is_active && <Badge tone="red">Hidden</Badge>}</p><p className="text-sm text-muted">{b.address}</p></div>
              <div className="flex gap-1">
                <button className="rounded-lg p-2 hover:bg-crumb" aria-label={`Edit ${b.name}`} onClick={() => setEditing({ id: b.id, name: b.name, address: b.address, phone: b.phone ?? '', whatsapp_number: b.whatsapp_number ?? '', opening_hours: b.opening_hours ?? '', directions_url: b.directions_url ?? '', is_active: b.is_active, sort_order: String(b.sort_order) })}><Pencil className="h-4 w-4" /></button>
                <button className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${b.name}`} onClick={() => remove(b)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <Editor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); publish(); flash('Branch saved'); reload(); }} />}
      {flashNode}
    </>
  );
}

function Editor({ initial, onClose, onSaved }: { initial: Form; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof Form, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim() || !f.address.trim()) return setErr('Name and address are required.');
    if (f.directions_url.trim() && !/^https?:\/\//i.test(f.directions_url.trim())) return setErr('The directions link must start with https://');
    setBusy(true);
    try {
      const n = (s: string) => s.trim() || null;
      const row = { name: f.name.trim(), address: f.address.trim(), phone: n(f.phone), whatsapp_number: n(f.whatsapp_number), opening_hours: n(f.opening_hours), directions_url: n(f.directions_url), is_active: f.is_active, sort_order: Number(f.sort_order) || 0 };
      if (f.id) await run(supabase.from('bst_branches').update(row).eq('id', f.id) as any);
      else await run(supabase.from('bst_branches').insert(row) as any);
      onSaved();
    } catch (e2) { setErr(adminError(e2)); setBusy(false); }
  }

  return (
    <Modal title={f.id ? 'Edit branch' : 'Add branch'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Branch name"><input className="field" required value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Address"><textarea className="field" rows={2} required value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone (optional)"><input className="field" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="WhatsApp number (optional)"><input className="field" value={f.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} /></Field>
        </div>
        <Field label="Opening hours (optional)" hint="e.g. Mon to Sat, 7am to 8pm"><input className="field" value={f.opening_hours} onChange={(e) => set('opening_hours', e.target.value)} /></Field>
        <Field label="Google Maps link (optional)"><input className="field" placeholder="https://maps.google.com/…" value={f.directions_url} onChange={(e) => set('directions_url', e.target.value)} /></Field>
        <div className="flex flex-wrap items-end gap-6">
          <Toggle label="Show on website" checked={f.is_active} onChange={(v) => set('is_active', v)} />
          <Field label="Order"><input className="field w-24" inputMode="numeric" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
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
