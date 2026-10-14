import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, MessageCircle, Package, PartyPopper } from 'lucide-react';
import Seo from '../components/Seo';
import SmartImage from '../components/SmartImage';
import ProductCard from '../components/ProductCard';
import { EmptyState, SkeletonGrid } from '../components/States';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../hooks/useData';
import { fetchCategories, fetchProducts, fetchPromotions } from '../lib/api';
import { ASSET_BUCKET, PRODUCT_BUCKET, publicImageUrl } from '../lib/supabase';
import { GENERAL_ORDER_MESSAGE, waLink } from '../lib/whatsapp';
import { formatDate, naira } from '../lib/format';

export default function Home() {
  const { settings, branches, whatsappNumber } = useSettings();
  const products = useData(fetchProducts);
  const categories = useData(fetchCategories);
  const promos = useData(fetchPromotions);

  const heroImage = publicImageUrl(ASSET_BUCKET, settings.hero_image_path);
  const orderLink = waLink(whatsappNumber, GENERAL_ORDER_MESSAGE);
  const featured = (products.data ?? []).filter((p) => p.is_featured).slice(0, 8);
  const activePromos = promos.data ?? [];

  return (
    <>
      <Seo />

      {/* Hero */}
      <section className="container-page grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <p className="text-sm font-semibold text-crust">{settings.tagline} in Ibadan</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">{settings.hero_headline}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{settings.hero_text}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">Explore our products</Link>
            <a href={orderLink} target="_blank" rel="noopener noreferrer" className="btn-gold"><MessageCircle className="h-4 w-4" aria-hidden /> Order now</a>
          </div>
          <p className="mt-4 text-sm text-muted">Delivery and payment are arranged with our staff on WhatsApp.</p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="arch aspect-[4/5] w-full bg-wheat-soft ring-8 ring-crumb">
            {heroImage ? (
              <SmartImage src={heroImage} alt={settings.hero_image_alt} className="h-full w-full" priority />
            ) : (
              <div className="flex h-full flex-col items-center justify-end pb-12 text-center">
                <span className="font-display text-5xl font-extrabold text-crust">{settings.business_name}</span>
                <span className="mt-2 text-sm font-semibold text-crust/80">{settings.tagline}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container-page py-10" aria-labelledby="featured-h">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="featured-h" className="text-3xl font-extrabold">Featured from our ovens</h2>
          <Link to="/products" className="hidden items-center gap-1 text-sm font-semibold text-crust sm:flex">See the full menu <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {products.loading ? (
          <SkeletonGrid count={4} />
        ) : featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <EmptyState title="Our menu is on its way" action={<Link to="/products" className="btn-primary">View the full menu</Link>}>
            Featured items will appear here. In the meantime, browse everything we bake.
          </EmptyState>
        )}
      </section>

      {/* Categories */}
      <section className="container-page py-10" aria-labelledby="cat-h">
        <h2 id="cat-h" className="text-3xl font-extrabold">What we bake and cook</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(categories.data ?? []).map((c) => (
            <li key={c.id}>
              <Link to={`/products?category=${c.slug}`} className="group block text-center">
                <div className="arch mx-auto aspect-[3/4] w-full bg-crumb">
                  <SmartImage src={publicImageUrl(PRODUCT_BUCKET, c.image_path)} alt={c.name} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
                </div>
                <span className="mt-3 block font-display text-lg font-bold group-hover:text-crust">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Offers */}
      {activePromos.length > 0 && (
        <section className="container-page py-10" aria-labelledby="offers-h">
          <h2 id="offers-h" className="text-3xl font-extrabold">Special offers</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {activePromos.slice(0, 2).map((p) => (
              <Link key={p.id} to="/promotions" className="flex overflow-hidden rounded-2xl bg-wheat-soft">
                {p.image_path && <SmartImage src={publicImageUrl(PRODUCT_BUCKET, p.image_path)} alt={p.title} className="hidden h-full w-36 shrink-0 sm:block" />}
                <div className="p-5">
                  <h3 className="text-xl font-bold">{p.title}</h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink/80">{p.description}</p>}
                  <p className="mt-3 text-sm font-semibold text-crust">
                    {p.promo_price != null ? `Now ${naira(p.promo_price)}` : p.discount_percent != null ? `${p.discount_percent}% off` : 'Limited offer'}
                    {' '}until {formatDate(p.ends_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reseller + catering */}
      <section className="mt-10 bg-crumb py-14">
        <div className="container-page grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-7">
            <Package className="h-7 w-7 text-crust" aria-hidden />
            <h2 className="mt-4 text-2xl font-extrabold">{settings.bulk_title}</h2>
            <p className="mt-2 text-muted">{settings.bulk_text}</p>
            <Link to="/contact" className="btn-outline mt-5">Ask about bulk bread</Link>
          </div>
          <div className="rounded-2xl bg-white p-7">
            <PartyPopper className="h-7 w-7 text-crust" aria-hidden />
            <h2 className="mt-4 text-2xl font-extrabold">{settings.catering_title}</h2>
            <p className="mt-2 text-muted">{settings.catering_text}</p>
            <Link to="/contact" className="btn-outline mt-5">Plan an order with us</Link>
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="container-page py-14" aria-labelledby="br-h">
        <h2 id="br-h" className="text-3xl font-extrabold">Find us in Ibadan</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {branches.map((b) => (
            <div key={b.id} className="rounded-xl border border-line p-5">
              <h3 className="text-xl font-bold">{b.name}</h3>
              <p className="mt-2 flex gap-2 text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-crust" aria-hidden />{b.address}</p>
              {b.opening_hours && <p className="mt-1 flex gap-2 text-muted"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-crust" aria-hidden />{b.opening_hours}</p>}
            </div>
          ))}
        </div>
        <Link to="/branches" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-crust">Branch details <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      </section>

      {/* WhatsApp CTA */}
      <section className="container-page pb-6">
        <div className="rounded-2xl bg-crust px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-extrabold">Ready to order?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">{settings.contact_callout}</p>
          <a href={orderLink} target="_blank" rel="noopener noreferrer" className="btn-gold mt-6"><MessageCircle className="h-4 w-4" aria-hidden /> Chat with us on WhatsApp</a>
        </div>
      </section>
    </>
  );
}
