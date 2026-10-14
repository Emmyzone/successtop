-- SuccessTop: schema
-- All objects are prefixed "bst_" so this can safely share a Supabase project
-- with other websites (TomHaven, Tari's Treats, etc.) without name clashes.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- Keeps updated_at current
create or replace function public.bst_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles (staff accounts) ----------
create table if not exists public.bst_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default false,   -- new accounts start inactive until the main admin approves them
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role helpers. SECURITY DEFINER avoids recursive RLS on bst_profiles.
create or replace function public.bst_is_active_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bst_profiles where id = auth.uid() and is_active);
$$;

create or replace function public.bst_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bst_profiles where id = auth.uid() and is_active and role = 'admin');
$$;

-- Every new auth user gets an INACTIVE staff profile. Nobody becomes admin automatically.
create or replace function public.bst_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bst_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists bst_on_auth_user_created on auth.users;
create trigger bst_on_auth_user_created
  after insert on auth.users
  for each row execute function public.bst_handle_new_user();

-- ---------- categories ----------
create table if not exists public.bst_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- products ----------
create table if not exists public.bst_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  category_id uuid references public.bst_categories(id) on delete restrict,
  base_price numeric(12,2) not null check (base_price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  image_path text,
  image_alt text,
  gallery jsonb not null default '[]'::jsonb,   -- [{ "path": "...", "alt": "..." }]
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bst_products_category_idx on public.bst_products(category_id);
create index if not exists bst_products_featured_idx on public.bst_products(is_featured) where is_featured;

create table if not exists public.bst_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.bst_products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sku text,
  price numeric(12,2) not null check (price >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bst_variants_product_idx on public.bst_product_variants(product_id);

-- ---------- branches ----------
create table if not exists public.bst_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null,
  phone text,
  whatsapp_number text,
  opening_hours text,
  directions_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- promotions ----------
create table if not exists public.bst_promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text,
  image_path text,
  product_id uuid references public.bst_products(id) on delete set null,
  category_id uuid references public.bst_categories(id) on delete set null,
  discount_percent numeric(5,2) check (discount_percent is null or (discount_percent > 0 and discount_percent <= 100)),
  promo_price numeric(12,2) check (promo_price is null or promo_price >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- ---------- site settings (key / value) ----------
-- Everything here is publicly readable. Never store secrets in this table.
create table if not exists public.bst_site_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- enquiries ----------
create table if not exists public.bst_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  contact text not null check (char_length(contact) between 3 and 160),
  enquiry_type text not null default 'general'
    check (enquiry_type in ('general', 'bulk_bread', 'reseller', 'catering')),
  message text not null check (char_length(message) between 5 and 2000),
  preferred_branch_id uuid references public.bst_branches(id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'awaiting_confirmation', 'confirmed', 'completed', 'cancelled')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bst_enquiries_created_idx on public.bst_enquiries(created_at desc);

-- ---------- order intents ----------
-- A website record that a customer asked to order. It does NOT mean the order is confirmed or paid.
create table if not exists public.bst_order_intents (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text,
  customer_contact text,
  branch_id uuid references public.bst_branches(id) on delete set null,
  fulfilment text not null default 'undecided' check (fulfilment in ('pickup', 'delivery', 'undecided')),
  notes text,
  estimated_total numeric(12,2) not null default 0 check (estimated_total >= 0),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'awaiting_confirmation', 'confirmed', 'completed', 'cancelled')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bst_order_intents_created_idx on public.bst_order_intents(created_at desc);

create table if not exists public.bst_order_intent_items (
  id uuid primary key default gen_random_uuid(),
  order_intent_id uuid not null references public.bst_order_intents(id) on delete cascade,
  product_id uuid references public.bst_products(id) on delete set null,
  variant_id uuid references public.bst_product_variants(id) on delete set null,
  product_name text not null,        -- snapshot
  variant_name text,                 -- snapshot
  unit_price numeric(12,2) not null check (unit_price >= 0),   -- snapshot
  quantity integer not null check (quantity between 1 and 100),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create index if not exists bst_order_items_intent_idx on public.bst_order_intent_items(order_intent_id);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array[
    'bst_profiles','bst_categories','bst_products','bst_product_variants',
    'bst_branches','bst_promotions','bst_site_settings','bst_enquiries','bst_order_intents'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.bst_touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- ---------- spam throttle for public enquiries ----------
create or replace function public.bst_throttle_enquiries()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.bst_enquiries where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited';
  end if;
  return new;
end $$;

drop trigger if exists bst_enquiries_throttle on public.bst_enquiries;
create trigger bst_enquiries_throttle before insert on public.bst_enquiries
  for each row execute function public.bst_throttle_enquiries();

-- ---------- order intent submission ----------
-- The browser never inserts order rows directly. This function re-reads the real
-- prices and availability from the database, so a customer cannot tamper with prices.
create or replace function public.bst_submit_order_intent(
  p_customer_name text,
  p_customer_contact text,
  p_branch_id uuid,
  p_fulfilment text,
  p_notes text,
  p_items jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
  v_ref text := 'BST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_prod public.bst_products%rowtype;
  v_var public.bst_product_variants%rowtype;
  v_qty integer;
  v_unit numeric(12,2);
  v_vname text;
  v_branch uuid;
  v_fulfil text := coalesce(nullif(p_fulfilment, ''), 'undecided');
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_items';
  end if;

  if (select count(*) from public.bst_order_intents where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limited';
  end if;

  if v_fulfil not in ('pickup', 'delivery', 'undecided') then v_fulfil := 'undecided'; end if;

  select id into v_branch from public.bst_branches where id = p_branch_id and is_active;

  insert into public.bst_order_intents
    (id, reference, customer_name, customer_contact, branch_id, fulfilment, notes)
  values
    (v_id, v_ref, left(nullif(trim(p_customer_name), ''), 120), left(nullif(trim(p_customer_contact), ''), 160),
     v_branch, v_fulfil, left(nullif(trim(p_notes), ''), 1000));

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 100 then raise exception 'invalid_quantity'; end if;

    select * into v_prod from public.bst_products
      where id = (v_item ->> 'product_id')::uuid and is_available;
    if not found then raise exception 'product_unavailable'; end if;

    v_vname := null;
    if nullif(v_item ->> 'variant_id', '') is not null then
      select * into v_var from public.bst_product_variants
        where id = (v_item ->> 'variant_id')::uuid and product_id = v_prod.id and is_available;
      if not found then raise exception 'product_unavailable'; end if;
      v_unit := v_var.price;
      v_vname := v_var.name;
    else
      if exists (select 1 from public.bst_product_variants where product_id = v_prod.id and is_available) then
        raise exception 'variant_required';
      end if;
      v_unit := v_prod.base_price;
    end if;

    insert into public.bst_order_intent_items
      (order_intent_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, line_total)
    values
      (v_id, v_prod.id, case when v_vname is null then null else v_var.id end,
       v_prod.name, v_vname, v_unit, v_qty, v_unit * v_qty);

    v_total := v_total + v_unit * v_qty;
  end loop;

  update public.bst_order_intents set estimated_total = v_total where id = v_id;
  return v_ref;
end $$;

revoke all on function public.bst_submit_order_intent(text, text, uuid, text, text, jsonb) from public;
grant execute on function public.bst_submit_order_intent(text, text, uuid, text, text, jsonb) to anon, authenticated;
