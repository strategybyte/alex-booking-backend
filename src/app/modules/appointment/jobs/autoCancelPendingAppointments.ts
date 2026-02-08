import { subMinutes } from 'date-fns';
import cron from 'node-cron';
import prisma from '../../../utils/prisma';

// Configuration: Auto-cancel public bookings after this many minutes
const AUTO_CANCEL_TIMEOUT_MINUTES = 15;

/**
 * Auto-cancels PENDING public appointments that have not been paid within the timeout period.
 *
 * This ONLY affects PUBLIC bookings (payment_token is NULL).
 * Manual bookings with payment (payment_token is NOT NULL) are NOT affected
 * as they have their own 60-day payment token expiry.
 */
const autoCancelPendingAppointments = async () => {
  try {
    const cutoffTime = subMinutes(new Date(), AUTO_CANCEL_TIMEOUT_MINUTES);

    // Find PENDING PUBLIC appointments older than the timeout
    // Key differentiator: payment_token is NULL for public bookings
    const pendingPublicAppointments = await prisma.appointment.findMany({
      where: {
        status: 'PENDING',
        payment_token: null, // Only public bookings (manual bookings have payment_token)
        created_at: { lt: cutoffTime },
      },
      include: {
        time_slot: true,
        client: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (pendingPublicAppointments.length === 0) {
      return;
    }

    console.log(
      `[Auto-Cancel] Found ${pendingPublicAppointments.length} pending public appointment(s) to cancel`,
    );

    // Cancel each appointment and release the time slot
    for (const appointment of pendingPublicAppointments) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Update appointment status to CANCELLED
          await tx.appointment.update({
            where: { id: appointment.id },
            data: { status: 'CANCELLED' },
          });

          // 2. Release the time slot back to AVAILABLE
          await tx.timeSlot.update({
            where: { id: appointment.time_slot_id },
            data: { status: 'AVAILABLE' },
          });
        });

        console.log(
          `[Auto-Cancel] Cancelled appointment ${appointment.id} for client ${appointment.client.email}`,
        );
      } catch (error) {
        console.error(
          `[Auto-Cancel] Failed to cancel appointment ${appointment.id}:`,
          error,
        );
      }
    }

    console.log(
      `[Auto-Cancel] Successfully processed ${pendingPublicAppointments.length} appointment(s)`,
    );
  } catch (error) {
    console.error('[Auto-Cancel] Error in autoCancelPendingAppointments:', error);
  }
};

export const scheduledAutoCancelPendingJobs = () => {
  // Run every 5 minutes to check for expired public bookings
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Auto-Cancel] Running scheduled check for pending public appointments...');
    await autoCancelPendingAppointments();
  });

  console.log(
    `[Auto-Cancel] Cron job scheduled - Public bookings will be auto-cancelled after ${AUTO_CANCEL_TIMEOUT_MINUTES} minutes`,
  );
};
