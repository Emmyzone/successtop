import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useData } from '../hooks/useData';
import { formatDateTime, naira } from '../lib/format';
import { toWhatsAppNumber } from '../lib/whatsapp';
import { EmptyState, ErrorBox, Spinner } from '../components/States';
import { STATUSES, STATUS_LABEL, adminError, run } from './db';
import { Badge, PageHeader, useFlash } from './ui';

interface Item { id: string; product_name: string; variant_name: string | null; unit_price: number; quantity: number; line_total: number }
interface Order {
  id: string; reference: string; customer_name: string | null; customer_contact: string | null; fulfilment: string; notes: string | null;
  estimated_total: number; status: string; internal_notes: string | null; created_at: string;
  branch: { name: string } | null; items: Item[];
}
interface Enquiry {
  id: string; name: string; contact: string; enquiry_type: string; message: string; status: string; internal_notes: string | null; created_at: string;
  branch: { name: string } | null;
}

const TYPE_LABEL: Record<string, string> = { general: 'General', bulk_bread: 'Bulk bread', reseller: 'Reseller', catering: 'Meeting / event' };
const tone = (s: string) => (s === 'new' ? 'blue' : s === 'completed' || s === 'confirmed' ? 'green' : s === 'cancelled' ? 'red' : 'amber') as 'blue' | 'green' | 'red' | 'amber';

function ContactLink({ contact }: { contact: string | null }) {
  if (!contact) return <span className="text-muted">No contact given</span>;
  const digits = contact.replace(/\D/g, '');
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>{contact}</span>
      {digits.length >= 10 && (
        <a className="inline-flex items-center gap-1 text-xs font-semibold text-crust hover:underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${toWhatsAppNumber(contact)}`}>
          <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
        </a>
      )}
    </span>
  );
}

export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'enquiries' ? 'enquiries' : 'orders';
  const [filter, setFilter] = useState('');

  const orders = useData(() => run<Order[]>(supabase.from('bst_order_intents').select('*, branch:bst_branches(name), items:bst_order_intent_items(*)').order('created_at', { ascending: false }).limit(200) as any));
  const enquiries = useData(() => run<Enquiry[]>(supabase.from('bst_enquiries').select('*, branch:bst_branches(name)').order('created_at', { ascending: false }).limit(200) as any));
  const cur = tab === 'orders' ? orders : enquiries;
  const list = (cur.data ?? []).filter((r: { status: string }) => !filter || r.status === filter);
  const newCount = (rows: { status: string }[] | null) => (rows ?? []).filter((r) => r.status === 'new').length;

  return (
    <>
      <PageHeader title="Orders & enquiries" hint="Order requests are customers asking to order. They are not confirmed or paid until you agree it with them on WhatsApp." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-line bg-white p-1" role="tablist">
          {(['orders', 'enquiries'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setParams(t === 'orders' ? {} : { tab: t })} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-crust text-white' : 'text-ink hover:bg-crumb'}`}>
              {t === 'orders' ? 'Order requests' : 'Enquiries'} {newCount(t === 'orders' ? orders.data : enquiries.data) > 0 && <span className="ml-1 rounded-full bg-wheat px-1.5 text-xs text-ink">{newCount(t === 'orders' ? orders.data : enquiries.data)}</span>}
            </button>
          ))}
        </div>
        <select className="field max-w-[220px]" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {cur.loading && <Spinner />}
      {cur.error && <ErrorBox message={cur.error} onRetry={cur.reload} />}
      {cur.data && list.length === 0 && <EmptyState title="Nothing here">{filter ? 'No records with that status.' : tab === 'orders' ? 'No order requests yet.' : 'No enquiries yet.'}</EmptyState>}
      <ul className="space-y-3">
        {tab === 'orders' && (list as Order[]).map((o) => <OrderCard key={o.id} o={o} onChanged={orders.reload} />)}
        {tab === 'enquiries' && (list as Enquiry[]).map((q) => <EnquiryCard key={q.id} q={q} onChanged={enquiries.reload} />)}
      </ul>
    </>
  );
}

function useRecord(table: string, id: string, status: string, notes: string | null, onChanged: () => void) {
  const { isAdmin } = useAuth();
  const [s, setS] = useState(status);
  const [n, setN] = useState(notes ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { flash, flashNode } = useFlash();

  async function save(patch: Record<string, unknown>, msg: string) {
    setErr(null); setBusy(true);
    try { await run(supabase.from(table).update(patch).eq('id', id) as any); flash(msg); onChanged(); }
    catch (e) { setErr(adminError(e)); }
    setBusy(false);
  }
  async function remove(label: string) {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try { await run(supabase.from(table).delete().eq('id', id) as any); onChanged(); }
    catch (e) { setErr(adminError(e)); }
  }
  return { isAdmin, s, setS, n, setN, err, busy, save, remove, flashNode };
}

function Controls({ r, notesChanged }: { r: ReturnType<typeof useRecord>; notesChanged: boolean }) {
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block"><span className="label">Status</span>
          <select className="field" value={r.s} disabled={r.busy} onChange={(e) => { r.setS(e.target.value); r.save({ status: e.target.value }, 'Status updated'); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      <label className="block"><span className="label">Private notes (customers never see these)</span>
        <textarea className="field" rows={2} value={r.n} onChange={(e) => r.setN(e.target.value)} />
      </label>
      <div className="flex items-center justify-between">
        <button className="btn-outline !px-4 !py-2" disabled={r.busy || !notesChanged} onClick={() => r.save({ internal_notes: r.n.trim() || null }, 'Notes saved')}>Save notes</button>
        {r.isAdmin && <button className="flex items-center gap-1 text-sm text-red-700 hover:underline" onClick={() => r.remove('this record')}><Trash2 className="h-4 w-4" /> Delete</button>}
      </div>
      {r.err && <p role="alert" className="text-sm text-red-700">{r.err}</p>}
      {r.flashNode}
    </div>
  );
}

function OrderCard({ o, onChanged }: { o: Order; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const r = useRecord('bst_order_intents', o.id, o.status, o.internal_notes, onChanged);
  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        <div>
          <p className="font-bold">{o.reference} <Badge tone={tone(o.status)}>{STATUS_LABEL[o.status]}</Badge></p>
          <p className="text-sm text-muted">{o.customer_name || 'No name'} · {naira(o.estimated_total)} estimated · {formatDateTime(o.created_at)}</p>
        </div>
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {open && (
        <div className="mt-4 text-sm">
          <p><span className="font-semibold">Contact:</span> <ContactLink contact={o.customer_contact} /></p>
          <p className="mt-1"><span className="font-semibold">Branch:</span> {o.branch?.name ?? 'Not chosen'} · <span className="font-semibold">Fulfilment:</span> {o.fulfilment}</p>
          {o.notes && <p className="mt-1"><span className="font-semibold">Customer notes:</span> {o.notes}</p>}
          <table className="mt-3 w-full text-left">
            <thead className="text-xs uppercase text-muted"><tr><th className="py-1">Item</th><th>Qty</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-t border-line"><td className="py-1.5">{i.product_name}{i.variant_name ? ` (${i.variant_name})` : ''} <span className="text-muted">@ {naira(i.unit_price)}</span></td><td>{i.quantity}</td><td className="text-right">{naira(i.line_total)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-right font-bold">Estimated total {naira(o.estimated_total)}</p>
          <Controls r={r} notesChanged={r.n !== (o.internal_notes ?? '')} />
        </div>
      )}
    </li>
  );
}

function EnquiryCard({ q, onChanged }: { q: Enquiry; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const r = useRecord('bst_enquiries', q.id, q.status, q.internal_notes, onChanged);
  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        <div>
          <p className="font-bold">{q.name} <Badge tone={tone(q.status)}>{STATUS_LABEL[q.status]}</Badge> <Badge>{TYPE_LABEL[q.enquiry_type] ?? q.enquiry_type}</Badge></p>
          <p className="line-clamp-1 text-sm text-muted">{q.message}</p>
          <p className="text-xs text-muted">{formatDateTime(q.created_at)}</p>
        </div>
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {open && (
        <div className="mt-4 text-sm">
          <p><span className="font-semibold">Contact:</span> <ContactLink contact={q.contact} /></p>
          {q.branch && <p className="mt-1"><span className="font-semibold">Preferred branch:</span> {q.branch.name}</p>}
          <p className="mt-2 whitespace-pre-line rounded-xl bg-crumb p-3">{q.message}</p>
          <Controls r={r} notesChanged={r.n !== (q.internal_notes ?? '')} />
        </div>
      )}
    </li>
  );
}
