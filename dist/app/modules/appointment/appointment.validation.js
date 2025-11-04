"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const getAppointmentsQuerySchema = zod_1.z.object({
    query: zod_1.z
        .object({
        search: zod_1.z.string().optional(),
        session_type: zod_1.z.enum(['ONLINE', 'IN_PERSON']).optional(),
        status: zod_1.z
            .enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'DELETED'])
            .optional(),
        date: zod_1.z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
            .optional(),
        page: zod_1.z
            .string()
            .transform((val) => parseInt(val))
            .pipe(zod_1.z.number().min(1))
            .optional(),
        limit: zod_1.z
            .string()
            .transform((val) => parseInt(val))
            .pipe(zod_1.z.number().min(1).max(100))
            .optional(),
        sort_by: zod_1.z.string().optional(),
        sort_order: zod_1.z.enum(['asc', 'desc']).optional(),
    })
        .optional(),
    body: zod_1.z.object({}).optional(),
    params: zod_1.z.object({}).optional(),
    cookies: zod_1.z.object({}).optional(),
});
const cancelAppointmentSchema = zod_1.z.object({
    params: zod_1.z.object({
        appointmentId: zod_1.z.string().uuid('Invalid appointment ID format'),
    }),
    body: zod_1.z.object({}).optional(),
    query: zod_1.z.object({}).optional(),
    cookies: zod_1.z.object({}).optional(),
});
const rescheduleAppointmentSchema = zod_1.z.object({
    params: zod_1.z.object({
        appointmentId: zod_1.z.string().uuid('Invalid appointment ID format'),
    }),
    body: zod_1.z.object({
        newTimeSlotId: zod_1.z.string().uuid('Invalid time slot ID format'),
    }),
    query: zod_1.z.object({}).optional(),
    cookies: zod_1.z.object({}).optional(),
});
const createManualAppointmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string({
            required_error: 'First name is required',
        }),
        lastName: zod_1.z.string({
            required_error: 'Last name is required',
        }),
        email: zod_1.z
            .string({
            required_error: 'Email is required',
        })
            .email('Invalid email format'),
        phone: zod_1.z.string({
            required_error: 'Phone is required',
        }),
        dateOfBirth: zod_1.z.string({
            required_error: 'Date of birth is required',
        }),
        gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER'], {
            required_error: 'Gender is required',
        }),
        sessionType: zod_1.z.enum(['ONLINE', 'IN_PERSON'], {
            required_error: 'Session type is required',
        }),
        date: zod_1.z.string({
            required_error: 'Date is required',
        }),
        timeSlotId: zod_1.z.string({
            required_error: 'Time slot ID is required',
        }),
        notes: zod_1.z.string().optional(),
    }),
    query: zod_1.z.object({}).optional(),
    params: zod_1.z.object({}).optional(),
    cookies: zod_1.z.object({}).optional(),
});
const AppointmentValidation = {
    getAppointmentsQuerySchema,
    cancelAppointmentSchema,
    rescheduleAppointmentSchema,
    createManualAppointmentSchema,
};
exports.default = AppointmentValidation;
