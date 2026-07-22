-- ============================================================================
-- DRIP STORE — DATABASE SCHEMA
-- Paste this entire file into Supabase Dashboard → SQL Editor → New Query,
-- then click "Run". It is safe to run once on a fresh project.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CATEGORIES
-- ----------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

-- ----------------------------------------------------------------------------
-- 2. PRODUCTS
-- ----------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price >= 0),
  rating numeric(2,1) default 0 check (rating >= 0 and rating <= 5),
  review_count integer default 0 check (review_count >= 0),
  category text not null,
  image_url text,            -- can hold an emoji (e.g. '👕') or a real image URL
  stock_quantity integer not null default 100 check (stock_quantity >= 0),
  badge text,                 -- 'trending' | 'sale' | null
  is_deal boolean not null default false,  -- true = shows in "Big Deals" grid
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_products_category on products(category);
create index idx_products_is_active on products(is_active);

-- ----------------------------------------------------------------------------
-- 3. PROFILES  (one row per auth.users row)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. ADDRESSES
-- ----------------------------------------------------------------------------
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home',
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  phone text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_addresses_user_id on addresses(user_id);

-- ----------------------------------------------------------------------------
-- 5. CART ITEMS
-- ----------------------------------------------------------------------------
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index idx_cart_items_user_id on cart_items(user_id);

-- ----------------------------------------------------------------------------
-- 6. WISHLIST ITEMS
-- ----------------------------------------------------------------------------
create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index idx_wishlist_items_user_id on wishlist_items(user_id);

-- ----------------------------------------------------------------------------
-- 7. ORDERS
-- ----------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'pending_cod', 'paid', 'failed', 'cancelled', 'delivered')
  ),
  payment_method text not null check (payment_method in ('UPI', 'Card', 'COD')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null check (total >= 0),
  shipping_address_id uuid references addresses(id),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

create index idx_orders_user_id on orders(user_id);

-- ----------------------------------------------------------------------------
-- 8. ORDER ITEMS
-- ----------------------------------------------------------------------------
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  price_at_purchase numeric(10,2) not null check (price_at_purchase >= 0)
);

create index idx_order_items_order_id on order_items(order_id);

-- ----------------------------------------------------------------------------
-- 9. REVIEWS (optional, nice-to-have)
-- ----------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_reviews_product_id on reviews(product_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
--
-- Plain-English version of what we're about to do:
-- By default, once RLS is turned ON for a table, Postgres denies ALL access
-- to EVERYONE — including your own backend, unless a request explicitly
-- proves who it is. A "policy" is a rule that says "users may see/edit ONLY
-- the rows that belong to them." Without RLS, anyone with your anon API key
-- (which is public, sitting in frontend JS) could read or write every row in
-- every table — every user's cart, every address, every order. RLS makes the
-- database itself enforce "you can only touch your own data," so even if
-- there were a bug in our Express code, the database backstops it.
--
-- We use auth.uid() — a built-in Supabase function that returns the ID of
-- whoever is making the request, based on the request's auth token. A
-- policy like "user_id = auth.uid()" means "only rows where the owner column
-- matches the logged-in user."
--
-- Our service_role key (used only inside the Express backend, never sent to
-- the browser) bypasses RLS entirely — that's intentional and is how the
-- backend can do admin-style work like the seed script or stock validation.
-- ============================================================================

-- ---- PROFILES ----
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ---- ADDRESSES ----
alter table addresses enable row level security;

create policy "Users can view own addresses"
  on addresses for select
  using (auth.uid() = user_id);

create policy "Users can insert own addresses"
  on addresses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own addresses"
  on addresses for update
  using (auth.uid() = user_id);

create policy "Users can delete own addresses"
  on addresses for delete
  using (auth.uid() = user_id);

-- ---- CART ITEMS ----
alter table cart_items enable row level security;

create policy "Users can view own cart"
  on cart_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own cart items"
  on cart_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cart items"
  on cart_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own cart items"
  on cart_items for delete
  using (auth.uid() = user_id);

-- ---- WISHLIST ITEMS ----
alter table wishlist_items enable row level security;

create policy "Users can view own wishlist"
  on wishlist_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own wishlist items"
  on wishlist_items for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own wishlist items"
  on wishlist_items for delete
  using (auth.uid() = user_id);

-- ---- ORDERS ----
alter table orders enable row level security;

create policy "Users can view own orders"
  on orders for select
  using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on orders for insert
  with check (auth.uid() = user_id);

-- ---- ORDER ITEMS ----
-- order_items doesn't have its own user_id column, so we check ownership
-- by looking up the parent order's user_id.
alter table order_items enable row level security;

create policy "Users can view own order items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Users can insert own order items"
  on order_items for insert
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- ---- REVIEWS ----
alter table reviews enable row level security;

create policy "Anyone can view reviews"
  on reviews for select
  using (true);

create policy "Users can insert own reviews"
  on reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on reviews for update
  using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on reviews for delete
  using (auth.uid() = user_id);

-- ---- PRODUCTS & CATEGORIES ----
-- These are public catalog data — everyone (even logged-out visitors)
-- should be able to read them. We still enable RLS for consistency and
-- defense-in-depth, but the policy allows open read access.
alter table products enable row level security;
alter table categories enable row level security;

create policy "Anyone can view active products"
  on products for select
  using (is_active = true);

create policy "Anyone can view categories"
  on categories for select
  using (true);

-- ============================================================================
-- DONE. You should see "Success. No rows returned" in the SQL editor.
-- Next: run scripts/seed.js to populate products + categories.
-- ============================================================================
