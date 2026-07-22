// src/validators/products.js
import { z } from 'zod';

// Query params for GET /api/products
// All values arrive as strings from the URL, so we coerce as needed.
export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating_desc', 'newest']).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
});
