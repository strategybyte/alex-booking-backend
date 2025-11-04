import { z } from 'zod';

const adjustBalanceSchema = z.object({
  body: z.object({
    amount: z
      .number({
        required_error: 'Amount is required',
        invalid_type_error: 'Amount must be a number',
      })
      .refine((val) => val !== 0, {
        message: 'Amount cannot be zero',
      }),
    description: z
      .string({
        required_error: 'Description is required',
        invalid_type_error: 'Description must be a string',
      })
      .min(1, 'Description cannot be empty')
      .max(500, 'Description too long'),
  }),
});

const setBalanceValuesSchema = z.object({
  body: z
    .object({
      current_balance: z
        .number({
          invalid_type_error: 'Current balance must be a number',
        })
        .min(0, 'Current balance cannot be negative')
        .optional(),
      total_earned: z
        .number({
          invalid_type_error: 'Total earned must be a number',
        })
        .min(0, 'Total earned cannot be negative')
        .optional(),
      total_withdrawn: z
        .number({
          invalid_type_error: 'Total withdrawn must be a number',
        })
        .min(0, 'Total withdrawn cannot be negative')
        .optional(),
    })
    .refine(
      (data) =>
        data.current_balance !== undefined ||
        data.total_earned !== undefined ||
        data.total_withdrawn !== undefined,
      {
        message: 'At least one balance field must be provided',
      },
    ),
});

const balanceFiltersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    sort_by: z.enum(['created_at', 'amount', 'type']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  }),
});

const counsellorBalanceFiltersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    sort_by: z
      .enum([
        'name',
        'email',
        'current_balance',
        'total_earned',
        'total_withdrawn',
        'updated_at',
      ])
      .optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  }),
});

export default {
  adjustBalanceSchema,
  setBalanceValuesSchema,
  balanceFiltersSchema,
  counsellorBalanceFiltersSchema,
};
