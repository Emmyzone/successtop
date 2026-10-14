import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useData } from '../hooks/useData';
import { formatDate } from '../lib/format';
import { ErrorBox, Spinner } from '../components/States';
import { adminError, run } from './db';
import { Badge, PageHeader, useFlash } from './ui';

interface Member { id: string; email: string; full_name: string | null; role: 'admin' | 'staff'; is_active: boolean; created_at: string }

export default function Staff() {
  const { session } = useAuth();
  const { data, loading, error, reload } = useData(() => run<Member[]>(supabase.rpc('bst_list_staff') as any));
  const [err, setErr] = useState<string | null>(null);
  const { flash, flashNode } = useFlash();

  async function update(m: Member, patch: Partial<Pick<Member, 'role' | 'is_active'>>, msg: string) {
    setErr(null);
    try { await run(supabase.from('bst_profiles').update(patch).eq('id', m.id) as any); flash(msg); reload(); }
    catch (e) { setErr(adminError(e)); }
  }

  return (
    <>
      <PageHeader title="Staff" hint="Staff can manage products and handle orders and enquiries. Only administrators can change the rest." />
      <div className="mb-6 rounded-2xl border border-line bg-crumb/60 p-4 text-sm">
        <p className="font-semibold">Adding a new staff member</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>In the Supabase dashboard open Authentication, then Users, then Add user (tick Auto Confirm User).</li>
          <li>Come back here and press Refresh. They appear below as inactive.</li>
          <li>Press Activate to let them in.</li>
        </ol>
        <button className="btn-outline mt-3 !px-4 !py-2" onClick={reload}>Refresh</button>
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {err && <ErrorBox message={err} />}
      {data && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {data.map((m) => {
            const me = m.id === session?.user.id;
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{m.email} {me && <span className="text-xs text-muted">(you)</span>}</p>
                  <p className="text-xs text-muted">Added {formatDate(m.created_at)}</p>
                  <div className="mt-1 flex gap-1.5"><Badge tone={m.role === 'admin' ? 'blue' : 'gray'}>{m.role === 'admin' ? 'Administrator' : 'Staff'}</Badge><Badge tone={m.is_active ? 'green' : 'amber'}>{m.is_active ? 'Active' : 'Not active'}</Badge></div>
                </div>
                {me ? <p className="text-xs text-muted">You cannot change your own account.</p> : (
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-outline !px-4 !py-2" onClick={() => update(m, { is_active: !m.is_active }, m.is_active ? 'Account deactivated' : 'Account activated')}>{m.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn-outline !px-4 !py-2" onClick={() => { if (m.role === 'staff' && !window.confirm(`Make ${m.email} an administrator? They will be able to change everything on the site.`)) return; update(m, { role: m.role === 'admin' ? 'staff' : 'admin' }, 'Role updated'); }}>{m.role === 'admin' ? 'Make staff' : 'Make administrator'}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {flashNode}
    </>
  );
}
