import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorBox, SkeletonGrid } from '../components/States';
import { useData } from '../hooks/useData';
import { fetchCategories, fetchProducts } from '../lib/api';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const products = useData(fetchProducts);
  const categories = useData(fetchCategories);
  const active = params.get('category') ?? '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data ?? []).filter((p) => {
      if (active && p.category?.slug !== active) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products.data, active, query]);

  const pick = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('category', slug);
    else next.delete('category');
    setParams(next, { replace: true });
  };

  const chip = (selected: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold ${selected ? 'border-crust bg-crust text-white' : 'border-line bg-white text-ink hover:bg-crumb'}`;

  return (
    <div className="container-page py-10">
      <Seo title="Menu" description="Browse bread, doughnuts, shawarma, puff-puff and pastries from SuccessTop in Ibadan. Order on WhatsApp." />
      <h1 className="text-4xl font-extrabold">Our menu</h1>
      <p className="mt-2 max-w-2xl text-muted">Add items to your cart or order a single item straight on WhatsApp. Our staff confirm availability, delivery and payment with you there.</p>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <button className={chip(!active)} onClick={() => pick('')} aria-pressed={!active}>All</button>
          {(categories.data ?? []).map((c) => (
            <button key={c.id} className={chip(active === c.slug)} onClick={() => pick(c.slug)} aria-pressed={active === c.slug}>{c.name}</button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <label htmlFor="search" className="sr-only">Search products by name</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="search" type="search" className="field pl-9" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="mt-8">
        {products.loading ? (
          <SkeletonGrid />
        ) : products.error ? (
          <ErrorBox message={products.error} onRetry={products.reload} />
        ) : filtered.length === 0 ? (
          (products.data ?? []).length === 0 ? (
            <EmptyState title="The menu is being prepared">Products will appear here as soon as they are added. Meanwhile, message us on WhatsApp to ask what is fresh today.</EmptyState>
          ) : (
            <EmptyState title="No matches" action={<button className="btn-outline" onClick={() => { setQuery(''); pick(''); }}>Clear filters</button>}>
              Nothing matches that search. Try another name or category.
            </EmptyState>
          )
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </div>
    </div>
  );
}
