import { z } from 'zod';
import { SessionType } from '@prisma/client';

const getCounselorCalendarSchema = z.object({
  params: z.object({
    counselorId: z.string().uuid('Valid counselor ID is required'),
  }),
});

const getCounselorSlotsSchema = z.object({
  params: z.object({
    calenderId: z.string().uuid('Valid calendar ID is required'),
  }),
  query: z.object({
    type: z.nativeEnum(SessionType).optional(),
  }),
});

const checkAvailabilitySchema = z.object({
  query: z.object({
    datetime: z.string().regex(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/,
      'Invalid datetime format. Expected format: YYYY-MM-DD HH:MM:SS UTC'
    ),
    timezone: z.string().min(1, 'Timezone is required (e.g., Asia/Kolkata, America/New_York, Australia/Sydney)'),
  }),
});

const PublicCalendarValidation = {
  getCounselorCalendarSchema,
  getCounselorSlotsSchema,
  checkAvailabilitySchema,
};

export default PublicCalendarValidation;
