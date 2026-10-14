import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../hooks/useData';
import { useAuth } from '../lib/auth';
import { Spinner, ErrorBox } from '../components/States';
import { PageHeader } from './ui';

const count = async (table: string, filter?: (q: any) => any) => {
  let q: any = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count: c, error } = await q;
  if (error) throw error;
  return (c ?? 0) as number;
};

export default function Overview() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useData(async () => {
    const [orders, enquiries, products, hidden] = await Promise.all([
      count('bst_order_intents', (q) => q.eq('status', 'new')),
      count('bst_enquiries', (q) => q.eq('status', 'new')),
      count('bst_products'),
      count('bst_products', (q) => q.eq('is_available', false)),
    ]);
    return { orders, enquiries, products, hidden };
  });

  const cards = data && [
    { label: 'New order requests', value: data.orders, to: '/admin/inbox' },
    { label: 'New enquiries', value: data.enquiries, to: '/admin/inbox?tab=enquiries' },
    { label: 'Products', value: data.products, to: '/admin/products' },
    { label: 'Marked unavailable', value: data.hidden, to: '/admin/products' },
  ];

  return (
    <>
      <PageHeader title={`Welcome${profile?.full_name ? ', ' + profile.full_name : ''}`} hint="A quick look at what needs attention." />
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {cards && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} className="rounded-2xl border border-line bg-white p-5 hover:border-crust/40">
              <p className="text-3xl font-extrabold text-crust">{c.value}</p>
              <p className="mt-1 text-sm text-muted">{c.label}</p>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-8 max-w-xl text-sm text-muted">
        A request on this site means a customer asked to order. It is not confirmed or paid until you agree it with them on WhatsApp.
      </p>
    </>
  );
}
