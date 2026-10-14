const numberFmt = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const naira = (n: number): string => '₦' + numberFmt.format(n);

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium' });

export const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
