import prisma from '../../utils/prisma';
import { Prisma, SessionType } from '@prisma/client';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const BUSINESS_TIMEZONE = 'Australia/Sydney';
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

/**
 * Helper function to parse time string and extract hours and minutes
 * @param timeString - The time string (e.g., "8:00 AM", "14:30")
 * @returns Object with hours (24-hour format) and minutes, or null if invalid
 */
const parseTimeString = (
  timeString: string,
): { hours: number; minutes: number } | null => {
  try {
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);

    if (!timeMatch) {
      return null;
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3]?.toUpperCase();

    // Convert to 24-hour format if needed
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  } catch (error) {
    return null;
  }
};

/**
 * Helper function to parse time string (e.g., "8:00 AM") and check if it's in the past
 * @param date - The calendar date (stored in UTC)
 * @param timeString - The time string (e.g., "8:00 AM", "2:30 PM")
 * @returns true if the time is in the past, false otherwise
 */
const isTimeInPast = (date: Date, timeString: string): boolean => {
  // Get current time in Sydney timezone
  const nowUtc = new Date();
  const nowSydney = toZonedTime(nowUtc, BUSINESS_TIMEZONE);

  // Convert the UTC date to Sydney timezone
  const calendarDateSydney = toZonedTime(date, BUSINESS_TIMEZONE);
  const calendarDateOnly = new Date(calendarDateSydney);
  calendarDateOnly.setHours(0, 0, 0, 0);

  const todayOnly = new Date(nowSydney);
  todayOnly.setHours(0, 0, 0, 0);

  // If the calendar date is before today (in Sydney time), it's in the past
  if (calendarDateOnly < todayOnly) {
    return true;
  }

  // If the calendar date is after today (in Sydney time), it's not in the past
  if (calendarDateOnly > todayOnly) {
    return false;
  }

  // If we're here, the calendar date is today - need to check the time
  const parsed = parseTimeString(timeString);
  if (!parsed) {
    // If we can't parse the time, allow it (validation happens elsewhere)
    return false;
  }

  // Create a datetime for the slot in Sydney timezone
  const slotDateTime = new Date(calendarDateOnly);
  slotDateTime.setHours(parsed.hours, parsed.minutes, 0, 0);

  // Compare with current Sydney time
  return slotDateTime < nowSydney;
};

/**
 * Validates that time is at 15-minute intervals (:00, :15, :30, :45)
 * @param timeString - The time string (e.g., "8:00 AM", "8:15 AM")
 * @returns true if valid, false otherwise
 */
const isValidFifteenMinuteInterval = (timeString: string): boolean => {
  const parsed = parseTimeString(timeString);
  if (!parsed) {
    return false;
  }

  // Check if minutes are 0, 15, 30, or 45
  return [0, 15, 30, 45].includes(parsed.minutes);
};

/**
 * Validates that the slot duration is exactly 1 hour
 * @param startTime - Start time string (e.g., "8:00 AM")
 * @param endTime - End time string (e.g., "9:00 AM")
 * @returns true if duration is exactly 1 hour, false otherwise
 */
const isOneHourDuration = (startTime: string, endTime: string): boolean => {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);

  if (!start || !end) {
    return false;
  }

  // Convert to total minutes for comparison
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  // Check if difference is exactly 60 minutes
  return endMinutes - startMinutes === 60;
};

/**
 * Checks if two time slots overlap or are duplicates
 * @param slot1Start - First slot start time
 * @param slot1End - First slot end time
 * @param slot2Start - Second slot start time
 * @param slot2End - Second slot end time
 * @returns true if slots overlap or are duplicates, false otherwise
 */
const doSlotsOverlap = (
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string,
): boolean => {
  const s1Start = parseTimeString(slot1Start);
  const s1End = parseTimeString(slot1End);
  const s2Start = parseTimeString(slot2Start);
  const s2End = parseTimeString(slot2End);

  if (!s1Start || !s1End || !s2Start || !s2End) {
    return false;
  }

  // Convert to minutes for easier comparison
  const s1StartMin = s1Start.hours * 60 + s1Start.minutes;
  const s1EndMin = s1End.hours * 60 + s1End.minutes;
  const s2StartMin = s2Start.hours * 60 + s2Start.minutes;
  const s2EndMin = s2End.hours * 60 + s2End.minutes;

  // Check for overlap or duplicate
  // Slots overlap if: slot1 starts before slot2 ends AND slot2 starts before slot1 ends
  return s1StartMin < s2EndMin && s2StartMin < s1EndMin;
};

const GetCalenders = async (counselorId: string) => {
  const calenderDates = await prisma.calendar.findMany({
    where: {
      counselor_id: counselorId,
    },
    select: {
      id: true,
      date: true,
      _count: {
        select: {
          time_slots: true,
        },
      },
    },
  });

  const calender = calenderDates.map((item) => {
    // Convert UTC date to Sydney timezone for display
    const sydneyDate = toZonedTime(item.date, BUSINESS_TIMEZONE);
    const dateStr = sydneyDate.toISOString().split('T')[0];

    return {
      id: item.id,
      isoDate: item.date,
      date: dateStr,
      availableSlots: item._count.time_slots,
      haveSlots: !!item._count.time_slots,
    };
  });
  return { calender };
};

const CreateCalenderDate = async (counselorId: string, date: string | Date) => {
  // Get current date in Sydney timezone
  const nowUtc = new Date();
  const nowSydney = toZonedTime(nowUtc, BUSINESS_TIMEZONE);
  const todaySydney = new Date(nowSydney);
  todaySydney.setHours(0, 0, 0, 0);

  // Parse input date and normalize
  const inputDate = new Date(date);
  inputDate.setHours(0, 0, 0, 0);

  // Convert input date to Sydney timezone for comparison
  const inputDateSydney = toZonedTime(inputDate, BUSINESS_TIMEZONE);
  const inputDateOnly = new Date(inputDateSydney);
  inputDateOnly.setHours(0, 0, 0, 0);

  // Validate that the date is not in the past (in Sydney timezone)
  if (inputDateOnly < todaySydney) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot create calendar for past dates',
    );
  }

  const createdCalenderDate = await prisma.calendar.create({
    data: {
      counselor_id: counselorId,
      date,
    },
  });

  return createdCalenderDate;
};

const GetDateSlots = async (calendarId: string) => {
  const where: Prisma.TimeSlotWhereInput = {
    calendar_id: calendarId,
  };

  const result = await prisma.timeSlot.findMany({
    where,
    select: {
      id: true,
      start_time: true,
      end_time: true,
      type: true,
      status: true,
      is_rescheduled: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      start_time: 'asc',
    },
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

  // Sort slots by time
  const sortedResult = result.sort((a, b) => {
    const aMinutes = parseTimeToMinutes(a.start_time);
    const bMinutes = parseTimeToMinutes(b.start_time);
    return aMinutes - bMinutes;
  });

  const formattedResult = sortedResult.map((slot) => ({
    id: slot.id,
    startTime: subtractTimezoneOffset(slot.start_time), // Subtract 5 hours when fetching
    endTime: subtractTimezoneOffset(slot.end_time), // Subtract 5 hours when fetching
    timezone: BUSINESS_TIMEZONE, // Add timezone information
    type: slot.type,
    status: slot.status,
    is_rescheduled: slot.is_rescheduled,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
  }));

  return formattedResult;
};

interface CreateSlotData {
  start_time: string;
  end_time: string;
  type: SessionType;
}

interface CreateSlotsPayload {
  data: CreateSlotData[];
}

const CreateDateSlots = async (
  calendarId: string,
  slots: CreateSlotsPayload,
  userRole: string,
) => {
  // Get the calendar and counselor info
  const calendar = await prisma.calendar.findUnique({
    where: { id: calendarId },
  });

  if (!calendar) {
    throw new AppError(httpStatus.NOT_FOUND, 'Calendar not found');
  }

  // Get existing slots for this calendar date to check for overlaps/duplicates
  const existingSlots = await prisma.timeSlot.findMany({
    where: { calendar_id: calendarId },
    select: {
      start_time: true,
      end_time: true,
    },
  });

  // Validate that slots are not being created for past times
  for (const slot of slots.data) {
    // Check if time is in the past
    if (isTimeInPast(calendar.date, slot.start_time)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot create slot for past time. Slot starts at ${slot.start_time} on ${calendar.date.toISOString().split('T')[0]}, which has already passed.`,
      );
    }

    // Validate 15-minute interval
    if (!isValidFifteenMinuteInterval(slot.start_time)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Start time must be at 15-minute intervals (:00, :15, :30, :45). Invalid time: ${slot.start_time}`,
      );
    }

    // Validate 1-hour duration
    if (!isOneHourDuration(slot.start_time, slot.end_time)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Each slot must be exactly 1 hour. Slot from ${slot.start_time} to ${slot.end_time} is not valid.`,
      );
    }

    // Check for duplicates or overlaps with existing slots
    for (const existingSlot of existingSlots) {
      // Convert DB times back to user time for comparison
      const existingStartTime = subtractTimezoneOffset(existingSlot.start_time);
      const existingEndTime = subtractTimezoneOffset(existingSlot.end_time);

      if (
        doSlotsOverlap(
          slot.start_time,
          slot.end_time,
          existingStartTime,
          existingEndTime,
        )
      ) {
        // Check if it's an exact duplicate
        if (
          slot.start_time === existingStartTime &&
          slot.end_time === existingEndTime
        ) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Duplicate slot detected. A slot from ${slot.start_time} to ${slot.end_time} already exists on this date.`,
          );
        } else {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Slot overlap detected. The slot from ${slot.start_time} to ${slot.end_time} overlaps with existing slot ${existingStartTime} to ${existingEndTime}.`,
          );
        }
      }
    }
  }

  // Calculate total slots after adding new ones (using already-fetched existingSlots)
  const existingSlotsCount = existingSlots.length;
  const totalSlotsAfter = existingSlotsCount + slots.data.length;

  // If this is the first time adding slots (no existing slots), enforce minimum
  // Skip minimum validation if user is SUPER_ADMIN
  if (userRole !== 'SUPER_ADMIN' && existingSlotsCount === 0) {
    // Get counselor settings only if not superadmin
    const counselorSettings = await prisma.counselorSettings.findUnique({
      where: { counselor_id: calendar.counselor_id },
    });

    if (!counselorSettings) {
      throw new AppError(httpStatus.NOT_FOUND, 'Counselor settings not found');
    }

    if (slots.data.length < counselorSettings.minimum_slots_per_day) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Minimum ${counselorSettings.minimum_slots_per_day} slots per day required. Only ${slots.data.length} slots provided.`,
      );
    }
  }

  // Log info for tracking (optional - can help with debugging)
  console.log(
    `Calendar ${calendarId}: Adding ${slots.data.length} slots. Total will be ${totalSlotsAfter}`,
  );

  const result = await prisma.timeSlot.createMany({
    data: slots.data.map((item) => ({
      calendar_id: calendarId,
      start_time: addTimezoneOffset(item.start_time), // Add 5 hours when saving
      end_time: addTimezoneOffset(item.end_time), // Add 5 hours when saving
      type: item.type,
    })),
  });

  return result;
};

// Slot type
type Slot = {
  start_time: string; // e.g. "8:00 AM"
  end_time: string; // e.g. "9:00 AM"
  type: 'ONLINE' | 'IN_PERSON'; // restrict to your enum values
};

// Day with slots
type DaySlots = {
  date: string; // ISO date string, e.g. "2025-09-07"
  slots: Slot[];
};

// Whole payload
type CalendarPayload = { data: DaySlots[] };

const CreateSlotsWithCalendarDate = async (
  counselorId: string,
  slots: CalendarPayload,
  userRole: string,
) => {
  const result = await prisma.$transaction(async (tx) => {
    // Fetch counselor settings to get minimum slots requirement (only if not superadmin)
    let minSlotsPerDay = 0;

    if (userRole !== 'SUPER_ADMIN') {
      const counselorSettings = await tx.counselorSettings.findUnique({
        where: { counselor_id: counselorId },
      });

      if (!counselorSettings) {
        throw new AppError(httpStatus.NOT_FOUND, 'Counselor settings not found');
      }

      minSlotsPerDay = counselorSettings.minimum_slots_per_day;
    }

    const allSlots: any[] = [];

    for (const day of slots.data) {
      const calendarDate = new Date(day.date);
      calendarDate.setUTCHours(0, 0, 0, 0);

      // Validate that slots are not being created for past times
      for (const slot of day.slots) {
        // Check if time is in the past
        if (isTimeInPast(calendarDate, slot.start_time)) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Cannot create slot for past time. Slot starts at ${slot.start_time} on ${day.date}, which has already passed.`,
          );
        }

        // Validate 15-minute interval
        if (!isValidFifteenMinuteInterval(slot.start_time)) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Start time must be at 15-minute intervals (:00, :15, :30, :45). Invalid time: ${slot.start_time} on ${day.date}`,
          );
        }

        // Validate 1-hour duration
        if (!isOneHourDuration(slot.start_time, slot.end_time)) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Each slot must be exactly 1 hour. Slot from ${slot.start_time} to ${slot.end_time} on ${day.date} is not valid.`,
          );
        }
      }

      // Check for duplicates within the same request (same day)
      for (let i = 0; i < day.slots.length; i++) {
        for (let j = i + 1; j < day.slots.length; j++) {
          if (
            doSlotsOverlap(
              day.slots[i].start_time,
              day.slots[i].end_time,
              day.slots[j].start_time,
              day.slots[j].end_time,
            )
          ) {
            if (
              day.slots[i].start_time === day.slots[j].start_time &&
              day.slots[i].end_time === day.slots[j].end_time
            ) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `Duplicate slots in request. Multiple slots with time ${day.slots[i].start_time} to ${day.slots[i].end_time} on ${day.date}.`,
              );
            } else {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `Overlapping slots in request. Slots ${day.slots[i].start_time}-${day.slots[i].end_time} and ${day.slots[j].start_time}-${day.slots[j].end_time} overlap on ${day.date}.`,
              );
            }
          }
        }
      }

      // Find or create calendar
      let calendar = await tx.calendar.findUnique({
        where: {
          counselor_id_date: {
            counselor_id: counselorId,
            date: calendarDate,
          },
        },
      });

      let existingSlotsCount = 0;
      let existingSlots: { start_time: string; end_time: string }[] = [];

      if (!calendar) {
        // Creating new calendar - validate minimum requirement
        // Skip minimum validation if user is SUPER_ADMIN
        if (userRole !== 'SUPER_ADMIN' && day.slots.length < minSlotsPerDay) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Minimum ${minSlotsPerDay} slots per day required. Only ${day.slots.length} slots provided for ${day.date}`,
          );
        }

        calendar = await tx.calendar.create({
          data: {
            counselor_id: counselorId,
            date: calendarDate,
          },
        });
      } else {
        // Calendar already exists - fetch existing slots
        existingSlots = await tx.timeSlot.findMany({
          where: { calendar_id: calendar.id },
          select: {
            start_time: true,
            end_time: true,
          },
        });

        existingSlotsCount = existingSlots.length;

        // Check for overlaps/duplicates with existing slots
        for (const newSlot of day.slots) {
          for (const existingSlot of existingSlots) {
            // Convert DB times back to user time for comparison
            const existingStartTime = subtractTimezoneOffset(existingSlot.start_time);
            const existingEndTime = subtractTimezoneOffset(existingSlot.end_time);

            if (
              doSlotsOverlap(
                newSlot.start_time,
                newSlot.end_time,
                existingStartTime,
                existingEndTime,
              )
            ) {
              if (
                newSlot.start_time === existingStartTime &&
                newSlot.end_time === existingEndTime
              ) {
                throw new AppError(
                  httpStatus.BAD_REQUEST,
                  `Duplicate slot detected. A slot from ${newSlot.start_time} to ${newSlot.end_time} already exists on ${day.date}.`,
                );
              } else {
                throw new AppError(
                  httpStatus.BAD_REQUEST,
                  `Slot overlap detected. The slot from ${newSlot.start_time} to ${newSlot.end_time} overlaps with existing slot ${existingStartTime} to ${existingEndTime} on ${day.date}.`,
                );
              }
            }
          }
        }

        // Check if total slots (existing + new) meets minimum requirement
        // Skip minimum validation if user is SUPER_ADMIN
        const totalSlots = existingSlotsCount + day.slots.length;
        if (userRole !== 'SUPER_ADMIN' && totalSlots < minSlotsPerDay) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Minimum ${minSlotsPerDay} slots per day required. Calendar has ${existingSlotsCount} slots, adding ${day.slots.length} would result in ${totalSlots} slots for ${day.date}`,
          );
        }
      }

      // Collect all slots for bulk insert
      for (const slot of day.slots) {
        allSlots.push({
          calendar_id: calendar.id,
          start_time: addTimezoneOffset(slot.start_time), // Add 5 hours when saving
          end_time: addTimezoneOffset(slot.end_time), // Add 5 hours when saving
          type: slot.type,
          status: 'AVAILABLE',
        });
      }
    }

    // Insert all slots in one bulk query
    // Note: skipDuplicates removed because we now validate duplicates explicitly
    const createdSlots = await tx.timeSlot.createMany({
      data: allSlots,
    });

    return createdSlots;
  });

  return result;
};

const GetSlotsWithCalendarDate = async (counselorId: string) => {
  const calendars = await prisma.calendar.findMany({
    where: { counselor_id: counselorId },
    include: {
      time_slots: {
        include: {
          appointments: {
            where: {
              status: {
                in: ['CONFIRMED', 'PENDING'],
              },
            },
            include: {
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
            },
          },
        },
      },
    },
  });

  // Transform the data to include appointment information
  const transformedCalendars = calendars.map((calendar) => {
    // Convert UTC date to Sydney timezone for display
    const sydneyDate = toZonedTime(calendar.date, BUSINESS_TIMEZONE);
    const dateStr = sydneyDate.toISOString().split('T')[0];

    return {
      ...calendar,
      date: calendar.date, // Keep original UTC date
      dateDisplay: dateStr, // Add display date in Sydney timezone
      time_slots: calendar.time_slots.map((slot) => {
        const appointment = slot.appointments[0]; // Should only be one active appointment per slot
        return {
          ...slot,
          start_time: subtractTimezoneOffset(slot.start_time), // Subtract 5 hours when fetching
          end_time: subtractTimezoneOffset(slot.end_time), // Subtract 5 hours when fetching
          timezone: BUSINESS_TIMEZONE, // Add timezone information
          appointment: appointment
            ? {
                id: appointment.id,
                session_type: appointment.session_type,
                date: appointment.date,
                dateDisplay: toZonedTime(appointment.date, BUSINESS_TIMEZONE).toISOString().split('T')[0],
                status: appointment.status,
                is_rescheduled: appointment.is_rescheduled,
                client: appointment.client,
                meeting: appointment.meeting,
                created_at: appointment.created_at,
                created_at_sydney: toZonedTime(appointment.created_at, BUSINESS_TIMEZONE).toISOString(),
              }
            : null,
          appointments: undefined, // Remove the nested appointments array
        };
      }),
    };
  });

  return transformedCalendars;
};

const DeleteTimeSlot = async (
  counselorId: string,
  slotId: string,
  userRole: string,
) => {
  // First verify that the slot belongs to the counselor
  const slot = await prisma.timeSlot.findFirst({
    where: {
      id: slotId,
      calendar: {
        counselor_id: counselorId,
      },
    },
    include: {
      calendar: true,
    },
  });

  if (!slot) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Time slot not found or you do not have permission to delete it',
    );
  }

  // Only allow deletion if status is AVAILABLE
  if (slot.status !== 'AVAILABLE') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only available slots can be deleted',
    );
  }

  // Check minimum slots requirement before deletion
  // Skip minimum validation if user is SUPER_ADMIN
  if (userRole !== 'SUPER_ADMIN') {
    const counselorSettings = await prisma.counselorSettings.findUnique({
      where: { counselor_id: counselorId },
    });

    if (!counselorSettings) {
      throw new AppError(httpStatus.NOT_FOUND, 'Counselor settings not found');
    }

    // Count current slots for this calendar date
    const currentSlotsCount = await prisma.timeSlot.count({
      where: {
        calendar_id: slot.calendar_id,
      },
    });

    // Check if deletion would violate minimum requirement
    if (currentSlotsCount - 1 < counselorSettings.minimum_slots_per_day) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot delete slot. Minimum ${counselorSettings.minimum_slots_per_day} slots per day required. Currently ${currentSlotsCount} slots exist.`,
      );
    }
  }

  // Delete the slot
  const deletedSlot = await prisma.timeSlot.delete({
    where: {
      id: slotId,
    },
  });

  return deletedSlot;
};

const CalendarService = {
  GetCalenders,
  CreateCalenderDate,
  GetDateSlots,
  CreateDateSlots,
  CreateSlotsWithCalendarDate,
  GetSlotsWithCalendarDate,
  DeleteTimeSlot,
};

export default CalendarService;
