import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem } from '../lib/types';

const STORAGE_KEY = 'bst_cart_v1';
const MAX_QTY = 100;

interface CartValue {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, 'key' | 'quantity'>, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartValue | null>(null);

function isCartItem(x: unknown): x is CartItem {
  const i = x as CartItem;
  return (
    !!i && typeof i.key === 'string' && typeof i.productId === 'string' && typeof i.name === 'string' &&
    typeof i.unitPrice === 'number' && i.unitPrice >= 0 && Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= MAX_QTY
  );
}

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);
  const [isOpen, setOpen] = useState(false);

  // Only product choices are stored. No personal details ever go into localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage may be unavailable (private mode); the cart still works for this visit */
    }
  }, [items]);

  const addItem = useCallback<CartValue['addItem']>((item, quantity) => {
    const key = `${item.productId}:${item.variantId ?? 'base'}`;
    setItems((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) => (p.key === key ? { ...p, unitPrice: item.unitPrice, quantity: Math.min(MAX_QTY, p.quantity + quantity) } : p));
      }
      return [...prev, { ...item, key, quantity: Math.min(MAX_QTY, Math.max(1, quantity)) }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev.map((p) => (p.key === key ? { ...p, quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(quantity) || 1)) } : p)),
    );
  }, []);

  const removeItem = useCallback((key: string) => setItems((prev) => prev.filter((p) => p.key !== key)), []);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      total: items.reduce((n, i) => n + i.unitPrice * i.quantity, 0),
      isOpen,
      openCart,
      closeCart,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, isOpen, openCart, closeCart, addItem, setQuantity, removeItem, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCart must be used inside CartProvider');
  return v;
}
