// scripts/seed.js
//
// Populates the (empty) Supabase database with:
//   - the 6 categories used by the frontend's filter chips
//   - the 12 products that were previously hardcoded in the frontend JS
//
// Run with: npm run seed
//
// Uses the SERVICE ROLE client because it needs to bypass RLS to insert
// rows that have no "owner" (products/categories are public catalog data,
// not tied to any user).

import { supabaseAdmin } from '../src/lib/supabase.js';

const categories = [
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Tech', slug: 'tech' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Sneakers', slug: 'sneakers' },
  { name: 'Lifestyle', slug: 'lifestyle' },
  { name: 'Gaming', slug: 'gaming' },
];

// Mirrors the original hardcoded `products` + `dealProducts` arrays from
// the frontend exactly — same names, brands, prices, ratings, review
// counts, badges, and categories. `emoji` -> `image_url` (the frontend
// renders this as the product image regardless of whether it's an emoji
// or a real URL, so nothing needs to change visually).
const products = [
  // -- originally `products` array (shown in "Trending Rn" grid) --
  { name: 'Aesthetic Oversized Tee', brand: 'UrbanThreads', image_url: '👕', price: 799, compare_at_price: 1599, rating: 4.8, review_count: 1241, badge: 'trending', category: 'Fashion' },
  { name: 'True Wireless Pro Buds', brand: 'SoundDrip', image_url: '🎧', price: 2499, compare_at_price: 4999, rating: 4.9, review_count: 3892, badge: 'sale', category: 'Tech' },
  { name: 'Y2K Mini Crossbody Bag', brand: 'GlossyVibe', image_url: '👜', price: 1299, compare_at_price: 2199, rating: 4.7, review_count: 892, badge: 'trending', category: 'Fashion' },
  { name: 'Matte Lip Kit Bundle', brand: 'BlushCo', image_url: '💄', price: 699, compare_at_price: 1299, rating: 4.6, review_count: 2341, badge: 'sale', category: 'Beauty' },
  { name: 'Chunky Platform Sneakers', brand: 'SoleMate', image_url: '👟', price: 3499, compare_at_price: 5999, rating: 4.9, review_count: 4102, badge: 'trending', category: 'Sneakers' },
  { name: 'LED Desk Lamp RGB', brand: 'VibeLight', image_url: '💡', price: 1499, compare_at_price: 2499, rating: 4.5, review_count: 763, badge: 'sale', category: 'Lifestyle' },
  { name: 'Vintage Cargo Pants', brand: 'UrbanThreads', image_url: '👖', price: 1899, compare_at_price: 3299, rating: 4.7, review_count: 1567, badge: 'trending', category: 'Fashion' },
  { name: 'Gaming Mechanical Keyboard', brand: 'KeyDrip', image_url: '⌨️', price: 4999, compare_at_price: 7999, rating: 4.9, review_count: 5432, badge: 'sale', category: 'Gaming' },

  // -- originally `dealProducts` array (shown in "Big Deals" grid) --
  { name: 'Skincare Routine Set', brand: 'GlowVibes', image_url: '🧴', price: 1199, compare_at_price: 3499, rating: 4.8, review_count: 2109, badge: 'sale', category: 'Beauty' },
  { name: 'Hooded Puffer Jacket', brand: 'CozyDrip', image_url: '🧥', price: 2799, compare_at_price: 5999, rating: 4.7, review_count: 1823, badge: 'sale', category: 'Fashion' },
  { name: 'Smart Watch Ultra', brand: 'WristDrip', image_url: '⌚', price: 8999, compare_at_price: 17999, rating: 4.9, review_count: 7234, badge: 'trending', category: 'Tech' },
  { name: 'Matcha Starter Kit', brand: 'ZenVibes', image_url: '🍵', price: 899, compare_at_price: 1799, rating: 4.6, review_count: 934, badge: 'sale', category: 'Lifestyle' },
];

// The frontend originally split products into two separate arrays:
// `products` (shown in the "Trending Rn" grid) and `dealProducts` (shown
// in "Big Deals"). We replicate that with a real `is_deal` boolean column,
// which GET /api/products/deals filters on.
const dealNames = new Set([
  'Skincare Routine Set',
  'Hooded Puffer Jacket',
  'Smart Watch Ultra',
  'Matcha Starter Kit',
]);

async function seed() {
  console.log('Seeding categories...');
  const { error: catError } = await supabaseAdmin
    .from('categories')
    .upsert(categories, { onConflict: 'slug' });

  if (catError) {
    console.error('Failed to seed categories:', catError.message);
    process.exit(1);
  }
  console.log(`Inserted/updated ${categories.length} categories.`);

  console.log('Seeding products...');
  const rows = products.map((p) => ({
    name: p.name,
    brand: p.brand,
    description: null,
    price: p.price,
    compare_at_price: p.compare_at_price,
    rating: p.rating,
    review_count: p.review_count,
    category: p.category,
    image_url: p.image_url,
    stock_quantity: 100,
    badge: p.badge,
    is_deal: dealNames.has(p.name),
    is_active: true,
  }));

  const { data, error: prodError } = await supabaseAdmin
    .from('products')
    .insert(rows)
    .select('id, name');

  if (prodError) {
    console.error('Failed to seed products:', prodError.message);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} products:`);
  data.forEach((p) => console.log(`  - ${p.name} (${p.id})`));

  console.log('\nSeed complete! ✅');
  process.exit(0);
}

seed();
