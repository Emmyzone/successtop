import { clearCache } from '../lib/api';

interface DbResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/** Unwraps a Supabase result; throws a readable error on failure. */
export async function run<T>(p: PromiseLike<DbResult<T>>): Promise<T> {
  const res = await p;
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data as T;
}

/** Call after any change so the public site does not show stale data. */
export const publish = () => clearCache();

export function adminError(e: unknown): string {
  const err = e as { message?: string; code?: string } | null;
  const msg = err?.message ?? '';
  if (err?.code === '23505' || /duplicate key/i.test(msg)) return 'That name or web address (slug) is already used. Choose a different one.';
  if (err?.code === '23503' || /foreign key/i.test(msg)) return 'This is still being used by something else. Remove or move those items first.';
  if (err?.code === '42501' || /row-level security|permission denied|not_allowed/i.test(msg)) return 'Your account is not allowed to do that.';
  if (/check constraint/i.test(msg)) return 'One of the values is not valid. Check the form and try again.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Could not reach the server. Check your internet connection.';
  if (/JWT|expired/i.test(msg)) return 'Your session has expired. Please sign in again.';
  return msg ? `Something went wrong: ${msg}` : 'Something went wrong. Please try again.';
}

export const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export const fromLocalInput = (v: string): string => new Date(v).toISOString();

export const STATUSES = ['new', 'contacted', 'awaiting_confirmation', 'confirmed', 'completed', 'cancelled'] as const;
export const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
