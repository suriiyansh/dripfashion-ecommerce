// src/routes/products.js
import express from 'express';
import { supabaseAnon } from '../lib/supabase.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { validateQuery } from '../middleware/validate.js';
import { listProductsQuerySchema } from '../validators/products.js';

const router = express.Router();

// GET /api/products?category=Fashion&search=tee&sort=price_asc&page=1&limit=20
// Public — no login required. Supports filtering, search, sorting, pagination.
router.get(
  '/',
  validateQuery(listProductsQuerySchema),
  asyncHandler(async (req, res) => {
    const { category, search, sort, page, limit } = req.validatedQuery;

    let query = supabaseAnon
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (category && category.toLowerCase() !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      // Matches against name OR brand, case-insensitive partial match —
      // mirrors the frontend's live search-as-you-type behavior.
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    switch (sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'rating_desc':
        query = query.order('rating', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError(500, 'Failed to load products.');
    }

    res.json({
      products: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  })
);

// GET /api/products/deals
// Returns products flagged is_deal = true (the old "Big Deals" grid).
// IMPORTANT: this route must be declared BEFORE /:id, otherwise Express
// would try to treat "deals" as an :id value.
router.get(
  '/deals',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAnon
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_deal', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError(500, 'Failed to load deals.');
    }

    res.json({ products: data });
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabaseAnon
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, 'Failed to load product.');
    }

    if (!data) {
      throw new ApiError(404, 'Product not found.');
    }

    res.json({ product: data });
  })
);

export default router;
