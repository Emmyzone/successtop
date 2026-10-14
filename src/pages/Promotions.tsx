import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import SmartImage from '../components/SmartImage';
import { EmptyState, ErrorBox, Spinner } from '../components/States';
import { useData } from '../hooks/useData';
import { fetchPromotions } from '../lib/api';
import { PRODUCT_BUCKET, publicImageUrl } from '../lib/supabase';
import { formatDate, naira } from '../lib/format';

export default function Promotions() {
  const { data, loading, error, reload } = useData(fetchPromotions);

  return (
    <div className="container-page py-10">
      <Seo title="Special offers" description="Current offers and promotions from SuccessTop." />
      <h1 className="text-4xl font-extrabold">Special offers</h1>
      <p className="mt-2 max-w-2xl text-muted">Offers shown here are running right now. Expired offers disappear automatically.</p>

      <div className="mt-8">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No offers right now" action={<Link to="/products" className="btn-primary">Browse the menu</Link>}>
            Check back soon, or follow our WhatsApp conversations for updates.
          </EmptyState>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {data.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                {p.image_path && <SmartImage src={publicImageUrl(PRODUCT_BUCKET, p.image_path)} alt={p.title} className="aspect-[16/9] w-full" />}
                <div className="p-6">
                  <h2 className="text-2xl font-extrabold">{p.title}</h2>
                  {p.description && <p className="mt-2 text-muted">{p.description}</p>}
                  <p className="mt-4 font-bold text-crust">
                    {p.promo_price != null && <>Promotional price: {naira(p.promo_price)}. </>}
                    {p.discount_percent != null && <>{p.discount_percent}% off. </>}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Valid {formatDate(p.starts_at)} to {formatDate(p.ends_at)}
                    {p.product && <> | Applies to {p.product.name}</>}
                    {p.category && <> | Category: {p.category.name}</>}
                  </p>
                  <p className="mt-3 text-xs text-muted">Confirm the final price with our staff when you order on WhatsApp.</p>
                  <Link to={p.category ? `/products?category=${p.category.slug}` : '/products'} className="btn-primary mt-5">Shop now</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
