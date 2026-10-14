import { useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { BarChart3, Building2, FolderTree, Inbox, LogOut, Menu, Package, Settings2, Tag, Users, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/States';
import { supabaseConfigured } from '../lib/supabase';

const NAV = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true, adminOnly: false },
  { to: '/admin/inbox', label: 'Orders & enquiries', icon: Inbox, adminOnly: false },
  { to: '/admin/products', label: 'Products', icon: Package, adminOnly: false },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, adminOnly: true },
  { to: '/admin/promotions', label: 'Offers', icon: Tag, adminOnly: true },
  { to: '/admin/branches', label: 'Branches', icon: Building2, adminOnly: true },
  { to: '/admin/settings', label: 'Site text & images', icon: Settings2, adminOnly: true },
  { to: '/admin/staff', label: 'Staff', icon: Users, adminOnly: true },
];

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-line bg-crumb/50 p-8 text-center">
        <h1 className="text-lg font-bold">Administrators only</h1>
        <p className="mt-2 text-sm text-muted">Your staff account cannot open this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function AdminLayout() {
  const { session, profile, loading, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const head = <Helmet><title>Admin | SuccessTop</title><meta name="robots" content="noindex,nofollow" /></Helmet>;

  if (!supabaseConfigured) {
    return <div className="container-page py-20 text-center">{head}<p>The website is not connected to Supabase yet. Add the two VITE_ variables and restart.</p></div>;
  }
  if (loading) return <>{head}<Spinner label="Checking your account" /></>;
  if (!session) return <Navigate to="/admin/login" replace />;

  if (!profile?.is_active) {
    return (
      <div className="container-page max-w-md py-20 text-center">
        {head}
        <h1 className="text-2xl font-extrabold">Waiting for approval</h1>
        <p className="mt-3 text-sm text-muted">
          You are signed in, but your account has not been activated yet. Ask the main administrator to activate it, then sign in again.
        </p>
        <button onClick={signOut} className="btn-outline mt-6">Sign out</button>
      </div>
    );
  }

  const items = NAV.filter((n) => isAdmin || !n.adminOnly);
  const links = (
    <ul className="space-y-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-crumb text-crust' : 'hover:bg-crumb'}`}>
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-[#FCFAF6]">
      {head}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 hover:bg-crumb" aria-label="Toggle menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        <span className="font-display font-extrabold text-crust">Admin</span>
        <span className="w-9" />
      </header>
      {open && <nav className="border-b border-line bg-white p-3 lg:hidden" aria-label="Admin">{links}</nav>}

      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white p-4 lg:flex">
          <Link to="/admin" className="mb-6 px-3 font-display text-xl font-extrabold text-crust">SuccessTop</Link>
          <nav aria-label="Admin" className="flex-1">{links}</nav>
          <div className="space-y-2 border-t border-line pt-4 text-sm">
            <p className="px-3 text-muted">{profile.full_name || session.user.email}<br /><span className="text-xs">{isAdmin ? 'Administrator' : 'Staff'}</span></p>
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-crumb"><ExternalLink className="h-4 w-4" /> View website</a>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-crumb"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-8"><Outlet /></main>
      </div>
      <div className="border-t border-line bg-white p-3 text-center text-sm lg:hidden">
        <button onClick={signOut} className="font-semibold text-crust">Sign out</button>
      </div>
    </div>
  );
}
