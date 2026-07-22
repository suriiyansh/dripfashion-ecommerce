import { z } from 'zod';

export const addToCartSchema = z.object({
  product_id: z.string().uuid('product_id must be a valid UUID'),
  quantity: z.number().int().min(1).max(99).default(1),
  size: z.string().max(20).optional(),
});

export const updateCartSchema = z.object({
  quantity: z.number().int().min(0).max(99),
  // 0 means delete the item — cleaner than a separate DELETE per-item for quantity changes
});
