import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { recordOrderIntent } from '../lib/order';
import { buildOrderMessage, waLink } from '../lib/whatsapp';
import type { CartItem, OrderDetails } from '../lib/types';

export interface OrderNotice {
  tone: 'ok' | 'warn';
  text: string;
  link?: string;
}

/**
 * Records the order request (when possible), then opens WhatsApp with the message.
 * We never claim an order is confirmed or paid: only staff can confirm that on WhatsApp.
 */
export function useWhatsAppOrder() {
  const { whatsappNumber } = useSettings();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<OrderNotice | null>(null);

  async function order(items: CartItem[], details: OrderDetails): Promise<boolean> {
    if (busy || items.length === 0) return false;
    setBusy(true);
    setNotice(null);

    // Open the tab right away so mobile browsers do not block it after the network call.
    const tab = window.open('', '_blank');
    const { ref, error } = await recordOrderIntent(items, details);
    const url = waLink(whatsappNumber, buildOrderMessage(items, details, ref));

    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    }

    const base = ref
      ? `Your order request was saved on our website as ${ref}. WhatsApp should now be open. Our staff confirm availability, delivery and payment with you there, so your order is not confirmed yet.`
      : `We could not save this request on the website (${error}). You can still send it to us on WhatsApp.`;
    setNotice({
      tone: ref ? 'ok' : 'warn',
      text: tab ? base : `${base} Your browser blocked the WhatsApp window, so tap the button below to open it.`,
      link: tab ? undefined : url,
    });
    setBusy(false);
    return Boolean(ref);
  }

  return { order, busy, notice, clearNotice: () => setNotice(null) };
}
