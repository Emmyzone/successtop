import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Minus, Plus, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useWhatsAppOrder } from '../hooks/useWhatsAppOrder';
import { naira } from '../lib/format';
import { PRODUCT_BUCKET, publicImageUrl } from '../lib/supabase';
import type { Fulfilment } from '../lib/types';
import SmartImage from './SmartImage';

export default function CartDrawer() {
  const { items, total, isOpen, closeCart, setQuantity, removeItem, clear } = useCart();
  const { branches } = useSettings();
  const { order, busy, notice, clearNotice } = useWhatsAppOrder();
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [fulfilment, setFulfilment] = useState<Fulfilment>('undecided');
  const [notes, setNotes] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const send = async () => {
    const branch = branches.find((b) => b.id === branchId);
    const ok = await order(items, {
      customerName: name,
      branchId: branch && !branch.id.startsWith('fallback') ? branch.id : null,
      branchName: branch?.name,
      fulfilment,
      notes,
    });
    if (ok) {
      clear();
      setNotes('');
    }
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="absolute inset-0 bg-ink/50" onClick={closeCart} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">Your cart</h2>
          <button ref={closeRef} onClick={closeCart} className="rounded-lg p-2 hover:bg-crumb" aria-label="Close cart">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-semibold">{notice ? 'Order request sent' : 'Your cart is empty'}</p>
              {!notice && <p className="mt-1 text-sm text-muted">Pick something from the menu to start your order.</p>}
              <Link to="/products" onClick={closeCart} className="btn-primary mt-5">Browse the menu</Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.key} className="flex gap-3">
                  <SmartImage src={publicImageUrl(PRODUCT_BUCKET, i.imagePath)} alt={i.name} className="h-16 w-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{i.name}</p>
                    {i.variantName && <p className="text-xs text-muted">{i.variantName}</p>}
                    <p className="text-sm text-muted">{naira(i.unitPrice)} each</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-lg border border-line">
                        <button className="p-1.5" onClick={() => setQuantity(i.key, i.quantity - 1)} disabled={i.quantity <= 1} aria-label={`Decrease ${i.name}`}><Minus className="h-3.5 w-3.5" aria-hidden /></button>
                        <span className="w-7 text-center text-sm font-semibold">{i.quantity}</span>
                        <button className="p-1.5" onClick={() => setQuantity(i.key, i.quantity + 1)} aria-label={`Increase ${i.name}`}><Plus className="h-3.5 w-3.5" aria-hidden /></button>
                      </div>
                      <button className="p-1.5 text-muted hover:text-red-700" onClick={() => removeItem(i.key)} aria-label={`Remove ${i.name}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
                    </div>
                  </div>
                  <p className="font-bold">{naira(i.unitPrice * i.quantity)}</p>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <form className="mt-6 space-y-4 border-t border-line pt-5" onSubmit={(e) => { e.preventDefault(); void send(); }}>
              <p className="text-sm text-muted">These details are optional. They go into your WhatsApp message and are not saved on your device.</p>
              <div>
                <label className="label" htmlFor="c-name">Your name</label>
                <input id="c-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="c-branch">Preferred branch</label>
                  <select id="c-branch" className="field" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">No preference</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="c-ful">Pickup or delivery</label>
                  <select id="c-ful" className="field" value={fulfilment} onChange={(e) => setFulfilment(e.target.value as Fulfilment)}>
                    <option value="undecided">Not sure yet</option>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="c-notes">Notes for the bakery</label>
                <textarea id="c-notes" className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
            </form>
          )}

          {notice && (
            <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${notice.tone === 'ok' ? 'bg-crumb text-ink' : 'bg-amber-50 text-amber-900'}`}>
              {notice.text}
              {notice.link && <a href={notice.link} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold underline">Open WhatsApp</a>}
            </p>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Estimated product total</span>
              <span className="text-xl font-extrabold text-crust">{naira(total)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Delivery arrangements and payment are agreed with our staff on WhatsApp.</p>
            <button className="btn-primary mt-3 w-full" onClick={() => void send()} disabled={busy}>
              <MessageCircle className="h-4 w-4" aria-hidden /> {busy ? 'Opening WhatsApp' : 'Send order on WhatsApp'}
            </button>
            <button className="mt-2 w-full text-center text-sm text-muted underline" onClick={() => { closeCart(); clearNotice(); }}>Continue shopping</button>
          </div>
        )}
      </aside>
    </div>
  );
}
