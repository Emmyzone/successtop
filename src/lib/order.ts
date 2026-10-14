import { supabase } from './supabase';
import { friendlyError } from './errors';
import type { CartItem, OrderDetails } from './types';

/** Saves an order request on the website (not an order confirmation). Prices are re-checked by the database. */
export async function recordOrderIntent(items: CartItem[], d: OrderDetails): Promise<{ ref: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('bst_submit_order_intent', {
      p_customer_name: d.customerName?.trim() || null,
      p_customer_contact: d.customerContact?.trim() || null,
      p_branch_id: d.branchId || null,
      p_fulfilment: d.fulfilment || 'undecided',
      p_notes: d.notes?.trim() || null,
      p_items: items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.quantity })),
    });
    if (error) throw error;
    return { ref: data as string, error: null };
  } catch (e) {
    return { ref: null, error: friendlyError(e) };
  }
}
