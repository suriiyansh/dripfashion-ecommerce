import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { toggleWishlistSchema } from '../validators/wishlist.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

router.use(requireAuth);

// ── GET /api/wishlist ────────────────────────────────────────────────────────
// Returns all wishlist items for the current user, with product details
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wishlist_items')
      .select(`
        id,
        added_at,
        product:products (
          id, name, price, image_url, badge, stock_quantity
        )
      `)
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false });

    if (error) throw error;

    res.json({ items: data, count: data.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/wishlist/toggle ────────────────────────────────────────────────
// Toggle: adds product if not wishlisted, removes if already there.
// Returns the new state so the frontend can update the heart icon instantly.
router.post('/toggle', validate(toggleWishlistSchema), async (req, res, next) => {
  try {
    const { product_id } = req.body;

    // Check if it's already wishlisted
    const { data: existing } = await supabaseAdmin
      .from('wishlist_items')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      // Already wishlisted → remove it
      const { error } = await supabaseAdmin
        .from('wishlist_items')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;

      return res.json({ wishlisted: false, message: 'Removed from wishlist' });
    }

    // Not yet wishlisted → add it (confirm product exists first)
    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (productErr || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { error: insertErr } = await supabaseAdmin
      .from('wishlist_items')
      .insert({ user_id: req.user.id, product_id });

    if (insertErr) throw insertErr;

    res.status(201).json({ wishlisted: true, message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/wishlist/:itemId ─────────────────────────────────────────────
// Remove a specific wishlist item by row ID (for the wishlist page's "remove" button)
router.delete('/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('wishlist_items')
      .select('id, user_id')
      .eq('id', itemId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your wishlist item' });
    }

    const { error } = await supabaseAdmin
      .from('wishlist_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
});

export default router;
