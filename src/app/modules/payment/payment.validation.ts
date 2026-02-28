import { z } from 'zod';

const createPaymentIntentSchema = z.object({
  body: z.object({
    appointment_id: z.string().uuid('Invalid appointment ID'),
    amount: z
      .number()
      .min(1, 'Amount must be at least $1')
      .max(10000, 'Amount cannot exceed $10,000')
      .optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const PaymentValidation = {
  createPaymentIntentSchema,
};
