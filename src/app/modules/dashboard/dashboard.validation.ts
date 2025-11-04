import { z } from 'zod';

const getDashboardSchema = z.object({
  query: z.object({
    date: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          return !isNaN(Date.parse(val));
        },
        { message: 'Invalid date format' },
      ),
  }),
});

const DashboardValidation = {
  getDashboardSchema,
};

export default DashboardValidation;