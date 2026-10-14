import { useMemo, useState } from 'react';
import { Minus, Plus, ShoppingBag, MessageCircle } from 'lucide-react';
import type { Product } from '../lib/types';
import { naira } from '../lib/format';
import { PRODUCT_BUCKET, publicImageUrl } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useWhatsAppOrder } from '../hooks/useWhatsAppOrder';
import SmartImage from './SmartImage';

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { order, busy, notice } = useWhatsAppOrder();
  const hasVariants = product.variants.length > 0;
  const firstAvailable = product.variants.find((v) => v.is_available);
  const [variantId, setVariantId] = useState<string>(firstAvailable?.id ?? product.variants[0]?.id ?? '');
  const [qty, setQty] = useState(1);

  const variant = useMemo(() => product.variants.find((v) => v.id === variantId) ?? null, [product.variants, variantId]);
  const price = hasVariants ? variant?.price ?? 0 : product.base_price;
  const available = product.is_available && (!hasVariants || Boolean(variant?.is_available));
  const showCompare = !hasVariants && product.compare_at_price != null && product.compare_at_price > price;

  const cartLine = () => ({
    productId: product.id,
    variantId: hasVariants ? variant?.id ?? null : null,
    name: product.name,
    variantName: hasVariants ? variant?.name ?? null : null,
    unitPrice: price,
    imagePath: product.image_path,
  });

  const add = () => {
    if (!available) return;
    addItem(cartLine(), qty);
  };

  const orderNow = () => {
    if (!available) return;
    void order([{ ...cartLine(), key: `${product.id}:${variantId || 'base'}`, quantity: qty }], {});
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative">
        <SmartImage
          src={publicImageUrl(PRODUCT_BUCKET, product.image_path)}
          alt={product.image_alt || product.name}
          className={`aspect-[4/3] w-full ${available ? '' : 'opacity-50 grayscale'}`}
        />
        {!available && (
          <span className="absolute left-3 top-3 rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-white">Unavailable</span>
        )}
        {product.category && (
          <span className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-medium text-crust">{product.category.name}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-bold leading-snug">{product.name}</h3>
          {product.description && <p className="mt-1 line-clamp-3 text-sm text-muted">{product.description}</p>}
        </div>

        {hasVariants && (
          <div>
            <label htmlFor={`v-${product.id}`} className="label">Size / option</label>
            <select id={`v-${product.id}`} className="field" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {product.variants.map((v) => (
                <option key={v.id} value={v.id} disabled={!v.is_available}>
                  {v.name} - {naira(v.price)}{v.is_available ? '' : ' (unavailable)'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-crust">{naira(price)}</span>
          {showCompare && <span className="text-sm text-muted line-through">{naira(product.compare_at_price!)}</span>}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-line" role="group" aria-label={`Quantity for ${product.name}`}>
            <button type="button" className="p-2.5 disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || !available} aria-label="Decrease quantity">
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
            <button type="button" className="p-2.5 disabled:opacity-40" onClick={() => setQty((q) => Math.min(100, q + 1))} disabled={qty >= 100 || !available} aria-label="Increase quantity">
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <button type="button" className="btn-primary flex-1" onClick={add} disabled={!available}>
            <ShoppingBag className="h-4 w-4" aria-hidden /> Add to cart
          </button>
        </div>

        <button type="button" className="btn-outline" onClick={orderNow} disabled={!available || busy}>
          <MessageCircle className="h-4 w-4" aria-hidden /> {busy ? 'Opening WhatsApp' : 'Order now on WhatsApp'}
        </button>

        {notice && (
          <p role="status" className={`rounded-lg p-3 text-xs ${notice.tone === 'ok' ? 'bg-crumb text-ink' : 'bg-amber-50 text-amber-900'}`}>
            {notice.text}
            {notice.link && (
              <a href={notice.link} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold underline">Open WhatsApp</a>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
