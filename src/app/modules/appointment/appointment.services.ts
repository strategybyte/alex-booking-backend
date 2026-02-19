import prisma from '../../utils/prisma';
import calculatePagination, {
  IPaginationOptions,
} from '../../utils/pagination';
import { appointmentSearchableFields } from './appointment.constant';
import { Prisma } from '@prisma/client';
import GoogleCalendarService from '../google/googleCalendar.services';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const TIMEZONE_OFFSET_HOURS = 0;

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

interface IAppointmentFilters {
  search?: string;
  session_type?: 'ONLINE' | 'IN_PERSON';
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'DELETED';
  date?: string;
}

const GetCounselorAppointmentsById = async (
  counselor_id: string,
  filters: IAppointmentFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sort_by, sort_order } =
    calculatePagination(paginationOptions);
  const { search, session_type, status, date } = filters;

  // Build where clause
  const whereConditions: Prisma.AppointmentWhereInput = {
    counselor_id,
    status: {
      not: 'PENDING',
    },
  };

  // Add search functionality across client fields
  if (search) {
    whereConditions.OR = appointmentSearchableFields.map((field) => ({
      client: {
        [field]: {
          contains: search,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      },
    }));
  }

  // Add session_type filter
  if (session_type) {
    whereConditions.session_type = session_type;
  }

  // Add status filter
  if (status) {
    whereConditions.status = status;
  }

  // Add date filter
  if (date) {
    whereConditions.date = new Date(date);
  }

  // Build order by clause
  const orderBy: Prisma.AppointmentOrderByWithRelationInput = {};

  if (sort_by === 'client_name') {
    orderBy.client = {
      first_name: sort_order as Prisma.SortOrder,
    };
  } else if (sort_by === 'client_email') {
    orderBy.client = {
      email: sort_order as Prisma.SortOrder,
    };
  } else if (sort_by === 'session_type') {
    orderBy.session_type = sort_order as Prisma.SortOrder;
  } else if (sort_by === 'status') {
    orderBy.status = sort_order as Prisma.SortOrder;
  } else if (sort_by === 'date') {
    orderBy.date = sort_order as Prisma.SortOrder;
  } else {
    orderBy.created_at = sort_order as Prisma.SortOrder;
  }

  // Get total count for pagination
  const total = await prisma.appointment.count({
    where: whereConditions,
  });

  // Get appointments with pagination
  const appointments = await prisma.appointment.findMany({
    where: whereConditions,
    select: {
      id: true,
      date: true,
      session_type: true,
      status: true,
      time_slot: {
        select: {
          start_time: true,
          end_time: true,
        },
      },
      client: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
      meeting: {
        select: {
          platform: true,
          link: true,
        },
      },
      created_at: true,
    },
    orderBy,
    skip,
    take: limit,
  });

  const formattedAppointments = appointments.map((appointment) => ({
    id: appointment.id,
    sessionType: appointment.session_type,
    appointmentDate: appointment.date,
    startTime: subtractTimezoneOffset(appointment.time_slot.start_time), // Subtract 5 hours when fetching
    endTime: subtractTimezoneOffset(appointment.time_slot.end_time), // Subtract 5 hours when fetching
    status: appointment.status,
    client: {
      firstName: appointment.client.first_name,
      lastName: appointment.client.last_name,
      email: appointment.client.email,
      phone: appointment.client.phone,
    },
    createdAt: appointment.created_at,
  }));

  return {
    data: formattedAppointments,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const GetCounselorAppointmentDetailsById = async (id: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      date: true,
      session_type: true,
      status: true,
      time_slot: {
        select: {
          start_time: true,
          end_time: true,
        },
      },
      client: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          date_of_birth: true,
          gender: true,
        },
      },
      meeting: {
        select: {
          platform: true,
          link: true,
        },
      },
      payment: {
        select: {
          amount: true,
          currency: true,
          status: true,
          transaction_id: true,
        },
      },
      notes: true,
      created_at: true,
    },
  });

  if (!appointment) {
    return null;
  }

  // Apply timezone conversion to time slot
  return {
    ...appointment,
    time_slot: {
      start_time: subtractTimezoneOffset(appointment.time_slot.start_time), // Subtract 5 hours when fetching
      end_time: subtractTimezoneOffset(appointment.time_slot.end_time), // Subtract 5 hours when fetching
    },
  };
};

const CompleteAppointmentById = async (id: string) => {
  const appointment = await prisma.appointment.update({
    where: {
      id,
    },
    data: {
      status: 'COMPLETED',
    },
  });

  return appointment;
};

const CancelAppointmentById = async (id: string, counselorId: string) => {
  // First, get appointment details to validate and get necessary IDs
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      time_slot: true,
      counselor: true,
      meeting: true,
    },
  });

  if (!appointment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Appointment not found');
  }

  // Verify that the appointment belongs to the counselor
  if (appointment.counselor_id !== counselorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to cancel this appointment',
    );
  }

  // Check if appointment can be cancelled
  if (appointment.status === 'CANCELLED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Appointment is already cancelled',
    );
  }

  if (appointment.status === 'COMPLETED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot cancel a completed appointment',
    );
  }

  // Perform database updates in a transaction (without external API calls)
  const updatedAppointment = await prisma.$transaction(async (tx) => {
    try {
      // 1. Update TimeSlot status to AVAILABLE and reset is_rescheduled flag
      await tx.timeSlot.update({
        where: { id: appointment.time_slot_id },
        data: { status: 'AVAILABLE', is_rescheduled: false },
      });

      // 2. Update Appointment status to CANCELLED
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 3. Delete meeting entry if exists
      if (appointment.meeting) {
        await tx.meeting.delete({
          where: { id: appointment.meeting.id },
        });
      }

      return updated;
    } catch (error) {
      console.error('Error during appointment cancellation:', error);
      throw error;
    }
  });

  // Cancel Google Calendar event outside the transaction
  if (appointment.event_id) {
    try {
      await GoogleCalendarService.cancelCalendarEvent(
        appointment.event_id,
        counselorId,
      );
    } catch (calendarError) {
      console.error('Failed to cancel Google Calendar event:', calendarError);
      // We don't throw here because the database operations should succeed
      // even if calendar cancellation fails
    }
  }

  return updatedAppointment;
};

const RescheduleAppointmentById = async (
  appointmentId: string,
  counselorId: string,
  newTimeSlotId: string,
) => {
  // First perform database updates in a single, short transaction with explicit timeout
  const txResult = await prisma.$transaction(
    async (tx) => {
      // 1. Get current appointment details
      const currentAppointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          time_slot: {
            include: {
              calendar: true,
            },
          },
          client: true,
          counselor: true,
          meeting: true,
        },
      });

      if (!currentAppointment) {
        throw new AppError(httpStatus.NOT_FOUND, 'Appointment not found');
      }

      // Verify that the appointment belongs to the counselor
      if (currentAppointment.counselor_id !== counselorId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You are not authorized to reschedule this appointment',
        );
      }

      // Check if appointment can be rescheduled
      if (currentAppointment.status === 'CANCELLED') {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Cannot reschedule a cancelled appointment',
        );
      }

      if (currentAppointment.status === 'COMPLETED') {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Cannot reschedule a completed appointment',
        );
      }

      // 2. Get new time slot details
      const newTimeSlot = await tx.timeSlot.findUnique({
        where: { id: newTimeSlotId },
        include: {
          calendar: true,
        },
      });

      if (!newTimeSlot) {
        throw new AppError(httpStatus.NOT_FOUND, 'New time slot not found');
      }

      // Check if new time slot is available
      if (newTimeSlot.status !== 'AVAILABLE') {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Selected time slot is not available',
        );
      }

      // Check if new time slot belongs to the same counselor
      const newCalendar = await tx.calendar.findUnique({
        where: { id: newTimeSlot.calendar_id },
      });

      if (!newCalendar || newCalendar.counselor_id !== counselorId) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'New time slot must belong to the same counselor',
        );
      }

      // 3. Update old time slot status to AVAILABLE and reset is_rescheduled flag
      await tx.timeSlot.update({
        where: { id: currentAppointment.time_slot_id },
        data: { status: 'AVAILABLE', is_rescheduled: false },
      });

      // 4. Update new time slot status to BOOKED
      await tx.timeSlot.update({
        where: { id: newTimeSlotId },
        data: { status: 'BOOKED', is_rescheduled: true },
      });

      // 5. Update appointment with new time slot and date
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          time_slot_id: newTimeSlotId,
          date: newTimeSlot.calendar.date,
          status: 'CONFIRMED', // Set status to confirmed after rescheduling
          is_rescheduled: true,
          session_type: newTimeSlot.type, // Update session type to match new slot
        },
        include: {
          time_slot: {
            include: {
              calendar: true,
            },
          },
          client: true,
          counselor: true,
          meeting: true,
        },
      });

      // Return values needed for post-transaction Google Calendar update and email
      return {
        updatedAppointment,
        eventId: currentAppointment.event_id,
        appointmentDate: newTimeSlot.calendar.date,
        startTimeText: newTimeSlot.start_time as any,
        endTimeText: newTimeSlot.end_time as any,
        clientEmail: currentAppointment.client.email,
        clientName: `${currentAppointment.client.first_name} ${currentAppointment.client.last_name}`,
        oldSessionType: currentAppointment.session_type,
        newSessionType: newTimeSlot.type,
        existingMeetingLink: currentAppointment.meeting?.link,
        counselorEmail: currentAppointment.counselor.email,
        counselorName: currentAppointment.counselor.name,
        clientPhone: currentAppointment.client.phone,
        notes: currentAppointment.notes,
      };
    },
    {
      // Explicit timeout configuration for serverless environments
      timeout: 10000, // 10 seconds
      maxWait: 5000, // 5 seconds max wait for connection
    },
  );

  const {
    updatedAppointment,
    eventId,
    appointmentDate,
    startTimeText,
    endTimeText,
    clientEmail,
    clientName,
    oldSessionType,
    newSessionType,
    existingMeetingLink,
    counselorEmail,
    counselorName,
    clientPhone,
    notes,
  } = txResult;

  // After the transaction, handle Google Calendar update and send email notifications asynchronously
  setImmediate(async () => {
    try {
      const businessTimeZone = 'Australia/Sydney'; // TODO: move to config

      // Parse time strings for Google Calendar operations
      const appointmentDateObj = new Date(appointmentDate);
      const startTimeMatch = (startTimeText as string).match(
        /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
      );
      const endTimeMatch = (endTimeText as string).match(
        /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
      );

      let utcStartTime: Date | undefined;
      let utcEndTime: Date | undefined;

      if (startTimeMatch && endTimeMatch) {
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
        const year = appointmentDateObj.getFullYear();
        const month = String(appointmentDateObj.getMonth() + 1).padStart(
          2,
          '0',
        );
        const day = String(appointmentDateObj.getDate()).padStart(2, '0');

        // Create datetime strings in ISO format with explicit timezone offset (UTC+11 for AEDT)
        const startTimeStr = `${year}-${month}-${day}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+11:00`;
        const endTimeStr = `${year}-${month}-${day}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+11:00`;

        // Convert to UTC Date objects
        utcStartTime = new Date(startTimeStr);
        utcEndTime = new Date(endTimeStr);

        console.log('=== RESCHEDULE TIMEZONE DEBUG ===');
        console.log('Original time slot:', startTimeText, '-', endTimeText);
        console.log('Created time strings:', startTimeStr, '-', endTimeStr);
        console.log(
          'Converted to UTC:',
          utcStartTime.toISOString(),
          '-',
          utcEndTime.toISOString(),
        );
        console.log('Business timezone:', businessTimeZone);
      }

      // 1. Handle Google Calendar reschedule if event exists
      if (eventId && utcStartTime && utcEndTime) {
        try {
          await GoogleCalendarService.rescheduleCalendarEvent(
            eventId,
            counselorId,
            {
              appointmentId,
              clientEmail,
              clientName,
              startDateTime: utcStartTime,
              endDateTime: utcEndTime,
              timeZone: businessTimeZone,
            },
          );
        } catch (calendarError) {
          console.error(
            'Failed to reschedule Google Calendar event (async):',
            calendarError,
          );
          // Do not throw - DB changes already committed
        }
      }

      // 2. Determine meet link based on session type change
      let meetingLink: string | undefined;

      if (newSessionType === 'ONLINE') {
        if (oldSessionType === 'ONLINE' && existingMeetingLink) {
          // ONLINE -> ONLINE: Use existing meet link
          meetingLink = existingMeetingLink;
        } else {
          // IN_PERSON -> ONLINE (or ONLINE without existing link): Generate new meet link
          // Check if a meeting record already exists from the updated appointment
          const freshAppointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { meeting: true },
          });

          if (freshAppointment?.meeting?.link) {
            meetingLink = freshAppointment.meeting.link;
          } else if (utcStartTime && utcEndTime) {
            // Create a new Google Calendar event with meet link
            try {
              const calendarResult =
                await GoogleCalendarService.createCalendarEvent({
                  appointmentId,
                  counselorId,
                  clientEmail,
                  clientName,
                  startDateTime: utcStartTime,
                  endDateTime: utcEndTime,
                  timeZone: businessTimeZone,
                });

              if (calendarResult) {
                meetingLink = calendarResult.meetingLink ?? undefined;
                // Update appointment with event_id
                await prisma.appointment.update({
                  where: { id: appointmentId },
                  data: { event_id: calendarResult.eventId },
                });
                console.log(
                  `New Google Calendar event created for IN_PERSON -> ONLINE reschedule, appointment ${appointmentId}`,
                );
              }
            } catch (meetError) {
              console.error(
                'Failed to create meet link for session type change:',
                meetError,
              );
            }
          }
        }
      }
      // ONLINE -> IN_PERSON or IN_PERSON -> IN_PERSON: meetingLink stays undefined

      // 3. Send reschedule notification emails to both client and counselor
      try {
        const sendMail = (await import('../../utils/mailer')).default;
        const AppointmentUtils = (await import('./appointment.utils')).default;

        const formattedDate = new Date(appointmentDate).toLocaleDateString(
          'en-US',
          {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        );
        const appointmentTime = `${subtractTimezoneOffset(startTimeText)} - ${subtractTimezoneOffset(endTimeText)}`;

        // Email to client
        const clientEmailBody =
          AppointmentUtils.createAppointmentConfirmationEmail({
            clientName,
            counselorName,
            appointmentDate: formattedDate,
            appointmentTime,
            sessionType: newSessionType,
            meetingLink,
            counselorId,
          });

        // Email to counselor
        const counselorEmailBody =
          AppointmentUtils.createCounselorNotificationEmail({
            counselorName,
            clientName,
            appointmentDate: formattedDate,
            appointmentTime,
            sessionType: newSessionType,
            clientEmail,
            clientPhone,
            meetingLink,
            notes: notes ?? undefined,
          });

        // Send both emails in parallel
        await Promise.all([
          sendMail(
            clientEmail,
            'Appointment Rescheduled - Alexander Rodriguez Counseling',
            clientEmailBody,
          ),
          sendMail(
            counselorEmail,
            'Appointment Rescheduled - Alexander Rodriguez Counseling',
            counselorEmailBody,
          ),
        ]);

        console.log(
          `Reschedule notification emails sent to client: ${clientEmail} and counselor: ${counselorEmail}`,
        );
      } catch (emailError) {
        console.error(
          'Failed to send reschedule notification emails:',
          emailError,
        );
      }
    } catch (error) {
      console.error('Error in post-reschedule tasks:', error);
    }
  });

  return updatedAppointment;
};

interface IManualAppointmentData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  sessionType: 'ONLINE' | 'IN_PERSON';
  date: string;
  timeSlotId: string;
  notes?: string;
}

const CreateManualAppointment = async (
  counselorId: string,
  data: IManualAppointmentData,
) => {
  // Get counselor details first
  const counselor = await prisma.user.findUnique({
    where: { id: counselorId },
  });

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }

  // Check if time slot is available
  const timeSlot = await prisma.timeSlot.findFirst({
    where: {
      id: data.timeSlotId,
      status: 'AVAILABLE',
    },
    include: {
      calendar: {
        include: {
          counselor: true,
        },
      },
    },
  });

  if (!timeSlot) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      'Time slot is not available',
    );
  }

  // Verify the session type matches the slot type
  if (timeSlot.type !== data.sessionType) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Session type does not match the selected time slot type',
    );
  }

  // Verify the counselor matches
  if (timeSlot.calendar.counselor_id !== counselorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Time slot does not belong to this counselor',
    );
  }

  // Create appointment in transaction
  const appointment = await prisma.$transaction(
    async (tx) => {
      // Upsert client
      const client = await tx.client.upsert({
        where: {
          email: data.email,
        },
        update: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          date_of_birth: new Date(data.dateOfBirth).toISOString(),
          gender: data.gender,
        },
        create: {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          date_of_birth: new Date(data.dateOfBirth).toISOString(),
          gender: data.gender,
        },
      });

      // Create appointment, update time slot, and create counselor-client relationship
      const [, newAppointment] = await Promise.all([
        // Mark the time slot as BOOKED (manual appointments are immediately confirmed)
        tx.timeSlot.update({
          where: { id: data.timeSlotId },
          data: { status: 'BOOKED' },
        }),
        // Create Appointment with CONFIRMED status (no payment required for manual appointments)
        tx.appointment.create({
          data: {
            client_id: client.id,
            time_slot_id: data.timeSlotId,
            counselor_id: counselorId,
            date: new Date(data.date).toISOString(),
            session_type: data.sessionType,
            notes: data.notes || '',
            status: 'CONFIRMED',
          },
          include: {
            client: true,
            counselor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            time_slot: true,
          },
        }),
        // Create counselor-client relationship (if not exists)
        tx.counselorClient.upsert({
          where: {
            counselor_id_client_id: {
              counselor_id: counselorId,
              client_id: client.id,
            },
          },
          create: {
            counselor_id: counselorId,
            client_id: client.id,
          },
          update: {}, // No update needed if already exists
        }),
      ]);

      return newAppointment;
    },
    {
      timeout: 10000,
      maxWait: 5000,
    },
  );

  // Create Google Calendar event and send email asynchronously
  setImmediate(async () => {
    try {
      // Get full appointment details with calendar info
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
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

      if (!fullAppointment) {
        console.error('Appointment not found after creation');
        return;
      }

      let meetingLink: string | undefined;

      // Create Google Calendar event
      try {
        const businessTimeZone = 'Australia/Sydney';
        const appointmentDate = new Date(fullAppointment.date);

        // Parse time strings
        const startTimeMatch = fullAppointment.time_slot.start_time.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
        );
        const endTimeMatch = fullAppointment.time_slot.end_time.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
        );

        if (startTimeMatch && endTimeMatch) {
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

          // Create datetime strings
          const year = appointmentDate.getFullYear();
          const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
          const day = String(appointmentDate.getDate()).padStart(2, '0');

          const startTimeStr = `${year}-${month}-${day}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+11:00`;
          const endTimeStr = `${year}-${month}-${day}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+11:00`;

          const startDateTimeUTC = new Date(startTimeStr);
          const endDateTimeUTC = new Date(endTimeStr);

          // Create Google Calendar event
          const calendarResult =
            await GoogleCalendarService.createCalendarEvent({
              appointmentId: fullAppointment.id,
              counselorId: fullAppointment.counselor_id,
              clientEmail: fullAppointment.client.email,
              clientName: `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`,
              startDateTime: startDateTimeUTC,
              endDateTime: endDateTimeUTC,
              timeZone: businessTimeZone,
            });

          if (calendarResult) {
            console.log(
              `Google Calendar event created for manual appointment ${fullAppointment.id}`,
            );
            meetingLink = calendarResult.meetingLink ?? undefined;

            // Update appointment with event_id
            await prisma.appointment.update({
              where: { id: fullAppointment.id },
              data: { event_id: calendarResult.eventId },
            });
          }
        }
      } catch (calendarError) {
        console.error(
          'Error creating Google Calendar event for manual appointment:',
          calendarError,
        );
        // Continue to send email even if calendar creation fails
      }

      // Send confirmation email to client and notification email to counselor
      try {
        const sendMail = (await import('../../utils/mailer')).default;
        const AppointmentUtils = (await import('./appointment.utils')).default;

        const clientName = `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`;
        const appointmentDate = new Date(fullAppointment.date).toLocaleDateString(
          'en-US',
          {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        );
        const appointmentTime = `${subtractTimezoneOffset(fullAppointment.time_slot.start_time)} - ${subtractTimezoneOffset(fullAppointment.time_slot.end_time)}`;

        // Email to client
        const clientEmailBody = AppointmentUtils.createAppointmentConfirmationEmail({
          clientName,
          counselorName: fullAppointment.counselor.name,
          appointmentDate,
          appointmentTime,
          sessionType: fullAppointment.session_type,
          meetingLink,
          counselorId: fullAppointment.counselor_id,
        });

        // Email to counselor
        const counselorEmailBody = AppointmentUtils.createCounselorNotificationEmail({
          counselorName: fullAppointment.counselor.name,
          clientName,
          appointmentDate,
          appointmentTime,
          sessionType: fullAppointment.session_type,
          clientEmail: fullAppointment.client.email,
          clientPhone: fullAppointment.client.phone,
          meetingLink,
          notes: fullAppointment.notes ?? undefined,
        });

        // Send both emails in parallel
        await Promise.all([
          sendMail(
            fullAppointment.client.email,
            'Appointment Confirmed - Alexander Rodriguez Counseling',
            clientEmailBody,
          ),
          sendMail(
            fullAppointment.counselor.email,
            'New Appointment Scheduled - Alexander Rodriguez Counseling',
            counselorEmailBody,
          ),
        ]);

        console.log(
          `Confirmation email sent to client: ${fullAppointment.client.email}`,
        );
        console.log(
          `Notification email sent to counselor: ${fullAppointment.counselor.email}`,
        );
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
      }
    } catch (error) {
      console.error('Error in post-appointment creation tasks:', error);
    }
  });

  return appointment;
};

const CreateManualAppointmentWithPayment = async (
  counselorId: string,
  data: IManualAppointmentData & { amount: number; currency?: string },
) => {
  const TokenGenerator = (await import('../../utils/tokenGenerator')).default;

  // Get counselor details first
  const counselor = await prisma.user.findUnique({
    where: { id: counselorId },
  });

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }

  // Check if time slot is available
  const timeSlot = await prisma.timeSlot.findFirst({
    where: {
      id: data.timeSlotId,
      status: 'AVAILABLE',
    },
    include: {
      calendar: {
        include: {
          counselor: true,
        },
      },
    },
  });

  if (!timeSlot) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      'Time slot is not available',
    );
  }

  // Verify the session type matches the slot type
  if (timeSlot.type !== data.sessionType) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Session type does not match the selected time slot type',
    );
  }

  // Verify the counselor matches
  if (timeSlot.calendar.counselor_id !== counselorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Time slot does not belong to this counselor',
    );
  }

  // Generate payment token and expiry
  const paymentToken = TokenGenerator.generatePaymentToken();
  const paymentTokenExpiry = TokenGenerator.generateTokenExpiry(1440); // 2 months (60 days)

  // Create appointment with payment token in transaction
  // Appointment is CONFIRMED and payment is YET_TO_PAY (no PROCESSING state)
  const appointment = await prisma.$transaction(
    async (tx) => {
      // Upsert client
      const client = await tx.client.upsert({
        where: {
          email: data.email,
        },
        update: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          date_of_birth: new Date(data.dateOfBirth).toISOString(),
          gender: data.gender,
        },
        create: {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          date_of_birth: new Date(data.dateOfBirth).toISOString(),
          gender: data.gender,
        },
      });

      // Create appointment with CONFIRMED status and payment YET_TO_PAY, update time slot to BOOKED
      const [, newAppointment] = await Promise.all([
        // Mark the time slot as BOOKED (appointment is confirmed immediately)
        tx.timeSlot.update({
          where: { id: data.timeSlotId },
          data: { status: 'BOOKED' },
        }),
        // Create Appointment with CONFIRMED status and payment YET_TO_PAY
        tx.appointment.create({
          data: {
            client_id: client.id,
            time_slot_id: data.timeSlotId,
            counselor_id: counselorId,
            date: new Date(data.date).toISOString(),
            session_type: data.sessionType,
            notes: data.notes || '',
            status: 'CONFIRMED', // Confirmed immediately
            payment_token: paymentToken,
            payment_token_expiry: paymentTokenExpiry,
            payment: {
              create: {
                client_id: client.id,
                amount: data.amount,
                currency: data.currency || 'AUD',
                status: 'YET_TO_PAY', // Payment pending but appointment confirmed
              },
            },
          },
          include: {
            client: true,
            counselor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            time_slot: true,
            payment: {
              select: {
                amount: true,
                currency: true,
                status: true,
              },
            },
          },
        }),
        // Create counselor-client relationship (if not exists)
        tx.counselorClient.upsert({
          where: {
            counselor_id_client_id: {
              counselor_id: counselorId,
              client_id: client.id,
            },
          },
          create: {
            counselor_id: counselorId,
            client_id: client.id,
          },
          update: {}, // No update needed if already exists
        }),
      ]);

      return newAppointment;
    },
    {
      timeout: 10000,
      maxWait: 5000,
    },
  );

  // Create Google Calendar event and send confirmation email with payment link asynchronously
  setImmediate(async () => {
    try {
      // Get full appointment details with calendar info
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
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

      if (!fullAppointment) {
        console.error('Appointment not found after creation');
        return;
      }

      let meetingLink: string | undefined;

      // Create Google Calendar event (since appointment is confirmed)
      try {
        const businessTimeZone = 'Australia/Sydney';
        const appointmentDate = new Date(fullAppointment.date);

        // Parse time strings
        const startTimeMatch = fullAppointment.time_slot.start_time.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
        );
        const endTimeMatch = fullAppointment.time_slot.end_time.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
        );

        if (startTimeMatch && endTimeMatch) {
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

          // Create datetime strings
          const year = appointmentDate.getFullYear();
          const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
          const day = String(appointmentDate.getDate()).padStart(2, '0');

          const startTimeStr = `${year}-${month}-${day}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+11:00`;
          const endTimeStr = `${year}-${month}-${day}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+11:00`;

          const startDateTimeUTC = new Date(startTimeStr);
          const endDateTimeUTC = new Date(endTimeStr);

          // Create Google Calendar event
          const calendarResult =
            await GoogleCalendarService.createCalendarEvent({
              appointmentId: fullAppointment.id,
              counselorId: fullAppointment.counselor_id,
              clientEmail: fullAppointment.client.email,
              clientName: `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`,
              startDateTime: startDateTimeUTC,
              endDateTime: endDateTimeUTC,
              timeZone: businessTimeZone,
            });

          if (calendarResult) {
            console.log(
              `Google Calendar event created for appointment with payment ${fullAppointment.id}`,
            );
            meetingLink = calendarResult.meetingLink ?? undefined;

            // Update appointment with event_id
            await prisma.appointment.update({
              where: { id: fullAppointment.id },
              data: { event_id: calendarResult.eventId },
            });
          }
        }
      } catch (calendarError) {
        console.error(
          'Error creating Google Calendar event for appointment with payment:',
          calendarError,
        );
        // Continue to send email even if calendar creation fails
      }

      // Send confirmation email with payment link to client and notification to counselor
      try {
        const sendMail = (await import('../../utils/mailer')).default;
        const AppointmentUtils = (await import('./appointment.utils')).default;
        const config = (await import('../../config')).default;

        const clientName = `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`;
        const formattedAppointmentDate = new Date(fullAppointment.date).toLocaleDateString(
          'en-US',
          {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        );
        const appointmentTime = `${subtractTimezoneOffset(fullAppointment.time_slot.start_time)} - ${subtractTimezoneOffset(fullAppointment.time_slot.end_time)}`;

        // Construct payment link
        const paymentLink = `${config.frontend_base_url}/payment/${paymentToken}`;

        // Email to client with confirmation + payment link (combined email)
        const clientEmailBody = AppointmentUtils.createConfirmedWithPaymentEmail({
          clientName,
          counselorName: fullAppointment.counselor.name,
          appointmentDate: formattedAppointmentDate,
          appointmentTime,
          sessionType: fullAppointment.session_type,
          meetingLink,
          counselorId: fullAppointment.counselor_id,
          amount: data.amount,
          currency: data.currency || 'AUD',
          paymentLink,
          tokenExpiry: TokenGenerator.formatExpiryDate(paymentTokenExpiry),
        });

        // Email to counselor - notification about confirmed appointment with payment pending
        const counselorEmailBody = AppointmentUtils.createCounselorNotificationEmail({
          counselorName: fullAppointment.counselor.name,
          clientName,
          appointmentDate: formattedAppointmentDate,
          appointmentTime,
          sessionType: fullAppointment.session_type,
          clientEmail: fullAppointment.client.email,
          clientPhone: fullAppointment.client.phone,
          meetingLink,
          notes: fullAppointment.notes ?? undefined,
        });

        // Send both emails in parallel
        await Promise.all([
          sendMail(
            fullAppointment.client.email,
            'Appointment Confirmed - Payment Required - Alexander Rodriguez Counseling',
            clientEmailBody,
          ),
          sendMail(
            fullAppointment.counselor.email,
            'New Appointment Confirmed (Payment Pending) - Alexander Rodriguez Counseling',
            counselorEmailBody,
          ),
        ]);

        console.log(
          `Confirmation email with payment link sent to client: ${fullAppointment.client.email}`,
        );
        console.log(
          `Notification email sent to counselor: ${fullAppointment.counselor.email}`,
        );
      } catch (emailError) {
        console.error('Error sending confirmation and notification emails:', emailError);
      }
    } catch (error) {
      console.error('Error in post-appointment creation tasks:', error);
    }
  });

  return {
    ...appointment,
    paymentToken,
    paymentLink: `${(await import('../../config')).default.frontend_base_url}/payment/${paymentToken}`,
  };
};

const GetAppointmentByToken = async (token: string) => {
  const TokenGenerator = (await import('../../utils/tokenGenerator')).default;

  const appointment = await prisma.appointment.findUnique({
    where: { payment_token: token },
    include: {
      client: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
      counselor: {
        select: {
          name: true,
          email: true,
          specialization: true,
        },
      },
      time_slot: {
        select: {
          start_time: true,
          end_time: true,
        },
      },
      payment: {
        select: {
          amount: true,
          currency: true,
          status: true,
          transaction_id: true,
          payment_gateway_data: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Appointment not found or invalid token',
    );
  }

  // Check if token is expired
  if (
    appointment.payment_token_expiry &&
    TokenGenerator.isTokenExpired(appointment.payment_token_expiry)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment link has expired. Please contact support.',
    );
  }

  // Check if already paid (only check payment status, not appointment status)
  // Appointment can be CONFIRMED with YET_TO_PAY payment status
  if (appointment.payment?.status === 'PAID') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This appointment has already been paid for.',
    );
  }

  // Apply timezone conversion to time slot
  return {
    ...appointment,
    time_slot: {
      start_time: subtractTimezoneOffset(appointment.time_slot.start_time), // Subtract 5 hours when fetching
      end_time: subtractTimezoneOffset(appointment.time_slot.end_time), // Subtract 5 hours when fetching
    },
  };
};

const ConfirmManualPayment = async (
  appointmentId: string,
  counselorId: string,
) => {
  // Get appointment with payment and time slot details
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      payment: true,
      time_slot: true,
      client: true,
      counselor: true,
    },
  });

  if (!appointment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Appointment not found');
  }

  // Verify counselor owns this appointment
  if (appointment.counselor_id !== counselorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to confirm this appointment',
    );
  }

  // Check if appointment has payment_token (manual booking)
  if (!appointment.payment_token) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This is not a manual booking with payment',
    );
  }

  // Check if payment is already PAID
  if (appointment.payment?.status === 'PAID') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment has already been confirmed for this appointment',
    );
  }

  // Allow confirming payment when:
  // 1. Appointment is PENDING (initial state) - time slot should be PROCESSING
  // 2. Appointment is CONFIRMED but payment is YET_TO_PAY - time slot is already BOOKED
  const isPending = appointment.status === 'PENDING';
  const isConfirmedYetToPay =
    appointment.status === 'CONFIRMED' &&
    (appointment.payment?.status === 'YET_TO_PAY' ||
      appointment.payment?.status === 'PENDING');

  if (!isPending && !isConfirmedYetToPay) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot confirm payment. Appointment status is ${appointment.status} and payment status is ${appointment.payment?.status || 'unknown'}`,
    );
  }

  // Check time slot status only for PENDING appointments
  if (isPending && appointment.time_slot.status !== 'PROCESSING') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot confirm payment. Time slot status is ${appointment.time_slot.status}`,
    );
  }

  // Update in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Only update time slot if appointment is PENDING (not yet confirmed)
    if (isPending) {
      // 1. Update time slot status to BOOKED
      await tx.timeSlot.update({
        where: { id: appointment.time_slot_id },
        data: { status: 'BOOKED' },
      });
    }

    // Only update appointment status if not already CONFIRMED
    const updatedAppointment = await tx.appointment.update({
      where: { id: appointmentId },
      data: isPending ? { status: 'CONFIRMED' } : {},
      include: {
        client: true,
        counselor: true,
        time_slot: true,
        payment: true,
      },
    });

    // Update payment status to PAID
    if (appointment.payment) {
      await tx.payment.update({
        where: { id: appointment.payment.id },
        data: {
          status: 'PAID',
          payment_method: 'manual',
          transaction_id: `manual-payment-${Date.now()}`,
          processed_at: new Date(),
        },
      });
    }

    return updatedAppointment;
  });

  // Create Google Calendar event and send confirmation email asynchronously
  setImmediate(async () => {
    try {
      const fullAppointment = await prisma.appointment.findUnique({
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

      if (!fullAppointment) {
        console.error('Appointment not found after payment confirmation');
        return;
      }

      let meetingLink: string | undefined;

      // Only create Google Calendar event if one doesn't exist already
      // (If appointment was marked as YET_TO_PAY first, calendar event already exists)
      if (!fullAppointment.event_id) {
        try {
          const businessTimeZone = 'Australia/Sydney';
          const appointmentDate = new Date(fullAppointment.date);

          const startTimeMatch = fullAppointment.time_slot.start_time.match(
            /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
          );
          const endTimeMatch = fullAppointment.time_slot.end_time.match(
            /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
          );

          if (startTimeMatch && endTimeMatch) {
            let startHour = parseInt(startTimeMatch[1]);
            const startMinute = parseInt(startTimeMatch[2]);
            const startPeriod = startTimeMatch[3].toUpperCase();

            if (startPeriod === 'PM' && startHour !== 12) {
              startHour += 12;
            } else if (startPeriod === 'AM' && startHour === 12) {
              startHour = 0;
            }

            let endHour = parseInt(endTimeMatch[1]);
            const endMinute = parseInt(endTimeMatch[2]);
            const endPeriod = endTimeMatch[3].toUpperCase();

            if (endPeriod === 'PM' && endHour !== 12) {
              endHour += 12;
            } else if (endPeriod === 'AM' && endHour === 12) {
              endHour = 0;
            }

            const year = appointmentDate.getFullYear();
            const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
            const day = String(appointmentDate.getDate()).padStart(2, '0');

            const startTimeStr = `${year}-${month}-${day}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+11:00`;
            const endTimeStr = `${year}-${month}-${day}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+11:00`;

            const startDateTimeUTC = new Date(startTimeStr);
            const endDateTimeUTC = new Date(endTimeStr);

            const calendarResult =
              await GoogleCalendarService.createCalendarEvent({
                appointmentId: fullAppointment.id,
                counselorId: fullAppointment.counselor_id,
                clientEmail: fullAppointment.client.email,
                clientName: `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`,
                startDateTime: startDateTimeUTC,
                endDateTime: endDateTimeUTC,
                timeZone: businessTimeZone,
              });

            if (calendarResult) {
              meetingLink = calendarResult.meetingLink ?? undefined;
              await prisma.appointment.update({
                where: { id: fullAppointment.id },
                data: { event_id: calendarResult.eventId },
              });
            }
          }
        } catch (calendarError) {
          console.error('Error creating Google Calendar event:', calendarError);
        }
      }

      // Send confirmation emails
      try {
        const sendMail = (await import('../../utils/mailer')).default;
        const AppointmentUtils = (await import('./appointment.utils')).default;

        const clientName = `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`;
        const appointmentDate = new Date(
          fullAppointment.date,
        ).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const appointmentTime = `${subtractTimezoneOffset(fullAppointment.time_slot.start_time)} - ${subtractTimezoneOffset(fullAppointment.time_slot.end_time)}`;

        const clientEmailBody =
          AppointmentUtils.createAppointmentConfirmationEmail({
            clientName,
            counselorName: fullAppointment.counselor.name,
            appointmentDate,
            appointmentTime,
            sessionType: fullAppointment.session_type,
            meetingLink,
            counselorId: fullAppointment.counselor_id,
          });

        const counselorEmailBody =
          AppointmentUtils.createCounselorNotificationEmail({
            counselorName: fullAppointment.counselor.name,
            clientName,
            appointmentDate,
            appointmentTime,
            sessionType: fullAppointment.session_type,
            clientEmail: fullAppointment.client.email,
            clientPhone: fullAppointment.client.phone,
            meetingLink,
            notes: fullAppointment.notes ?? undefined,
          });

        await Promise.all([
          sendMail(
            fullAppointment.client.email,
            'Payment Confirmed - Appointment Confirmed',
            clientEmailBody,
          ),
          sendMail(
            fullAppointment.counselor.email,
            'Payment Received - Appointment Confirmed',
            counselorEmailBody,
          ),
        ]);

        console.log(
          `Confirmation emails sent after manual payment confirmation`,
        );
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
      }
    } catch (error) {
      console.error('Error in post-payment confirmation tasks:', error);
    }
  });

  return result;
};

const MarkYetToPay = async (appointmentId: string, counselorId: string) => {
  // Get appointment with payment and time slot details
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      payment: true,
      time_slot: true,
      client: true,
      counselor: true,
    },
  });

  if (!appointment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Appointment not found');
  }

  // Verify counselor owns this appointment
  if (appointment.counselor_id !== counselorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this appointment',
    );
  }

  // Check if appointment has payment_token (manual booking)
  if (!appointment.payment_token) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This is not a manual booking with payment',
    );
  }

  // Check if appointment is in PENDING status
  if (appointment.status !== 'PENDING') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark as yet to pay. Appointment status is ${appointment.status}`,
    );
  }

  // Check if time slot is in PROCESSING status
  if (appointment.time_slot.status !== 'PROCESSING') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark as yet to pay. Time slot status is ${appointment.time_slot.status}`,
    );
  }

  // Update in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update time slot status to BOOKED
    await tx.timeSlot.update({
      where: { id: appointment.time_slot_id },
      data: { status: 'BOOKED' },
    });

    // 2. Update appointment status to CONFIRMED
    const updatedAppointment = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
      include: {
        client: true,
        counselor: true,
        time_slot: true,
        payment: true,
      },
    });

    // 3. Update payment status to YET_TO_PAY
    if (appointment.payment) {
      await tx.payment.update({
        where: { id: appointment.payment.id },
        data: {
          status: 'YET_TO_PAY',
          payment_method: 'manual',
          transaction_id: `yet-to-pay-${Date.now()}`,
          processed_at: new Date(),
        },
      });
    }

    return updatedAppointment;
  });

  // Create Google Calendar event and send confirmation email asynchronously
  setImmediate(async () => {
    try {
      const fullAppointment = await prisma.appointment.findUnique({
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

      if (!fullAppointment) {
        console.error('Appointment not found after marking yet to pay');
        return;
      }

      let meetingLink: string | undefined;

      // Create Google Calendar event
      try {
        const businessTimeZone = 'Australia/Sydney';
        const appointmentDate = new Date(fullAppointment.date);

        const startTimeMatch = fullAppointment.time_slot.start_time.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
        );
        const endTimeMatch = fullAppointment.time_slot.end_time.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
        );

        if (startTimeMatch && endTimeMatch) {
          let startHour = parseInt(startTimeMatch[1]);
          const startMinute = parseInt(startTimeMatch[2]);
          const startPeriod = startTimeMatch[3].toUpperCase();

          if (startPeriod === 'PM' && startHour !== 12) {
            startHour += 12;
          } else if (startPeriod === 'AM' && startHour === 12) {
            startHour = 0;
          }

          let endHour = parseInt(endTimeMatch[1]);
          const endMinute = parseInt(endTimeMatch[2]);
          const endPeriod = endTimeMatch[3].toUpperCase();

          if (endPeriod === 'PM' && endHour !== 12) {
            endHour += 12;
          } else if (endPeriod === 'AM' && endHour === 12) {
            endHour = 0;
          }

          const year = appointmentDate.getFullYear();
          const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
          const day = String(appointmentDate.getDate()).padStart(2, '0');

          const startTimeStr = `${year}-${month}-${day}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+11:00`;
          const endTimeStr = `${year}-${month}-${day}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+11:00`;

          const startDateTimeUTC = new Date(startTimeStr);
          const endDateTimeUTC = new Date(endTimeStr);

          const calendarResult =
            await GoogleCalendarService.createCalendarEvent({
              appointmentId: fullAppointment.id,
              counselorId: fullAppointment.counselor_id,
              clientEmail: fullAppointment.client.email,
              clientName: `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`,
              startDateTime: startDateTimeUTC,
              endDateTime: endDateTimeUTC,
              timeZone: businessTimeZone,
            });

          if (calendarResult) {
            meetingLink = calendarResult.meetingLink ?? undefined;
            await prisma.appointment.update({
              where: { id: fullAppointment.id },
              data: { event_id: calendarResult.eventId },
            });
          }
        }
      } catch (calendarError) {
        console.error('Error creating Google Calendar event:', calendarError);
      }

      // Send confirmation emails
      try {
        const sendMail = (await import('../../utils/mailer')).default;
        const AppointmentUtils = (await import('./appointment.utils')).default;

        const clientName = `${fullAppointment.client.first_name} ${fullAppointment.client.last_name}`;
        const appointmentDate = new Date(
          fullAppointment.date,
        ).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const appointmentTime = `${subtractTimezoneOffset(fullAppointment.time_slot.start_time)} - ${subtractTimezoneOffset(fullAppointment.time_slot.end_time)}`;

        const clientEmailBody =
          AppointmentUtils.createAppointmentConfirmationEmail({
            clientName,
            counselorName: fullAppointment.counselor.name,
            appointmentDate,
            appointmentTime,
            sessionType: fullAppointment.session_type,
            meetingLink,
            counselorId: fullAppointment.counselor_id,
          });

        const counselorEmailBody =
          AppointmentUtils.createCounselorNotificationEmail({
            counselorName: fullAppointment.counselor.name,
            clientName,
            appointmentDate,
            appointmentTime,
            sessionType: fullAppointment.session_type,
            clientEmail: fullAppointment.client.email,
            clientPhone: fullAppointment.client.phone,
            meetingLink,
            notes: fullAppointment.notes ?? undefined,
          });

        await Promise.all([
          sendMail(
            fullAppointment.client.email,
            'Appointment Confirmed - Payment Pending',
            clientEmailBody,
          ),
          sendMail(
            fullAppointment.counselor.email,
            'Appointment Confirmed - Payment Pending',
            counselorEmailBody,
          ),
        ]);

        console.log(
          `Confirmation emails sent after marking yet to pay`,
        );
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
      }
    } catch (error) {
      console.error('Error in post-yet-to-pay tasks:', error);
    }
  });

  return result;
};

const AppointmentService = {
  GetCounselorAppointmentsById,
  GetCounselorAppointmentDetailsById,
  CompleteAppointmentById,
  CancelAppointmentById,
  RescheduleAppointmentById,
  CreateManualAppointment,
  CreateManualAppointmentWithPayment,
  GetAppointmentByToken,
  ConfirmManualPayment,
  MarkYetToPay,
};

export default AppointmentService;
