import { z } from 'zod';

const createServiceSchema = z.object({
  body: z.object({
    division_id: z.string().uuid('Invalid division ID format'),
    name: z.string({ required_error: 'Service name is required' }).min(1),
    description: z.string().optional(),
    session_type: z.enum(['ONLINE', 'IN_PERSON'], {
      required_error: 'Session type is required',
    }),
    base_amount: z
      .number({ required_error: 'Base amount is required' })
      .positive('Amount must be positive'),
    currency: z
      .string()
      .length(3, 'Currency code must be 3 characters')
      .optional(),
    is_active: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const updateServiceSchema = z.object({
  params: z.object({
    serviceId: z.string().uuid('Invalid service ID format'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    session_type: z.enum(['ONLINE', 'IN_PERSON']).optional(),
    base_amount: z.number().positive('Amount must be positive').optional(),
    currency: z.string().length(3).optional(),
    is_active: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const serviceIdParamSchema = z.object({
  params: z.object({
    serviceId: z.string().uuid('Invalid service ID format'),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const getServicesQuerySchema = z.object({
  query: z
    .object({
      division_id: z.string().uuid().optional(),
      session_type: z.enum(['ONLINE', 'IN_PERSON']).optional(),
      min_price: z
        .string()
        .transform((v) => parseFloat(v))
        .pipe(z.number().positive())
        .optional(),
      max_price: z
        .string()
        .transform((v) => parseFloat(v))
        .pipe(z.number().positive())
        .optional(),
      is_active: z
        .string()
        .transform((v) => v === 'true')
        .optional(),
    })
    .optional(),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const ServiceValidation = {
  createServiceSchema,
  updateServiceSchema,
  serviceIdParamSchema,
  getServicesQuerySchema,
};

export default ServiceValidation;
