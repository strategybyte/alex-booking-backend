import { z } from 'zod';

const createDivisionSchema = z.object({
  body: z.object({
    type: z.enum(['ALLIED_HEALTH', 'LIFE_COACHING', 'COUNSELLING'], {
      required_error: 'Division type is required',
    }),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const updateDivisionSchema = z.object({
  params: z.object({
    divisionId: z.string().uuid('Invalid division ID format'),
  }),
  body: z.object({
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const divisionIdParamSchema = z.object({
  params: z.object({
    divisionId: z.string().uuid('Invalid division ID format'),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const DivisionValidation = {
  createDivisionSchema,
  updateDivisionSchema,
  divisionIdParamSchema,
};

export default DivisionValidation;
