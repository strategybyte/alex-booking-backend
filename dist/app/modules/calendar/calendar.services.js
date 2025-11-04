"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../../utils/prisma"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const http_status_1 = __importDefault(require("http-status"));
const parseTimeString = (timeString) => {
    var _a;
    try {
        const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!timeMatch) {
            return null;
        }
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const meridiem = (_a = timeMatch[3]) === null || _a === void 0 ? void 0 : _a.toUpperCase();
        if (meridiem === 'PM' && hours !== 12) {
            hours += 12;
        }
        else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }
        return { hours, minutes };
    }
    catch (error) {
        return null;
    }
};
const isTimeInPast = (date, timeString) => {
    const now = new Date();
    const calendarDate = new Date(date);
    calendarDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (calendarDate < today) {
        return true;
    }
    if (calendarDate > today) {
        return false;
    }
    const parsed = parseTimeString(timeString);
    if (!parsed) {
        return false;
    }
    const slotDateTime = new Date(calendarDate);
    slotDateTime.setHours(parsed.hours, parsed.minutes, 0, 0);
    return slotDateTime < now;
};
const isValidFifteenMinuteInterval = (timeString) => {
    const parsed = parseTimeString(timeString);
    if (!parsed) {
        return false;
    }
    return [0, 15, 30, 45].includes(parsed.minutes);
};
const isOneHourDuration = (startTime, endTime) => {
    const start = parseTimeString(startTime);
    const end = parseTimeString(endTime);
    if (!start || !end) {
        return false;
    }
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    return endMinutes - startMinutes === 60;
};
const doSlotsOverlap = (slot1Start, slot1End, slot2Start, slot2End) => {
    const s1Start = parseTimeString(slot1Start);
    const s1End = parseTimeString(slot1End);
    const s2Start = parseTimeString(slot2Start);
    const s2End = parseTimeString(slot2End);
    if (!s1Start || !s1End || !s2Start || !s2End) {
        return false;
    }
    const s1StartMin = s1Start.hours * 60 + s1Start.minutes;
    const s1EndMin = s1End.hours * 60 + s1End.minutes;
    const s2StartMin = s2Start.hours * 60 + s2Start.minutes;
    const s2EndMin = s2End.hours * 60 + s2End.minutes;
    return s1StartMin < s2EndMin && s2StartMin < s1EndMin;
};
const GetCalenders = (counselorId) => __awaiter(void 0, void 0, void 0, function* () {
    const calenderDates = yield prisma_1.default.calendar.findMany({
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
    const calender = calenderDates.map((item) => ({
        id: item.id,
        isoDate: item.date,
        date: item.date.toISOString().split('T')[0],
        availableSlots: item._count.time_slots,
        haveSlots: !!item._count.time_slots,
    }));
    return { calender };
});
const CreateCalenderDate = (counselorId, date) => __awaiter(void 0, void 0, void 0, function* () {
    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (inputDate < today) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Cannot create calendar for past dates');
    }
    const createdCalenderDate = yield prisma_1.default.calendar.create({
        data: {
            counselor_id: counselorId,
            date,
        },
    });
    return createdCalenderDate;
});
const GetDateSlots = (calendarId) => __awaiter(void 0, void 0, void 0, function* () {
    const where = {
        calendar_id: calendarId,
    };
    const result = yield prisma_1.default.timeSlot.findMany({
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
    });
    const formattedResult = result.map((slot) => ({
        id: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        type: slot.type,
        status: slot.status,
        is_rescheduled: slot.is_rescheduled,
        createdAt: slot.created_at,
        updatedAt: slot.updated_at,
    }));
    return formattedResult;
});
const CreateDateSlots = (calendarId, slots) => __awaiter(void 0, void 0, void 0, function* () {
    const calendar = yield prisma_1.default.calendar.findUnique({
        where: { id: calendarId },
    });
    if (!calendar) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Calendar not found');
    }
    const existingSlots = yield prisma_1.default.timeSlot.findMany({
        where: { calendar_id: calendarId },
        select: {
            start_time: true,
            end_time: true,
        },
    });
    for (const slot of slots.data) {
        if (isTimeInPast(calendar.date, slot.start_time)) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Cannot create slot for past time. Slot starts at ${slot.start_time} on ${calendar.date.toISOString().split('T')[0]}, which has already passed.`);
        }
        if (!isValidFifteenMinuteInterval(slot.start_time)) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Start time must be at 15-minute intervals (:00, :15, :30, :45). Invalid time: ${slot.start_time}`);
        }
        if (!isOneHourDuration(slot.start_time, slot.end_time)) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Each slot must be exactly 1 hour. Slot from ${slot.start_time} to ${slot.end_time} is not valid.`);
        }
        for (const existingSlot of existingSlots) {
            if (doSlotsOverlap(slot.start_time, slot.end_time, existingSlot.start_time, existingSlot.end_time)) {
                if (slot.start_time === existingSlot.start_time && slot.end_time === existingSlot.end_time) {
                    throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Duplicate slot detected. A slot from ${slot.start_time} to ${slot.end_time} already exists on this date.`);
                }
                else {
                    throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Slot overlap detected. The slot from ${slot.start_time} to ${slot.end_time} overlaps with existing slot ${existingSlot.start_time} to ${existingSlot.end_time}.`);
                }
            }
        }
    }
    const counselorSettings = yield prisma_1.default.counselorSettings.findUnique({
        where: { counselor_id: calendar.counselor_id },
    });
    if (!counselorSettings) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Counselor settings not found');
    }
    const existingSlotsCount = existingSlots.length;
    const totalSlotsAfter = existingSlotsCount + slots.data.length;
    if (existingSlotsCount === 0 && slots.data.length < counselorSettings.minimum_slots_per_day) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Minimum ${counselorSettings.minimum_slots_per_day} slots per day required. Only ${slots.data.length} slots provided.`);
    }
    console.log(`Calendar ${calendarId}: Adding ${slots.data.length} slots. Total will be ${totalSlotsAfter}`);
    const result = yield prisma_1.default.timeSlot.createMany({
        data: slots.data.map((item) => ({
            calendar_id: calendarId,
            start_time: item.start_time,
            end_time: item.end_time,
            type: item.type,
        })),
    });
    return result;
});
const CreateSlotsWithCalendarDate = (counselorId, slots) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const counselorSettings = yield tx.counselorSettings.findUnique({
            where: { counselor_id: counselorId },
        });
        if (!counselorSettings) {
            throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Counselor settings not found');
        }
        const minSlotsPerDay = counselorSettings.minimum_slots_per_day;
        const allSlots = [];
        for (const day of slots.data) {
            const calendarDate = new Date(day.date);
            calendarDate.setUTCHours(0, 0, 0, 0);
            for (const slot of day.slots) {
                if (isTimeInPast(calendarDate, slot.start_time)) {
                    throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Cannot create slot for past time. Slot starts at ${slot.start_time} on ${day.date}, which has already passed.`);
                }
                if (!isValidFifteenMinuteInterval(slot.start_time)) {
                    throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Start time must be at 15-minute intervals (:00, :15, :30, :45). Invalid time: ${slot.start_time} on ${day.date}`);
                }
                if (!isOneHourDuration(slot.start_time, slot.end_time)) {
                    throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Each slot must be exactly 1 hour. Slot from ${slot.start_time} to ${slot.end_time} on ${day.date} is not valid.`);
                }
            }
            for (let i = 0; i < day.slots.length; i++) {
                for (let j = i + 1; j < day.slots.length; j++) {
                    if (doSlotsOverlap(day.slots[i].start_time, day.slots[i].end_time, day.slots[j].start_time, day.slots[j].end_time)) {
                        if (day.slots[i].start_time === day.slots[j].start_time && day.slots[i].end_time === day.slots[j].end_time) {
                            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Duplicate slots in request. Multiple slots with time ${day.slots[i].start_time} to ${day.slots[i].end_time} on ${day.date}.`);
                        }
                        else {
                            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Overlapping slots in request. Slots ${day.slots[i].start_time}-${day.slots[i].end_time} and ${day.slots[j].start_time}-${day.slots[j].end_time} overlap on ${day.date}.`);
                        }
                    }
                }
            }
            let calendar = yield tx.calendar.findUnique({
                where: {
                    counselor_id_date: {
                        counselor_id: counselorId,
                        date: calendarDate,
                    },
                },
            });
            let existingSlotsCount = 0;
            let existingSlots = [];
            if (!calendar) {
                if (day.slots.length < minSlotsPerDay) {
                    throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Minimum ${minSlotsPerDay} slots per day required. Only ${day.slots.length} slots provided for ${day.date}`);
                }
                calendar = yield tx.calendar.create({
                    data: {
                        counselor_id: counselorId,
                        date: calendarDate,
                    },
                });
            }
            else {
                existingSlots = yield tx.timeSlot.findMany({
                    where: { calendar_id: calendar.id },
                    select: {
                        start_time: true,
                        end_time: true,
                    },
                });
                existingSlotsCount = existingSlots.length;
                for (const newSlot of day.slots) {
                    for (const existingSlot of existingSlots) {
                        if (doSlotsOverlap(newSlot.start_time, newSlot.end_time, existingSlot.start_time, existingSlot.end_time)) {
                            if (newSlot.start_time === existingSlot.start_time && newSlot.end_time === existingSlot.end_time) {
                                throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Duplicate slot detected. A slot from ${newSlot.start_time} to ${newSlot.end_time} already exists on ${day.date}.`);
                            }
                            else {
                                throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Slot overlap detected. The slot from ${newSlot.start_time} to ${newSlot.end_time} overlaps with existing slot ${existingSlot.start_time} to ${existingSlot.end_time} on ${day.date}.`);
                            }
                        }
                    }
                }
                const totalSlots = existingSlotsCount + day.slots.length;
                if (totalSlots < minSlotsPerDay) {
                    throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Minimum ${minSlotsPerDay} slots per day required. Calendar has ${existingSlotsCount} slots, adding ${day.slots.length} would result in ${totalSlots} slots for ${day.date}`);
                }
            }
            for (const slot of day.slots) {
                allSlots.push({
                    calendar_id: calendar.id,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    type: slot.type,
                    status: 'AVAILABLE',
                });
            }
        }
        const createdSlots = yield tx.timeSlot.createMany({
            data: allSlots,
        });
        return createdSlots;
    }));
    return result;
});
const GetSlotsWithCalendarDate = (counselorId) => __awaiter(void 0, void 0, void 0, function* () {
    const calendars = yield prisma_1.default.calendar.findMany({
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
    const transformedCalendars = calendars.map((calendar) => (Object.assign(Object.assign({}, calendar), { time_slots: calendar.time_slots.map((slot) => {
            const appointment = slot.appointments[0];
            return Object.assign(Object.assign({}, slot), { appointment: appointment
                    ? {
                        id: appointment.id,
                        session_type: appointment.session_type,
                        date: appointment.date,
                        status: appointment.status,
                        is_rescheduled: appointment.is_rescheduled,
                        client: appointment.client,
                        meeting: appointment.meeting,
                        created_at: appointment.created_at,
                    }
                    : null, appointments: undefined });
        }) })));
    return transformedCalendars;
});
const DeleteTimeSlot = (counselorId, slotId) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield prisma_1.default.timeSlot.findFirst({
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
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Time slot not found or you do not have permission to delete it');
    }
    if (slot.status !== 'AVAILABLE') {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Only available slots can be deleted');
    }
    const counselorSettings = yield prisma_1.default.counselorSettings.findUnique({
        where: { counselor_id: counselorId },
    });
    if (!counselorSettings) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Counselor settings not found');
    }
    const currentSlotsCount = yield prisma_1.default.timeSlot.count({
        where: {
            calendar_id: slot.calendar_id,
        },
    });
    if (currentSlotsCount - 1 < counselorSettings.minimum_slots_per_day) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Cannot delete slot. Minimum ${counselorSettings.minimum_slots_per_day} slots per day required. Currently ${currentSlotsCount} slots exist.`);
    }
    const deletedSlot = yield prisma_1.default.timeSlot.delete({
        where: {
            id: slotId,
        },
    });
    return deletedSlot;
});
const CalendarService = {
    GetCalenders,
    CreateCalenderDate,
    GetDateSlots,
    CreateDateSlots,
    CreateSlotsWithCalendarDate,
    GetSlotsWithCalendarDate,
    DeleteTimeSlot,
};
exports.default = CalendarService;
