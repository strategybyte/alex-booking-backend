import { z } from 'zod';

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
  }),
});

const createCounselorSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Name is required',
        invalid_type_error: 'Name must be a string',
      })
      .min(1, 'Name cannot be empty'),
    email: z
      .string({
        required_error: 'Email is required',
        invalid_type_error: 'Email must be a string',
      })
      .email('Invalid email format'),
    specialization: z
      .string({
        invalid_type_error: 'Specialization must be a string',
      })
      .min(1, 'Specialization cannot be empty')
      .optional(),
  }),
});

const updateCounselorSettingsSchema = z.object({
  body: z.object({
    minimum_slots_per_day: z
      .number({
        invalid_type_error: 'Minimum slots per day must be a number',
      })
      .int('Minimum slots per day must be an integer')
      .min(1, 'Minimum slots per day must be at least 1')
      .max(50, 'Minimum slots per day cannot exceed 50')
      .optional(),
    approved_by_admin: z
      .boolean({
        invalid_type_error: 'Approved by admin must be a boolean',
      })
      .optional(),
  }).refine(
    (data) => data.minimum_slots_per_day !== undefined || data.approved_by_admin !== undefined,
    {
      message: 'At least one field (minimum_slots_per_day or approved_by_admin) must be provided',
    }
  ),
});

const updateCounselorSchema = z.object({
  body: z.object({
    name: z
      .string({
        invalid_type_error: 'Name must be a string',
      })
      .min(1, 'Name cannot be empty')
      .optional(),
    specialization: z
      .string({
        invalid_type_error: 'Specialization must be a string',
      })
      .min(1, 'Specialization cannot be empty')
      .optional(),
  }).refine(
    (data) => data.name !== undefined || data.specialization !== undefined,
    {
      message: 'At least one field (name or specialization) must be provided',
    }
  ),
});

const assignDivisionSchema = z.object({
  params: z.object({
    counselorId: z.string().uuid('Invalid counselor ID format'),
  }),
  body: z.object({
    division_id: z.string().uuid('Invalid division ID format'),
  }),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const assignServiceSchema = z.object({
  params: z.object({
    counselorId: z.string().uuid('Invalid counselor ID format'),
  }),
  body: z.object({
    service_id: z.string().uuid('Invalid service ID format'),
  }),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const UserValidation = {
  updateProfileSchema,
  createCounselorSchema,
  updateCounselorSettingsSchema,
  updateCounselorSchema,
  assignDivisionSchema,
  assignServiceSchema,
};

export default UserValidation;
