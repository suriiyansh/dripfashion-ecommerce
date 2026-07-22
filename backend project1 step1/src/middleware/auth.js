// src/middleware/auth.js
//
// Protects routes that require a logged-in user.
//
// How it works: the frontend, after a successful login, holds a Supabase
// "access token" (a JWT). It sends that token on every request to a
// protected route as a header:
//   Authorization: Bearer <token>
//
// This middleware reads that header, asks Supabase "whose token is this,
// and is it still valid?", and if valid, attaches the user's info to
// `req.user` and their personal Supabase client to `req.supabase` so the
// route handler can query the database AS that user (which means RLS
// policies apply correctly — the user only ever sees their own rows).

import { supabaseForUser } from '../lib/supabase.js';
import { ApiError } from './errorHandler.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Missing or invalid Authorization header. Please log in.');
    }

    const supabase = supabaseForUser(token);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }

    req.user = data.user;
    req.supabase = supabase; // already scoped to this user's token
    next();
  } catch (err) {
    next(err);
  }
}
