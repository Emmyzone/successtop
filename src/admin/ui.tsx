import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, ImagePlus, Trash2, X } from 'lucide-react';
import { ASSET_BUCKET, PRODUCT_BUCKET, publicImageUrl, supabase } from '../lib/supabase';
import { adminError } from './db';
import { ErrorBox } from '../components/States';

export function PageHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {hint && <p className="mt-1 max-w-2xl text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input type="checkbox" className="h-4 w-4 accent-[#7A4A2A]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-900',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Shows a short success message that disappears on its own. */
export function useFlash() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div role="status" className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg">
      <CheckCircle2 className="h-4 w-4 text-wheat" aria-hidden /> {msg}
    </div>
  ) : null;
  return { flash: setMsg, flashNode: node };
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-crumb" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <ErrorBox message={message} /> : null;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

/** Uploads one image to a public bucket and hands back its storage path. */
export function ImageUpload({
  value,
  onChange,
  folder,
  site = false,
  label = 'Image',
}: {
  value: string | null;
  onChange: (path: string) => void;
  folder: string;
  site?: boolean; // true = site-assets bucket (admin only, allows SVG)
  label?: string;
}) {
  const bucket = site ? ASSET_BUCKET : PRODUCT_BUCKET;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const url = publicImageUrl(bucket, value);

  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    const allowed = site ? ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'] : ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return setErr(`Use a ${site ? 'JPG, PNG, WebP or SVG' : 'JPG, PNG or WebP'} image.`);
    if (file.size > 5 * 1024 * 1024) return setErr('That image is over 5 MB. Please use a smaller one.');
    setBusy(true);
    const path = `${folder}/${crypto.randomUUID()}.${EXT[file.type]}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false });
    setBusy(false);
    if (error) return setErr(adminError(error));
    onChange(path);
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-crumb">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-wheat" aria-hidden />}
        </div>
        <div className="space-y-2">
          <label className="btn-outline cursor-pointer !px-4 !py-2">
            {busy ? 'Uploading…' : url ? 'Replace image' : 'Choose image'}
            <input type="file" accept={site ? 'image/jpeg,image/png,image/webp,image/svg+xml' : 'image/jpeg,image/png,image/webp'} className="sr-only" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {url && (
            <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 text-sm text-red-700 hover:underline">
              <Trash2 className="h-4 w-4" aria-hidden /> Remove
            </button>
          )}
          <p className="text-xs text-muted">Max 5 MB. Photos under 1 MB load fastest.</p>
        </div>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
