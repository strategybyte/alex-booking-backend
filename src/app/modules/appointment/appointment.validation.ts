import { z } from 'zod';

const getAppointmentsQuerySchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      session_type: z.enum(['ONLINE', 'IN_PERSON']).optional(),
      status: z
        .enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'DELETED'])
        .optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .optional(),
      page: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1))
        .optional(),
      limit: z
        .string()
        .transform((val) => parseInt(val))
        .pipe(z.number().min(1).max(100))
        .optional(),
      sort_by: z.string().optional(),
      sort_order: z.enum(['asc', 'desc']).optional(),
    })
    .optional(),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const cancelAppointmentSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid('Invalid appointment ID format'),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const rescheduleAppointmentSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid('Invalid appointment ID format'),
  }),
  body: z.object({
    newTimeSlotId: z.string().uuid('Invalid time slot ID format'),
  }),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const createManualAppointmentSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: 'First name is required',
    }),
    lastName: z.string({
      required_error: 'Last name is required',
    }),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email format'),
    phone: z.string({
      required_error: 'Phone is required',
    }),
    dateOfBirth: z.string({
      required_error: 'Date of birth is required',
    }),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
      required_error: 'Gender is required',
    }),
    sessionType: z.enum(['ONLINE', 'IN_PERSON'], {
      required_error: 'Session type is required',
    }),
    date: z.string({
      required_error: 'Date is required',
    }),
    timeSlotId: z.string({
      required_error: 'Time slot ID is required',
    }),
    notes: z.string().optional(),
    serviceId: z.string().uuid('Invalid service ID format').optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const createManualAppointmentWithPaymentSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: 'First name is required',
    }),
    lastName: z.string({
      required_error: 'Last name is required',
    }),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email format'),
    phone: z.string({
      required_error: 'Phone is required',
    }),
    dateOfBirth: z.string({
      required_error: 'Date of birth is required',
    }),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
      required_error: 'Gender is required',
    }),
    sessionType: z.enum(['ONLINE', 'IN_PERSON'], {
      required_error: 'Session type is required',
    }),
    date: z.string({
      required_error: 'Date is required',
    }),
    timeSlotId: z.string({
      required_error: 'Time slot ID is required',
    }),
    notes: z.string().optional(),
    serviceId: z.string().uuid('Invalid service ID format').optional(),
    amount: z.number({
      required_error: 'Payment amount is required',
    }).positive('Amount must be positive'),
    currency: z.string().length(3, 'Currency code must be 3 characters').optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const getAppointmentByTokenSchema = z.object({
  query: z.object({
    token: z.string({
      required_error: 'Payment token is required',
    }).min(10, 'Invalid token format'),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const confirmManualPaymentSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid('Invalid appointment ID format'),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const markYetToPaySchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid('Invalid appointment ID format'),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  cookies: z.object({}).optional(),
});

const AppointmentValidation = {
  getAppointmentsQuerySchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  createManualAppointmentSchema,
  createManualAppointmentWithPaymentSchema,
  getAppointmentByTokenSchema,
  confirmManualPaymentSchema,
  markYetToPaySchema,
};

export default AppointmentValidation;
