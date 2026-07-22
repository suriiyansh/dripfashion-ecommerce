import { z } from 'zod';

export const checkoutSchema = z.object({
  shipping_address: z.object({
    full_name: z.string().min(2, 'Full name is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    line1: z.string().min(3, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  }),
});
