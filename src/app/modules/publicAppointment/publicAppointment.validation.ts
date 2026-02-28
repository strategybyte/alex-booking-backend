import { z } from 'zod';

const createPublicAppointmentZodSchema = z.object({
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
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
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
    counselorId: z.string({
      required_error: 'Counselor ID is required',
    }),
    serviceId: z.string().uuid('Invalid service ID format').optional(),
  }),
});

const PublicAppointmentValidation = {
  createPublicAppointmentZodSchema,
};

export default PublicAppointmentValidation;
