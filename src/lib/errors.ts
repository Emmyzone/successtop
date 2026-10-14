export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
  if (/rate_limited/.test(msg)) return 'Too many requests right now. Please wait a minute and try again.';
  if (/product_unavailable/.test(msg)) return 'One of the items is no longer available. Please refresh the menu.';
  if (/variant_required/.test(msg)) return 'Please choose a size or option for every item.';
  if (/invalid_items|invalid_quantity/.test(msg)) return 'Something is wrong with the items in your order.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Could not reach the server. Check your internet connection and try again.';
  return 'Something went wrong. Please try again.';
}
