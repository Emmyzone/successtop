-- SuccessTop: Row Level Security and Storage
-- Default permission policy:
--   admin (main administrator): everything, including staff accounts and settings
--   staff: manage products, variants and images; view and update enquiries and order intents
--   public: read active/public content only; submit enquiries and order intents

alter table public.bst_profiles            enable row level security;
alter table public.bst_categories          enable row level security;
alter table public.bst_products            enable row level security;
alter table public.bst_product_variants    enable row level security;
alter table public.bst_branches            enable row level security;
alter table public.bst_promotions          enable row level security;
alter table public.bst_site_settings       enable row level security;
alter table public.bst_enquiries           enable row level security;
alter table public.bst_order_intents       enable row level security;
alter table public.bst_order_intent_items  enable row level security;

-- Explicit grants (RLS still decides what each role can actually do)
grant select on public.bst_categories, public.bst_products, public.bst_product_variants,
  public.bst_branches, public.bst_promotions, public.bst_site_settings to anon, authenticated;
grant insert on public.bst_enquiries to anon, authenticated;
grant select, insert, update, delete on
  public.bst_categories, public.bst_products, public.bst_product_variants, public.bst_branches,
  public.bst_promotions, public.bst_site_settings, public.bst_enquiries, public.bst_order_intents,
  public.bst_order_intent_items to authenticated;
grant select, update on public.bst_profiles to authenticated;

-- ---------- profiles ----------
drop policy if exists "bst profiles read own or admin" on public.bst_profiles;
create policy "bst profiles read own or admin" on public.bst_profiles
  for select to authenticated using (id = auth.uid() or public.bst_is_admin());

-- Only an admin can change roles or activate accounts, and never their own row
-- (so the last admin cannot lock themselves out or be demoted by mistake).
drop policy if exists "bst profiles admin update others" on public.bst_profiles;
create policy "bst profiles admin update others" on public.bst_profiles
  for update to authenticated
  using (public.bst_is_admin() and id <> auth.uid())
  with check (public.bst_is_admin() and id <> auth.uid());

-- ---------- categories ----------
drop policy if exists "bst categories public read" on public.bst_categories;
create policy "bst categories public read" on public.bst_categories
  for select using (is_active or public.bst_is_active_staff());
drop policy if exists "bst categories admin write" on public.bst_categories;
create policy "bst categories admin write" on public.bst_categories
  for all to authenticated using (public.bst_is_admin()) with check (public.bst_is_admin());

-- ---------- products ----------
-- Unavailable products stay visible (greyed out). Products in a deactivated category are hidden.
drop policy if exists "bst products public read" on public.bst_products;
create policy "bst products public read" on public.bst_products
  for select using (
    public.bst_is_active_staff()
    or category_id is null
    or exists (select 1 from public.bst_categories c where c.id = category_id and c.is_active)
  );
drop policy if exists "bst products staff write" on public.bst_products;
create policy "bst products staff write" on public.bst_products
  for all to authenticated using (public.bst_is_active_staff()) with check (public.bst_is_active_staff());

drop policy if exists "bst variants public read" on public.bst_product_variants;
create policy "bst variants public read" on public.bst_product_variants
  for select using (
    public.bst_is_active_staff()
    or exists (select 1 from public.bst_products p where p.id = product_id)
  );
drop policy if exists "bst variants staff write" on public.bst_product_variants;
create policy "bst variants staff write" on public.bst_product_variants
  for all to authenticated using (public.bst_is_active_staff()) with check (public.bst_is_active_staff());

-- ---------- branches ----------
drop policy if exists "bst branches public read" on public.bst_branches;
create policy "bst branches public read" on public.bst_branches
  for select using (is_active or public.bst_is_active_staff());
drop policy if exists "bst branches admin write" on public.bst_branches;
create policy "bst branches admin write" on public.bst_branches
  for all to authenticated using (public.bst_is_admin()) with check (public.bst_is_admin());

-- ---------- promotions ----------
drop policy if exists "bst promotions public read" on public.bst_promotions;
create policy "bst promotions public read" on public.bst_promotions
  for select using (
    (is_active and now() >= starts_at and now() <= ends_at) or public.bst_is_active_staff()
  );
drop policy if exists "bst promotions admin write" on public.bst_promotions;
create policy "bst promotions admin write" on public.bst_promotions
  for all to authenticated using (public.bst_is_admin()) with check (public.bst_is_admin());

-- ---------- site settings ----------
drop policy if exists "bst settings public read" on public.bst_site_settings;
create policy "bst settings public read" on public.bst_site_settings
  for select using (true);
drop policy if exists "bst settings admin write" on public.bst_site_settings;
create policy "bst settings admin write" on public.bst_site_settings
  for all to authenticated using (public.bst_is_admin()) with check (public.bst_is_admin());

-- ---------- enquiries ----------
-- The public can only INSERT a brand-new enquiry. They can never read, change or delete any.
drop policy if exists "bst enquiries public insert" on public.bst_enquiries;
create policy "bst enquiries public insert" on public.bst_enquiries
  for insert to anon, authenticated
  with check (status = 'new' and internal_notes is null);
drop policy if exists "bst enquiries staff read" on public.bst_enquiries;
create policy "bst enquiries staff read" on public.bst_enquiries
  for select to authenticated using (public.bst_is_active_staff());
drop policy if exists "bst enquiries staff update" on public.bst_enquiries;
create policy "bst enquiries staff update" on public.bst_enquiries
  for update to authenticated using (public.bst_is_active_staff()) with check (public.bst_is_active_staff());
drop policy if exists "bst enquiries admin delete" on public.bst_enquiries;
create policy "bst enquiries admin delete" on public.bst_enquiries
  for delete to authenticated using (public.bst_is_admin());

-- ---------- order intents (created only through bst_submit_order_intent) ----------
drop policy if exists "bst order intents staff read" on public.bst_order_intents;
create policy "bst order intents staff read" on public.bst_order_intents
  for select to authenticated using (public.bst_is_active_staff());
drop policy if exists "bst order intents staff update" on public.bst_order_intents;
create policy "bst order intents staff update" on public.bst_order_intents
  for update to authenticated using (public.bst_is_active_staff()) with check (public.bst_is_active_staff());
drop policy if exists "bst order intents admin delete" on public.bst_order_intents;
create policy "bst order intents admin delete" on public.bst_order_intents
  for delete to authenticated using (public.bst_is_admin());

drop policy if exists "bst order items staff read" on public.bst_order_intent_items;
create policy "bst order items staff read" on public.bst_order_intent_items
  for select to authenticated using (public.bst_is_active_staff());

-- ---------- Storage ----------
-- Two public-read buckets. Visitors can view images; only staff/admin can change them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('bst-product-images', 'bst-product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('bst-site-assets',    'bst-site-assets',    true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bst product images staff select" on storage.objects;
create policy "bst product images staff select" on storage.objects
  for select to authenticated using (bucket_id in ('bst-product-images', 'bst-site-assets') and public.bst_is_active_staff());

drop policy if exists "bst product images staff insert" on storage.objects;
create policy "bst product images staff insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'bst-product-images' and public.bst_is_active_staff());
drop policy if exists "bst product images staff update" on storage.objects;
create policy "bst product images staff update" on storage.objects
  for update to authenticated using (bucket_id = 'bst-product-images' and public.bst_is_active_staff());
drop policy if exists "bst product images staff delete" on storage.objects;
create policy "bst product images staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'bst-product-images' and public.bst_is_active_staff());

drop policy if exists "bst site assets admin insert" on storage.objects;
create policy "bst site assets admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'bst-site-assets' and public.bst_is_admin());
drop policy if exists "bst site assets admin update" on storage.objects;
create policy "bst site assets admin update" on storage.objects
  for update to authenticated using (bucket_id = 'bst-site-assets' and public.bst_is_admin());
drop policy if exists "bst site assets admin delete" on storage.objects;
create policy "bst site assets admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'bst-site-assets' and public.bst_is_admin());
