import { z } from 'zod';
import { SessionType } from '@prisma/client';

const CreateCalendarSchema = z.object({
  body: z.object({
    date: z
      .string()
      .datetime()
      .or(z.date())
      .refine(
        (date) => {
          const inputDate = new Date(date);
          inputDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return inputDate >= today;
        },
        {
          message: 'Cannot create calendar for past dates',
        },
      ),
  }),
});

const CreateSlotsSchema = z.object({
  body: z.object({
    data: z.array(
      z.object({
        start_time: z.string(),
        end_time: z.string(),
        type: z.nativeEnum(SessionType),
      }),
    ),
  }),
});

const CreateCalendarWithSlotsSchema = z.object({
  body: z
    .object({
      // Support single date + slots format
      date: z
        .string()
        .refine(
          (date) => {
            const inputDate = new Date(date);
            inputDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return inputDate >= today;
          },
          {
            message: 'Cannot create calendar for past dates',
          },
        ),
      slots: z.array(
        z.object({
          start_time: z.string(),
          end_time: z.string(),
          type: z.nativeEnum(SessionType),
        }),
      ),
    })
    .or(
      // Support bulk format with data array
      z.object({
        data: z.array(
          z.object({
            date: z
              .string()
              .refine(
                (date) => {
                  const inputDate = new Date(date);
                  inputDate.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return inputDate >= today;
                },
                {
                  message: 'Cannot create calendar for past dates',
                },
              ),
            slots: z.array(
              z.object({
                start_time: z.string(),
                end_time: z.string(),
                type: z.nativeEnum(SessionType),
              }),
            ),
          }),
        ),
      }),
    ),
});

const CalendarValidation = {
  CreateCalendarSchema,
  CreateSlotsSchema,
  CreateCalendarWithSlotsSchema,
};

export default CalendarValidation;
