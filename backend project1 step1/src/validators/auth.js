// src/validators/auth.js
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  name: z.string().min(1, 'Name is required.').max(100),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
