import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addToCartSchema, updateCartSchema } from '../validators/cart.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// All cart endpoints require a logged-in user
router.use(requireAuth);

// ── GET /api/cart ────────────────────────────────────────────────────────────
// Returns the current user's cart items, joined with product details
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        quantity,
        size,
        added_at,
        product:products (
          id, name, price, image_url, stock_quantity, badge
        )
      `)
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false });

    if (error) throw error;

    // Compute totals server-side so the frontend doesn't have to
    const subtotal = data.reduce((sum, item) => {
      return sum + (item.product?.price ?? 0) * item.quantity;
    }, 0);

    res.json({
      items: data,
      summary: {
        item_count: data.length,
        total_quantity: data.reduce((sum, i) => sum + i.quantity, 0),
        subtotal: Math.round(subtotal * 100) / 100, // round to 2 decimal places
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/cart ───────────────────────────────────────────────────────────
// Add a product to cart (or increment qty if already there)
router.post('/', validate(addToCartSchema), async (req, res, next) => {
  try {
    const { product_id, quantity, size } = req.body;

    // 1. Confirm product exists and has stock
    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select('id, name, stock_quantity')
      .eq('id', product_id)
      .single();

    if (productErr || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock_quantity < 1) {
      return res.status(409).json({ error: 'Product is out of stock' });
    }

    // 2. Upsert: if this user already has this product+size in cart, increment qty;
    //    otherwise create a new row. The unique constraint on (user_id, product_id, size)
    //    makes this safe without a separate read.
    const { data: existing } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .eq('size', size ?? '')
      .maybeSingle();

    let cartItem;

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, 99);
      const { data, error } = await supabaseAdmin
        .from('cart_items')
        .update({ quantity: newQty })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      cartItem = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('cart_items')
        .insert({
          user_id: req.user.id,
          product_id,
          quantity,
          size: size ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      cartItem = data;
    }

    res.status(201).json({ item: cartItem, message: 'Added to cart' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/cart/:itemId ──────────────────────────────────────────────────
// Update qty for a specific cart item. qty=0 removes the item.
router.patch('/:itemId', validate(updateCartSchema), async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Confirm the item belongs to this user before touching it
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('cart_items')
      .select('id, user_id')
      .eq('id', itemId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your cart item' });
    }

    if (quantity === 0) {
      // Remove item entirely
      const { error } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      return res.json({ message: 'Item removed from cart' });
    }

    // Update quantity
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;

    res.json({ item: data, message: 'Cart updated' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/cart ─────────────────────────────────────────────────────────
// Clear the entire cart (used after a successful order)
router.delete('/', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/cart/:itemId ─────────────────────────────────────────────────
// Remove a single item by ID
router.delete('/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Verify ownership first
    const { data: existing } = await supabaseAdmin
      .from('cart_items')
      .select('id, user_id')
      .eq('id', itemId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your cart item' });
    }

    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    res.json({ message: 'Item removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
