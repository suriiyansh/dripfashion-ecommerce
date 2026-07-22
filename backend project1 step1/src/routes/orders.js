import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { checkoutSchema } from '../validators/orders.js';

const router = Router();

// GET /api/orders — get all orders for logged-in user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: orders, error } = await req.supabase
      .from('orders')
      .select(`
        id, status, subtotal, shipping_cost, total, created_at,
        order_items (
          id, quantity, unit_price, size, color,
          product:products (id, name, images)
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — get single order
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: order, error } = await req.supabase
      .from('orders')
      .select(`
        id, status, subtotal, shipping_cost, total, created_at,
        shipping_address,
        order_items (
          id, quantity, unit_price, size, color,
          product:products (id, name, images, price)
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/checkout — create order from cart
router.post('/checkout', requireAuth, validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shipping_address } = req.validatedBody;

    // 1. Get cart items (use req.supabase so RLS applies)
    const { data: cartItems, error: cartError } = await req.supabase
      .from('cart_items')
      .select(`
        id, quantity, size, color,
        product:products (id, name, price, stock_quantity)
      `)
      .eq('user_id', userId);

    if (cartError) throw cartError;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // 2. Check stock for all items
    for (const item of cartItems) {
      if (item.product.stock_quantity < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for "${item.product.name}". Available: ${item.product.stock_quantity}`,
        });
      }
    }

    // 3. Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shipping_cost = subtotal >= 500 ? 0 : 49;
    const total = subtotal + shipping_cost;

    // 4. Create the order (admin bypasses RLS for insert)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({ user_id: userId, status: 'pending', subtotal, shipping_cost, total, shipping_address })
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      size: item.size,
      color: item.color,
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // 6. Reduce stock
    for (const item of cartItems) {
      await supabaseAdmin
        .from('products')
        .update({ stock_quantity: item.product.stock_quantity - item.quantity })
        .eq('id', item.product.id);
    }

    // 7. Clear the cart
    await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);

    res.status(201).json({
      message: 'Order placed successfully!',
      order: {
        id: order.id,
        status: order.status,
        subtotal,
        shipping_cost,
        total,
        item_count: cartItems.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/cancel — cancel a pending order
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const { data: order, error: fetchError } = await req.supabase
      .from('orders')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Cannot cancel an order with status: ${order.status}` });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json({ message: 'Order cancelled', order: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
