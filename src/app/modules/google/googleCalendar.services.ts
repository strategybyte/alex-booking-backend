import { calendar_v3 } from 'googleapis';
import GoogleOAuthService from './google.services';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface CreateEventData {
  appointmentId: string;
  counselorId: string;
  clientEmail: string;
  clientName: string;
  startDateTime: Date;
  endDateTime: Date;
  timeZone?: string;
}

// Create Google Calendar event with Google Meet
const createCalendarEvent = async (data: CreateEventData) => {
  console.log('Creating Google Calendar event for appointment:', data);

  // Validate dates before proceeding
  if (
    !data.startDateTime ||
    !data.endDateTime ||
    isNaN(data.startDateTime.getTime()) ||
    isNaN(data.endDateTime.getTime())
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid date values: startDateTime=${data.startDateTime}, endDateTime=${data.endDateTime}`,
    );
  }

  try {
    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
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
      throw new AppError(httpStatus.NOT_FOUND, 'Appointment not found');
    }

    // Check if counselor has Google Calendar connected
    const isConnected = await GoogleOAuthService.isCalendarConnected(
      data.counselorId,
    );
    if (!isConnected) {
      console.warn(
        `Google Calendar not connected for counselor ${data.counselorId}`,
      );
      return null; // Don't fail the payment, just skip calendar creation
    }

    // Get authenticated calendar client
    const calendar = await GoogleOAuthService.getCalendarClient(
      data.counselorId,
    );

    // Create event details
    const eventTitle = `Counselling Session - ${data.clientName}`;

    // Use the business timezone for formatting display dates
    const businessTimeZone = data.timeZone || 'Australia/Sydney';

    // Convert UTC times back to business timezone for display in description
    // data.startDateTime and data.endDateTime are already in UTC from payment service
    const localStartTime = toZonedTime(data.startDateTime, businessTimeZone);
    const localEndTime = toZonedTime(data.endDateTime, businessTimeZone);

    console.log('=== GOOGLE CALENDAR DEBUG ===');
    console.log(
      'Received UTC times:',
      data.startDateTime.toISOString(),
      '-',
      data.endDateTime.toISOString(),
    );
    console.log(
      'Converted to local for display:',
      localStartTime.toLocaleString(),
      '-',
      localEndTime.toLocaleString(),
    );
    console.log('Business timezone:', businessTimeZone);

    let formattedDate, formattedStartTime, formattedEndTime;
    try {
      formattedDate = format(localStartTime, 'PPPP');
      formattedStartTime = format(localStartTime, 'p');
      formattedEndTime = format(localEndTime, 'p');
    } catch (error) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Failed to format dates: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const eventDescription = `
Counselling session with ${data.clientName}
Date: ${formattedDate}
Time: ${formattedStartTime} - ${formattedEndTime} (${businessTimeZone})
Session Type: ${appointment.session_type}
${appointment.notes ? `Notes: ${appointment.notes}` : ''}

Appointment ID: ${data.appointmentId}
    `.trim();

    const event: calendar_v3.Schema$Event = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: data.startDateTime.toISOString(), // This is already UTC
        timeZone: businessTimeZone, // This tells Google what timezone to display in
      },
      end: {
        dateTime: data.endDateTime.toISOString(), // This is already UTC
        timeZone: businessTimeZone, // This tells Google what timezone to display in
      },
      attendees: [
        {
          email: appointment.counselor.email,
          displayName: appointment.counselor.name,
          responseStatus: 'accepted',
          organizer: true,
        },
        {
          email: data.clientEmail,
          displayName: data.clientName,
          responseStatus: 'needsAction',
          optional: false,
        },
      ],
      conferenceData: {
        createRequest: {
          requestId: `${data.appointmentId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'email', minutes: 60 }, // 1 hour before
          { method: 'popup', minutes: 15 }, // 15 minutes before
        ],
      },
      guestsCanSeeOtherGuests: true,
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      visibility: 'public',
      status: 'confirmed',
    };

    // Create the event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all', // Send email invitations to all attendees
      sendNotifications: true, // Ensure notifications are sent
    });

    const createdEvent = response.data;
    const meetingLink =
      createdEvent.hangoutLink ||
      createdEvent.conferenceData?.entryPoints?.[0]?.uri;

    if (!meetingLink) {
      console.warn('No Google Meet link was created for the event');
    }

    // Save meeting details to database
    const meeting = await prisma.meeting.create({
      data: {
        appointment_id: data.appointmentId,
        platform: 'GOOGLE_MEET',
        link: meetingLink || '',
      },
    });

    console.log(
      `Google Calendar event created successfully for appointment ${data.appointmentId}`,
    );
    console.log(`Event ID: ${createdEvent.id}`);
    console.log(`Meeting Link: ${meetingLink}`);
    console.log(`Event HTML Link: ${createdEvent.htmlLink}`);
    console.log(`Event attendees:`, createdEvent.attendees);

    // Verify the event was created correctly by fetching it back
    try {
      const verifyEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: createdEvent.id!,
      });
      console.log(
        `Event verification - Status: ${verifyEvent.data.status}, Visibility: ${verifyEvent.data.visibility}`,
      );

      // Sometimes updating the event immediately after creation helps with visibility
      // This is a workaround for Google Calendar API quirks
      await calendar.events.patch({
        calendarId: 'primary',
        eventId: createdEvent.id!,
        requestBody: {
          attendees: event.attendees,
        },
        sendUpdates: 'all',
      });
      console.log('Event attendees updated to ensure visibility');
    } catch (verifyError) {
      console.warn('Failed to verify/update created event:', verifyError);
    }

    return {
      eventId: createdEvent.id,
      meetingLink: meetingLink,
      meetingId: meeting.id,
      htmlLink: createdEvent.htmlLink,
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);

    // If it's a Google API error, provide more specific error message
    if (error instanceof Error && 'code' in error) {
      const googleError = error as any;
      if (googleError.code === 401) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'Google Calendar access expired. Please reconnect your calendar.',
        );
      } else if (googleError.code === 403) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Insufficient permissions for Google Calendar. Please reconnect with proper permissions.',
        );
      }
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to create Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

// Update calendar event
const updateCalendarEvent = async (
  eventId: string,
  counselorId: string,
  updates: Partial<calendar_v3.Schema$Event>,
) => {
  try {
    const calendar = await GoogleOAuthService.getCalendarClient(counselorId);

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updates,
      sendUpdates: 'all',
    });

    return response.data;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update Google Calendar event',
    );
  }
};

// Cancel calendar event
const cancelCalendarEvent = async (eventId: string, counselorId: string) => {
  try {
    const calendar = await GoogleOAuthService.getCalendarClient(counselorId);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
    });

    console.log(`Google Calendar event ${eventId} cancelled successfully`);
  } catch (error: any) {
    console.error('Error cancelling Google Calendar event:', error);

    // Handle specific Google Calendar errors gracefully
    if (error.code === 410 || error.status === 410) {
      // Event was already deleted from Google Calendar
      console.log(
        `Google Calendar event ${eventId} was already deleted, skipping cancellation`,
      );
      return; // Don't throw error, treat as success
    }

    if (error.code === 404 || error.status === 404) {
      // Event not found in Google Calendar
      console.log(
        `Google Calendar event ${eventId} not found, may have been already deleted`,
      );
      return; // Don't throw error, treat as success
    }

    // For other errors, still throw to maintain error handling
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to cancel Google Calendar event',
    );
  }
};

// Get calendar event details
const getCalendarEvent = async (eventId: string, counselorId: string) => {
  try {
    const calendar = await GoogleOAuthService.getCalendarClient(counselorId);

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    return response.data;
  } catch (error) {
    console.error('Error getting Google Calendar event:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to get Google Calendar event',
    );
  }
};

// Reschedule calendar event with new time and details
const rescheduleCalendarEvent = async (
  eventId: string,
  counselorId: string,
  data: {
    appointmentId: string;
    clientEmail: string;
    clientName: string;
    startDateTime: Date;
    endDateTime: Date;
    timeZone?: string;
  },
) => {
  console.log('Rescheduling Google Calendar event:', eventId, data);

  // Validate dates before proceeding
  if (
    !data.startDateTime ||
    !data.endDateTime ||
    isNaN(data.startDateTime.getTime()) ||
    isNaN(data.endDateTime.getTime())
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid date values: startDateTime=${data.startDateTime}, endDateTime=${data.endDateTime}`,
    );
  }

  try {
    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
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
      throw new AppError(httpStatus.NOT_FOUND, 'Appointment not found');
    }

    // Check if counselor has Google Calendar connected
    const isConnected =
      await GoogleOAuthService.isCalendarConnected(counselorId);
    if (!isConnected) {
      console.warn(
        `Google Calendar not connected for counselor ${counselorId}`,
      );
      return null; // Don't fail the reschedule, just skip calendar update
    }

    // Get authenticated calendar client
    const calendar = await GoogleOAuthService.getCalendarClient(counselorId);

    // Create updated event details
    const eventTitle = `Counselling Session - ${data.clientName}`;

    // Use the business timezone for formatting display dates
    const businessTimeZone = data.timeZone || 'Australia/Sydney';

    // Convert UTC times back to business timezone for display in description
    const localStartTime = toZonedTime(data.startDateTime, businessTimeZone);
    const localEndTime = toZonedTime(data.endDateTime, businessTimeZone);

    console.log('=== GOOGLE CALENDAR RESCHEDULE DEBUG ===');
    console.log(
      'New UTC times:',
      data.startDateTime.toISOString(),
      '-',
      data.endDateTime.toISOString(),
    );
    console.log(
      'Converted to local for display:',
      localStartTime.toLocaleString(),
      '-',
      localEndTime.toLocaleString(),
    );

    let formattedDate, formattedStartTime, formattedEndTime;
    try {
      formattedDate = format(localStartTime, 'PPPP');
      formattedStartTime = format(localStartTime, 'p');
      formattedEndTime = format(localEndTime, 'p');
    } catch (error) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Failed to format dates: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const eventDescription = `
Counselling session with ${data.clientName} (RESCHEDULED)
Date: ${formattedDate}
Time: ${formattedStartTime} - ${formattedEndTime} (${businessTimeZone})
Session Type: ${appointment.session_type}
${appointment.notes ? `Notes: ${appointment.notes}` : ''}

Appointment ID: ${data.appointmentId}
    `.trim();

    const eventUpdates: calendar_v3.Schema$Event = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: data.startDateTime.toISOString(), // This is already UTC
        timeZone: businessTimeZone, // This tells Google what timezone to display in
      },
      end: {
        dateTime: data.endDateTime.toISOString(), // This is already UTC
        timeZone: businessTimeZone, // This tells Google what timezone to display in
      },
      attendees: [
        {
          email: appointment.counselor.email,
          displayName: appointment.counselor.name,
          responseStatus: 'accepted',
          organizer: true,
        },
        {
          email: data.clientEmail,
          displayName: data.clientName,
          responseStatus: 'needsAction',
          optional: false,
        },
      ],
    };

    // Update the event
    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: eventUpdates,
      sendUpdates: 'all', // Send updated invitations to all attendees
      sendNotifications: true, // Ensure notifications are sent
    });

    const updatedEvent = response.data;

    console.log(
      `Google Calendar event rescheduled successfully for appointment ${data.appointmentId}`,
    );
    console.log(`Event ID: ${updatedEvent.id}`);
    console.log(`Event HTML Link: ${updatedEvent.htmlLink}`);

    return {
      eventId: updatedEvent.id,
      htmlLink: updatedEvent.htmlLink,
    };
  } catch (error) {
    console.error('Error rescheduling Google Calendar event:', error);

    // If it's a Google API error, provide more specific error message
    if (error instanceof Error && 'code' in error) {
      const googleError = error as any;
      if (googleError.code === 401) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'Google Calendar access expired. Please reconnect your calendar.',
        );
      } else if (googleError.code === 403) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Insufficient permissions for Google Calendar. Please reconnect with proper permissions.',
        );
      }
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to reschedule Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

const GoogleCalendarService = {
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent,
  getCalendarEvent,
  rescheduleCalendarEvent,
};

export default GoogleCalendarService;
