import { z } from 'zod';

export const toggleWishlistSchema = z.object({
  product_id: z.string().uuid('product_id must be a valid UUID'),
});
