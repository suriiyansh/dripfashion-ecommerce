// src/routes/auth.js
import express from 'express';
import { supabaseAdmin, supabaseForUser } from '../lib/supabase.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.js';

const router = express.Router();

// POST /api/auth/register
// Creates a Supabase auth user, then a matching row in `profiles`.
router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, phone } = req.validatedBody;

    // Uses the admin client so we can auto-confirm the email (no email
    // verification step needed for this project) and immediately log them in.
    const { data: signUpData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (signUpError) {
      // Supabase returns a 422-style "already registered" error as a plain
      // message; we surface it as a 409 Conflict.
      const isDuplicate = /already registered|already exists/i.test(signUpError.message);
      throw new ApiError(isDuplicate ? 409 : 400, signUpError.message);
    }

    const userId = signUpData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId, name, phone: phone || null });

    if (profileError) {
      // Roll back the auth user if the profile insert fails, so we don't
      // leave a half-created account behind.
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new ApiError(500, 'Failed to create profile. Please try again.');
    }

    // Immediately sign them in so the frontend gets a session right away,
    // exactly like the old fake "Drip User" auto-logged-in experience.
    const supabasePublic = supabaseForUser(''); // no token needed for signIn
    const { data: sessionData, error: sessionError } =
      await supabasePublic.auth.signInWithPassword({ email, password });

    if (sessionError) {
      throw new ApiError(500, 'Account created, but auto-login failed. Please log in.');
    }

    res.status(201).json({
      user: { id: userId, email, name, phone: phone || null },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody;

    const supabasePublic = supabaseForUser('');
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, phone')
      .eq('id', data.user.id)
      .maybeSingle();

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || null,
        phone: profile?.phone || null,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  })
);

// POST /api/auth/logout
// The frontend just discards its stored token, but we also tell Supabase
// to invalidate the session server-side as a best practice.
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await req.supabase.auth.signOut();
    res.json({ message: 'Logged out successfully.' });
  })
);

// GET /api/auth/me
// Returns the currently logged-in user's profile — used to restore session
// state on page load/refresh.
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('name, phone, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, 'Failed to load profile.');
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: profile?.name || null,
        phone: profile?.phone || null,
      },
    });
  })
);

export default router;
