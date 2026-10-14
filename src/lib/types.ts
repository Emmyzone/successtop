export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Variant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  category: { id: string; name: string; slug: string } | null;
  base_price: number;
  compare_at_price: number | null;
  image_path: string | null;
  image_alt: string | null;
  gallery: { path: string; alt?: string }[];
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  variants: Variant[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  whatsapp_number: string | null;
  opening_hours: string | null;
  directions_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  product_id: string | null;
  category_id: string | null;
  discount_percent: number | null;
  promo_price: number | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  product: { name: string } | null;
  category: { name: string; slug: string } | null;
}

export type Settings = Record<string, string>;

export interface CartItem {
  key: string; // productId:variantId
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  imagePath: string | null;
}

export type Fulfilment = 'pickup' | 'delivery' | 'undecided';

export interface OrderDetails {
  customerName?: string;
  customerContact?: string;
  branchId?: string | null;
  branchName?: string;
  fulfilment?: Fulfilment;
  notes?: string;
}
