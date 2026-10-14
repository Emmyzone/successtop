import type { CartItem, OrderDetails } from './types';
import { naira } from './format';

/** Turns a Nigerian number like 07067877868 into digits-only international form 2347067877868. */
export function toWhatsAppNumber(input: string): string {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return '234' + digits.slice(1);
  if (digits.length === 10) return '234' + digits;
  return digits;
}

export function waLink(number: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(number)}?text=${encodeURIComponent(message)}`;
}

export function buildOrderMessage(items: CartItem[], d: OrderDetails, reference?: string | null): string {
  const lines: string[] = ['Hello SuccessTop, I would like to place an order.', '', 'Items:'];
  let total = 0;
  for (const i of items) {
    const sub = i.unitPrice * i.quantity;
    total += sub;
    const variant = i.variantName ? ` (${i.variantName})` : '';
    lines.push(`- ${i.name}${variant} x ${i.quantity} at ${naira(i.unitPrice)} = ${naira(sub)}`);
  }
  lines.push('', `Estimated product total: ${naira(total)}`, '');
  if (d.branchName) lines.push(`Preferred branch: ${d.branchName}`);
  if (d.fulfilment && d.fulfilment !== 'undecided') lines.push(`Fulfilment: ${d.fulfilment === 'pickup' ? 'Pickup' : 'Delivery'}`);
  if (d.customerName) lines.push(`Customer name: ${d.customerName}`);
  if (d.notes) lines.push(`Additional notes: ${d.notes}`);
  if (reference) lines.push(`Website reference: ${reference}`);
  lines.push('', 'Please confirm availability and let me know the delivery arrangements and payment details.', '', 'Thank you.');
  return lines.join('\n');
}

export const GENERAL_ORDER_MESSAGE = 'Hello SuccessTop, I would like to place an order.';
