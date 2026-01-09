import { subMinutes } from 'date-fns';

import cron from 'node-cron';
import prisma from '../../../utils/prisma';

const autoCancelPendingAppointments = async () => {
  // Auto-cancel functionality is DISABLED
  // No bookings (manual or public) will be auto-canceled
  return;
};

export const scheduledAutoCancelPendingJobs = () => {
  cron.schedule('*/15 * * * *', async () => {
    await autoCancelPendingAppointments();
  });
};
