import { Payment, PaymentStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import { stripe, dollarsToCents } from './payment.utils';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import GoogleCalendarService from '../google/googleCalendar.services';
import { BalanceService } from '../balance/balance.services';

const TIMEZONE_OFFSET_HOURS = 5;

/**
 * Subtract timezone offset from time string (for displaying in emails)
 * @param timeString - Time like "1:00 PM" from DB
 * @returns Time with offset removed like "8:00 AM"
 */
const subtractTimezoneOffset = (timeString: string): string => {
  const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeString;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  // Convert to 24-hour format
  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  // Subtract timezone offset
  hours = (hours - TIMEZONE_OFFSET_HOURS + 24) % 24;

  // Convert back to 12-hour format
  const newMeridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${newMeridiem}`;
};

interface CreatePaymentIntentData {
  appointment_id: string;
  amount: number;
  currency?: string;
}

// Create payment intent - Stripe handles everything after this
const createPaymentIntent = async (
  data: CreatePaymentIntentData,
): Promise<{ client_secret: string; payment_id: string }> => {
  // Get appointment details
  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointment_id },
    include: { client: true },
  });

  if (!appointment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Appointment not found');
  }

  // Check if payment already exists and is paid
  const existingPayment = await prisma.payment.findFirst({
    where: {
      appointment_id: data.appointment_id,
      status: { in: ['PAID', 'PENDING'] },
    },
  });

  if (existingPayment?.status === 'PAID') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment already completed for this appointment',
    );
  }

  // If pending payment exists, return existing payment info
  if (existingPayment?.status === 'PENDING' && existingPayment.transaction_id) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingPayment.transaction_id,
      );

      if (paymentIntent.client_secret) {
        return {
          client_secret: paymentIntent.client_secret,
          payment_id: existingPayment.id,
        };
      }
    } catch (error) {
      console.log('Error retrieving payment intent:', error);
    }
  }

  const currency = data.currency || 'AUD';
  const amountInCents = dollarsToCents(data.amount);

  try {
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        appointment_id: data.appointment_id,
        client_id: appointment.client_id,
      },
      receipt_email: appointment.client.email,
      description: `Counselling session payment - ${appointment.date.toISOString().split('T')[0]}`,
    });

    let payment: Payment;

    if (existingPayment) {
      // Update existing payment record
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount: data.amount,
          currency: currency,
          status: 'PENDING' as PaymentStatus,
          payment_method: 'stripe',
          transaction_id: paymentIntent.id,
          payment_gateway_data: {}, // Reset gateway data for new payment intent
        },
      });
    } else {
      // Create new payment record
      payment = await prisma.payment.create({
        data: {
          appointment_id: data.appointment_id,
          client_id: appointment.client_id,
          amount: data.amount,
          currency: currency,
          status: 'PENDING' as PaymentStatus,
          payment_method: 'stripe',
          transaction_id: paymentIntent.id,
        },
      });
    }

    return {
      client_secret: paymentIntent.client_secret!,
      payment_id: payment.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create payment intent',
    );
  }
};

// Get payment by appointment
const getPaymentByAppointment = async (
  appointment_id: string,
): Promise<Payment | null> => {
  return await prisma.payment.findFirst({
    where: { appointment_id },
    include: { appointment: true },
  });
};

// Webhook handler - the main payment processor
const handleWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  console.log(`Processing webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  } catch (error) {
    console.error(`Webhook error for ${event.type}:`, error);
    throw error;
  }
};

const handlePaymentSuccess = async (paymentIntent: Stripe.PaymentIntent) => {
  let appointmentId: string = '';
  let counsellorId: string = '';
  let paymentAmount: number = 0;

  await prisma.$transaction(
    async (tx) => {
      // Find the payment record by transaction_id
      const existingPayment = await tx.payment.findUnique({
        where: { transaction_id: paymentIntent.id },
        include: {
          appointment: {
            select: {
              counselor_id: true,
              client_id: true,
              time_slot_id: true,
            },
          },
        },
      });

      if (!existingPayment) {
        console.error(
          `Payment record not found for transaction: ${paymentIntent.id}`,
        );
        throw new Error(
          `Payment record not found for transaction: ${paymentIntent.id}`,
        );
      }

      appointmentId = existingPayment.appointment_id;
      // Fix: The appointment table uses 'counselor_id' but balance tables use 'counsellor_id'
      counsellorId = existingPayment.appointment.counselor_id;
      paymentAmount = Number(existingPayment.amount);

      // Perform payment update, appointment confirmation, time slot update, and counselor-client relationship in parallel
      await Promise.all([
        // Update payment status
        tx.payment.update({
          where: { transaction_id: paymentIntent.id },
          data: {
            status: 'PAID' as PaymentStatus,
            processed_at: new Date(),
            payment_gateway_data: paymentIntent as any,
          },
        }),
        // Confirm appointment
        tx.appointment.update({
          where: { id: existingPayment.appointment_id },
          data: { status: 'CONFIRMED' },
        }),
        // Update time slot status to BOOKED
        tx.timeSlot.update({
          where: { id: existingPayment.appointment.time_slot_id },
          data: { status: 'BOOKED' },
        }),
        // Create counselor-client relationship (if not exists)
        tx.counselorClient.upsert({
          where: {
            counselor_id_client_id: {
              counselor_id: existingPayment.appointment.counselor_id,
              client_id: existingPayment.appointment.client_id,
            },
          },
          create: {
            counselor_id: existingPayment.appointment.counselor_id,
            client_id: existingPayment.appointment.client_id,
          },
          update: {}, // No update needed if already exists
        }),
      ]);
    },
    {
      timeout: 10000, // 10 seconds timeout
      maxWait: 5000, // 5 seconds max wait for connection
    },
  );

  console.log(`Payment successful: ${paymentIntent.id}`);

  // Add balance to counsellor after successful payment
  try {
    console.log(`Attempting to add balance for counsellor: ${counsellorId}`);
    console.log(`Payment amount: $${paymentAmount}`);
    console.log(`Appointment ID: ${appointmentId}`);

    // Ensure counsellor balance record exists
    const balanceRecord =
      await BalanceService.getOrCreateCounsellorBalance(counsellorId);
    console.log(`Balance record found/created:`, balanceRecord);

    // Add the payment amount to counsellor's balance
    const result = await BalanceService.addBalance(
      counsellorId,
      paymentAmount,
      `Payment received for appointment ${appointmentId}`,
      appointmentId,
      'appointment',
    );

    console.log(`Balance addition result:`, result);
    console.log(
      `Balance added to counsellor ${counsellorId}: $${paymentAmount}`,
    );
  } catch (error) {
    console.error('Error adding balance to counsellor:', error);
    console.error('CounsellorId being used:', counsellorId);
    console.error('AppointmentId:', appointmentId);
    console.error('Payment amount:', paymentAmount);
    // Don't fail the payment process if balance addition fails
    // The payment is still successful, but balance needs manual adjustment
  }

  // Create Google Calendar event and send confirmation email after successful transaction
  try {
    const calendarResult = await createGoogleCalendarEvent(appointmentId);

    // Send confirmation email to client and notification to counselor
    try {
      // Get full appointment details for email
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: true,
          counselor: true,
          time_slot: true,
        },
      });

      if (appointment) {
        const sendMail = (await import('../../utils/mailer')).default;
        const AppointmentUtils = (await import('../appointment/appointment.utils')).default;

        const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;
        const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const appointmentTime = `${subtractTimezoneOffset(appointment.time_slot.start_time)} - ${subtractTimezoneOffset(appointment.time_slot.end_time)}`;
        const meetingLink = calendarResult?.meetingLink ?? undefined;

        // Email to client
        const clientEmailBody = AppointmentUtils.createAppointmentConfirmationEmail({
          clientName,
          counselorName: appointment.counselor.name,
          appointmentDate,
          appointmentTime,
          sessionType: appointment.session_type,
          meetingLink,
          counselorId: appointment.counselor_id,
        });

        // Email to counselor
        const counselorEmailBody = AppointmentUtils.createCounselorNotificationEmail({
          counselorName: appointment.counselor.name,
          clientName,
          appointmentDate,
          appointmentTime,
          sessionType: appointment.session_type,
          clientEmail: appointment.client.email,
          clientPhone: appointment.client.phone,
          meetingLink,
          notes: appointment.notes ?? undefined,
        });

        // Send both emails in parallel
        await Promise.all([
          sendMail(
            appointment.client.email,
            'Appointment Confirmed - Alexander Rodriguez Counseling',
            clientEmailBody,
          ),
          sendMail(
            appointment.counselor.email,
            'New Appointment Scheduled - Alexander Rodriguez Counseling',
            counselorEmailBody,
          ),
        ]);

        console.log(`Confirmation email sent to client: ${appointment.client.email}`);
        console.log(`Notification email sent to counselor: ${appointment.counselor.email}`);
      }
    } catch (emailError) {
      console.error('Error sending confirmation emails:', emailError);
      // Don't fail the payment process if email fails
    }
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    // Don't fail the payment process if calendar creation fails
    // The appointment is still confirmed, but without calendar integration
  }
};

const handlePaymentFailed = async (paymentIntent: Stripe.PaymentIntent) => {
  await prisma.$transaction(
    async (tx) => {
      // Find the payment record with appointment details
      const existingPayment = await tx.payment.findUnique({
        where: { transaction_id: paymentIntent.id },
        include: {
          appointment: {
            select: {
              time_slot_id: true,
            },
          },
        },
      });

      if (!existingPayment) {
        console.error(
          `Payment record not found for transaction: ${paymentIntent.id}`,
        );
        return;
      }

      // Update payment status and reset time slot in parallel
      await Promise.all([
        // Update payment status
        tx.payment.update({
          where: { transaction_id: paymentIntent.id },
          data: {
            status: 'FAILED' as PaymentStatus,
            payment_gateway_data: paymentIntent as any,
          },
        }),
        // Reset time slot to AVAILABLE
        tx.timeSlot.update({
          where: { id: existingPayment.appointment.time_slot_id },
          data: { status: 'AVAILABLE' },
        }),
      ]);
    },
    {
      timeout: 10000, // 10 seconds timeout
      maxWait: 5000, // 5 seconds max wait for connection
    },
  );

  console.log(`Payment failed: ${paymentIntent.id}`);
};

const handlePaymentCanceled = async (paymentIntent: Stripe.PaymentIntent) => {
  await prisma.$transaction(
    async (tx) => {
      // Find the payment record with appointment details
      const existingPayment = await tx.payment.findUnique({
        where: { transaction_id: paymentIntent.id },
        include: {
          appointment: {
            select: {
              time_slot_id: true,
            },
          },
        },
      });

      if (!existingPayment) {
        console.error(
          `Payment record not found for transaction: ${paymentIntent.id}`,
        );
        return;
      }

      // Update payment status and reset time slot in parallel
      await Promise.all([
        // Update payment status
        tx.payment.update({
          where: { transaction_id: paymentIntent.id },
          data: {
            status: 'CANCELLED' as PaymentStatus,
            payment_gateway_data: paymentIntent as any,
          },
        }),
        // Reset time slot to AVAILABLE
        tx.timeSlot.update({
          where: { id: existingPayment.appointment.time_slot_id },
          data: { status: 'AVAILABLE' },
        }),
      ]);
    },
    {
      timeout: 10000, // 10 seconds timeout
      maxWait: 5000, // 5 seconds max wait for connection
    },
  );

  console.log(`Payment canceled: ${paymentIntent.id}`);
};

// Helper function to create Google Calendar event
const createGoogleCalendarEvent = async (appointmentId: string) => {
  try {
    // Get full appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        counselor: true,
        time_slot: {
          include: {
            calendar: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Define your business timezone - make this configurable
    const businessTimeZone = 'Australia/Sydney';

    // Get the appointment date
    const appointmentDate = new Date(appointment.date);

    // Parse the time strings and create proper datetime objects in the business timezone
    const startTimeMatch = appointment.time_slot.start_time.match(
      /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
    );
    const endTimeMatch = appointment.time_slot.end_time.match(
      /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
    );

    if (!startTimeMatch || !endTimeMatch) {
      throw new Error('Invalid time format in time slot');
    }

    // Parse start time
    let startHour = parseInt(startTimeMatch[1]);
    const startMinute = parseInt(startTimeMatch[2]);
    const startPeriod = startTimeMatch[3].toUpperCase();

    if (startPeriod === 'PM' && startHour !== 12) {
      startHour += 12;
    } else if (startPeriod === 'AM' && startHour === 12) {
      startHour = 0;
    }

    // Parse end time
    let endHour = parseInt(endTimeMatch[1]);
    const endMinute = parseInt(endTimeMatch[2]);
    const endPeriod = endTimeMatch[3].toUpperCase();

    if (endPeriod === 'PM' && endHour !== 12) {
      endHour += 12;
    } else if (endPeriod === 'AM' && endHour === 12) {
      endHour = 0;
    }

    // Create the date string in YYYY-MM-DD format
    const year = appointmentDate.getFullYear();
    const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
    const day = String(appointmentDate.getDate()).padStart(2, '0');

    // Create datetime strings in ISO format with explicit timezone offset
    // Australia/Sydney is UTC+10 (AEST) or UTC+11 (AEDT during daylight saving)
    // Using +11:00 for Australian Eastern Daylight Time (Oct-Apr)
    const startTimeStr = `${year}-${month}-${day}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+11:00`;
    const endTimeStr = `${year}-${month}-${day}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+11:00`;

    // Now these are explicitly in Australia/Sydney timezone and will be automatically converted to UTC
    const startDateTimeUTC = new Date(startTimeStr);
    const endDateTimeUTC = new Date(endTimeStr);

    console.log('=== TIMEZONE DEBUG ===');
    console.log(
      'Original time slot:',
      appointment.time_slot.start_time,
      '-',
      appointment.time_slot.end_time,
    );
    console.log('Created time strings:', startTimeStr, '-', endTimeStr);
    console.log(
      'Converted to UTC:',
      startDateTimeUTC.toISOString(),
      '-',
      endDateTimeUTC.toISOString(),
    );
    console.log('Business timezone:', businessTimeZone);

    // Create Google Calendar event
    const calendarResult = await GoogleCalendarService.createCalendarEvent({
      appointmentId: appointment.id,
      counselorId: appointment.counselor_id,
      clientEmail: appointment.client.email,
      clientName: `${appointment.client.first_name} ${appointment.client.last_name}`,
      startDateTime: startDateTimeUTC,
      endDateTime: endDateTimeUTC,
      timeZone: businessTimeZone,
    });

    if (calendarResult) {
      console.log(
        `Google Calendar event created for appointment ${appointmentId}`,
      );
      console.log(`Meeting link: ${calendarResult.meetingLink}`);

      // Update appointment with event_id
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { event_id: calendarResult.eventId },
      });

      console.log(
        `Event ID ${calendarResult.eventId} stored in appointment record`,
      );
    }

    return calendarResult;
  } catch (error) {
    console.error(
      `Failed to create Google Calendar event for appointment ${appointmentId}:`,
      error,
    );
    throw error;
  }
};

export const PaymentService = {
  createPaymentIntent,
  getPaymentByAppointment,
  handleWebhookEvent,
};
