// src/routes/categories.js
import express from 'express';
import { supabaseAnon } from '../lib/supabase.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

// GET /api/categories
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAnon
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new ApiError(500, 'Failed to load categories.');
    }

    res.json({ categories: data });
  })
);

export default router;
