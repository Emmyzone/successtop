import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Phone, ShoppingBag, X, Mail, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { ASSET_BUCKET, publicImageUrl } from '../lib/supabase';
import { GENERAL_ORDER_MESSAGE, waLink } from '../lib/whatsapp';
import CartDrawer from './CartDrawer';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Menu' },
  { to: '/promotions', label: 'Offers' },
  { to: '/branches', label: 'Branches' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

function Wordmark() {
  const { settings } = useSettings();
  const logo = publicImageUrl(ASSET_BUCKET, settings.logo_path);
  if (logo) return <img src={logo} alt={settings.business_name} className="h-10 w-auto" />;
  return <span className="font-display text-xl font-extrabold tracking-tight text-crust">{settings.business_name}</span>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function Layout() {
  const { settings, branches, whatsappNumber, error } = useSettings();
  const { count, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);

  const orderLink = waLink(whatsappNumber, GENERAL_ORDER_MESSAGE);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label={`${settings.business_name} home`}><Wordmark /></Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-crumb text-crust' : 'text-ink hover:bg-crumb'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={openCart} className="relative rounded-xl p-2.5 hover:bg-crumb" aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}>
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-wheat px-1 text-xs font-bold text-ink">{count}</span>}
            </button>
            <a href={orderLink} target="_blank" rel="noopener noreferrer" className="btn-primary hidden sm:inline-flex">Order now</a>
            <button className="rounded-xl p-2.5 hover:bg-crumb lg:hidden" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label="Toggle menu">
              {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" className="border-t border-line bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
            <ul className="space-y-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => `block rounded-lg px-3 py-3 font-medium ${isActive ? 'bg-crumb text-crust' : ''}`}>{n.label}</NavLink>
                </li>
              ))}
            </ul>
            <a href={orderLink} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full">Order now on WhatsApp</a>
          </nav>
        )}
      </header>

      {error && (
        <div role="status" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">{error}</div>
      )}

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="mt-20 border-t border-line bg-crumb">
        <div className="container-page grid gap-10 py-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Wordmark />
            <p className="mt-3 text-sm text-muted">{settings.footer_text}</p>
          </div>
          <div>
            <h3 className="font-bold">Pages</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((n) => <li key={n.to}><Link to={n.to} className="text-muted hover:text-crust">{n.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-bold">Branches</h3>
            <ul className="mt-3 space-y-3 text-sm text-muted">
              {branches.map((b) => (
                <li key={b.id} className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-crust" aria-hidden /><span><span className="font-semibold text-ink">{b.name}</span><br />{b.address}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold">Contact</h3>
            <ul className="mt-3 space-y-3 text-sm">
              <li><a className="flex items-center gap-2 text-muted hover:text-crust" href={`tel:${settings.phone.replace(/\s/g, '')}`}><Phone className="h-4 w-4 text-crust" aria-hidden />{settings.phone}</a></li>
              <li><a className="flex items-center gap-2 text-muted hover:text-crust" href={`mailto:${settings.email}`}><Mail className="h-4 w-4 text-crust" aria-hidden />{settings.email}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-muted">&copy; {new Date().getFullYear()} {settings.business_name}. All rights reserved.</div>
      </footer>

      <CartDrawer />
    </div>
  );
}
