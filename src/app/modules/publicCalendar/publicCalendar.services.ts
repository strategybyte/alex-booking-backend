import { Prisma, SessionType } from '@prisma/client';
import prisma from '../../utils/prisma';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE_OFFSET_HOURS = 5;

/**
 * Add timezone offset to time string (for saving to DB)
 * @param timeString - Time like "8:00 AM"
 * @returns Time with offset added like "1:00 PM"
 */
const addTimezoneOffset = (timeString: string): string => {
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

  // Add timezone offset
  hours = (hours + TIMEZONE_OFFSET_HOURS) % 24;

  // Convert back to 12-hour format
  const newMeridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${newMeridiem}`;
};

/**
 * Subtract timezone offset from time string (for fetching from DB)
 * @param timeString - Time like "1:00 PM"
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

const GetCounselorCalendar = async (counselorId: string) => {
  const BUSINESS_TIMEZONE = 'Australia/Sydney';

  const calendarDates = await prisma.calendar.findMany({
    where: {
      counselor_id: counselorId,
      counselor: {
        is_deleted: false,
        is_calendar_connected: true,
      },
    },
    select: {
      id: true,
      date: true,
      counselor: {
        select: {
          id: true,
          name: true,
          email: true,
          profile_picture: true,
        },
      },
      _count: {
        select: {
          time_slots: {
            where: {
              status: 'AVAILABLE',
            },
          },
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  const calendar = calendarDates.map((item) => {
    // Convert UTC date to Sydney timezone for display
    const sydneyDate = toZonedTime(item.date, BUSINESS_TIMEZONE);
    const dateStr = sydneyDate.toISOString().split('T')[0];

    return {
      id: item.id,
      date: dateStr, // Display date in Sydney timezone
      isoDate: item.date, // Keep original UTC date
      counselor: item.counselor,
      availableSlots: item._count.time_slots,
      hasAvailableSlots: item._count.time_slots > 0,
    };
  });

  return { calendar };
};

const GetCounselorDateSlots = async (
  calendarId: string,
  date: string,
  type: SessionType,
) => {
  const BUSINESS_TIMEZONE = 'Australia/Sydney';

  const where: Prisma.TimeSlotWhereInput = {
    calendar: {
      date: new Date(date),
      counselor_id: calendarId,
    },
    status: 'AVAILABLE',
  };

  if (type) {
    where.type = type;
  }

  const slots = await prisma.timeSlot.findMany({
    where,
  });

  // Helper function to parse time strings like "12:00 PM" to minutes since midnight
  const parseTimeToMinutes = (timeString: string): number => {
    const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();

    // Convert to 24-hour format
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  };

  const sortedSlots = slots.sort((a, b) => {
    const aMinutes = parseTimeToMinutes(a.start_time);
    const bMinutes = parseTimeToMinutes(b.start_time);
    return aMinutes - bMinutes;
  });

  // Add timezone information to each slot and subtract offset
  const slotsWithTimezone = sortedSlots.map((slot) => ({
    ...slot,
    start_time: subtractTimezoneOffset(slot.start_time), // Subtract 5 hours when fetching
    end_time: subtractTimezoneOffset(slot.end_time), // Subtract 5 hours when fetching
    timezone: BUSINESS_TIMEZONE,
  }));

  return { slots: slotsWithTimezone };
};

const CheckCounselorsAvailability = async (datetimeString: string, customerTimezone: string) => {
  const BUSINESS_TIMEZONE = 'Australia/Sydney';

  // Parse the datetime string (format: YYYY-MM-DD HH:MM:SS UTC)
  const dateTimeParts = datetimeString.replace(' UTC', '').trim();
  const inputDateTime = new Date(dateTimeParts + 'Z'); // Add Z for UTC

  // Convert UTC time to customer's timezone to determine their local "today" and "tomorrow"
  const customerLocalTime = toZonedTime(inputDateTime, customerTimezone);

  // Get customer's today date (as UTC midnight for database comparison)
  // Calendar dates are stored as Sydney dates in UTC format (e.g., 2025-11-10T00:00:00.000Z = Nov 10 in Sydney)
  const customerTodayDate = new Date(Date.UTC(
    customerLocalTime.getFullYear(),
    customerLocalTime.getMonth(),
    customerLocalTime.getDate(),
    0, 0, 0, 0
  ));

  // Get customer's tomorrow date
  const customerTomorrowDate = new Date(customerTodayDate);
  customerTomorrowDate.setUTCDate(customerTomorrowDate.getUTCDate() + 1);

  // Get all counselors who are not deleted (including super admins)
  // Counselors must have:
  // 1. Connected their Google calendar (is_calendar_connected: true)
  const counselors = await prisma.user.findMany({
    where: {
      role: {
        in: ['COUNSELOR', 'SUPER_ADMIN'],
      },
      is_deleted: false,
      is_calendar_connected: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      profile_picture: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Check availability for each counselor
  const availabilityResults = await Promise.all(
    counselors.map(async (counselor) => {
      // Check today's availability (customer's today)
      const todayAvailability = await checkDayAvailability(
        counselor.id,
        customerTodayDate,
        inputDateTime,
        BUSINESS_TIMEZONE,
      );

      // Check tomorrow's availability (customer's tomorrow - no time check needed for future date)
      const tomorrowAvailability = await checkDayAvailability(
        counselor.id,
        customerTomorrowDate,
        null, // No time check for tomorrow
        BUSINESS_TIMEZONE,
      );

      // Check availability by session type
      const offlineTodayAvailability = await checkDayAvailability(
        counselor.id,
        customerTodayDate,
        inputDateTime,
        BUSINESS_TIMEZONE,
        SessionType.IN_PERSON,
      );

      const offlineTomorrowAvailability = await checkDayAvailability(
        counselor.id,
        customerTomorrowDate,
        null,
        BUSINESS_TIMEZONE,
        SessionType.IN_PERSON,
      );

      const onlineTodayAvailability = await checkDayAvailability(
        counselor.id,
        customerTodayDate,
        inputDateTime,
        BUSINESS_TIMEZONE,
        SessionType.ONLINE,
      );

      const onlineTomorrowAvailability = await checkDayAvailability(
        counselor.id,
        customerTomorrowDate,
        null,
        BUSINESS_TIMEZONE,
        SessionType.ONLINE,
      );

      return {
        counselor_id: counselor.id,
        name: counselor.name,
        email: counselor.email,
        specialization: counselor.specialization,
        profile_picture: counselor.profile_picture,
        today: todayAvailability,
        tomorrow: tomorrowAvailability,
        availability: {
          offline_today: offlineTodayAvailability,
          offline_tomorrow: offlineTomorrowAvailability,
          online_today: onlineTodayAvailability,
          online_tomorrow: onlineTomorrowAvailability,
        },
      };
    }),
  );

  return {
    input_datetime: datetimeString,
    customer_timezone: customerTimezone,
    customer_local_time: customerLocalTime.toISOString(),
    checked_at: new Date().toISOString(),
    counselors: availabilityResults,
  };
};

// Helper function to check availability for a specific day
const checkDayAvailability = async (
  counselorId: string,
  date: Date,
  currentDateTime: Date | null,
  timezone: string,
  sessionType?: SessionType,
): Promise<boolean> => {
  // Build the where clause for time_slots
  const timeSlotWhere: Prisma.TimeSlotWhereInput = {
    status: 'AVAILABLE',
  };

  // Add session type filter if provided
  if (sessionType) {
    timeSlotWhere.type = sessionType;
  }

  // Get the calendar for this date
  const calendar = await prisma.calendar.findFirst({
    where: {
      counselor_id: counselorId,
      date: date,
    },
    include: {
      time_slots: {
        where: timeSlotWhere,
      },
    },
  });

  // If no calendar or no slots, return false
  if (!calendar || calendar.time_slots.length === 0) {
    return false;
  }

  // If currentDateTime is null (checking tomorrow), any available slot means true
  if (!currentDateTime) {
    return true;
  }

  // For today, check if any slot hasn't passed yet
  const hasAvailableSlot = calendar.time_slots.some((slot) => {
    // Parse the slot start time in the business timezone
    const slotDateTime = parseSlotTime(date, slot.start_time, timezone);

    // Check if the slot time is in the future
    return slotDateTime > currentDateTime;
  });

  return hasAvailableSlot;
};

// Helper function to parse slot time in the business timezone
const parseSlotTime = (date: Date, timeString: string, timezone: string): Date => {
  // timeString can be in format like "14:00" or "2:00 PM"
  // The slot times are in the business timezone (Sydney)
  // The date parameter is in UTC (e.g., 2025-11-10T00:00:00.000Z)

  let hours: number;
  let minutes: number;

  // Try to parse 24-hour format first
  const time24Match = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    hours = parseInt(time24Match[1], 10);
    minutes = parseInt(time24Match[2], 10);
  } else {
    // Try to parse 12-hour format with AM/PM
    const time12Match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (time12Match) {
      hours = parseInt(time12Match[1], 10);
      minutes = parseInt(time12Match[2], 10);
      const meridiem = time12Match[3].toUpperCase();

      if (meridiem === 'PM' && hours !== 12) {
        hours += 12;
      } else if (meridiem === 'AM' && hours === 12) {
        hours = 0;
      }
    } else {
      // If no match, return the original date (shouldn't happen with valid data)
      return date;
    }
  }

  // Create a datetime string in the format: "YYYY-MM-DDTHH:mm:ss"
  // This represents the local time in Sydney timezone
  const dateStr = date.toISOString().split('T')[0]; // "2025-11-10"
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  const sydneyDateTimeStr = `${dateStr}T${timeStr}`;

  // Convert from Sydney timezone to UTC
  const slotDateTime = fromZonedTime(sydneyDateTimeStr, timezone);

  return slotDateTime;
};

const PublicCalendarService = {
  GetCounselorCalendar,
  GetCounselorDateSlots,
  CheckCounselorsAvailability,
};

export default PublicCalendarService;
