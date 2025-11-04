"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const CreateCalendarSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z
            .string()
            .datetime()
            .or(zod_1.z.date())
            .refine((date) => {
            const inputDate = new Date(date);
            inputDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return inputDate >= today;
        }, {
            message: 'Cannot create calendar for past dates',
        }),
    }),
});
const CreateSlotsSchema = zod_1.z.object({
    body: zod_1.z.object({
        data: zod_1.z.array(zod_1.z.object({
            start_time: zod_1.z.string(),
            end_time: zod_1.z.string(),
            type: zod_1.z.nativeEnum(client_1.SessionType),
        })),
    }),
});
const CreateCalendarWithSlotsSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        date: zod_1.z
            .string()
            .refine((date) => {
            const inputDate = new Date(date);
            inputDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return inputDate >= today;
        }, {
            message: 'Cannot create calendar for past dates',
        }),
        slots: zod_1.z.array(zod_1.z.object({
            start_time: zod_1.z.string(),
            end_time: zod_1.z.string(),
            type: zod_1.z.nativeEnum(client_1.SessionType),
        })),
    })
        .or(zod_1.z.object({
        data: zod_1.z.array(zod_1.z.object({
            date: zod_1.z
                .string()
                .refine((date) => {
                const inputDate = new Date(date);
                inputDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return inputDate >= today;
            }, {
                message: 'Cannot create calendar for past dates',
            }),
            slots: zod_1.z.array(zod_1.z.object({
                start_time: zod_1.z.string(),
                end_time: zod_1.z.string(),
                type: zod_1.z.nativeEnum(client_1.SessionType),
            })),
        })),
    })),
});
const CalendarValidation = {
    CreateCalendarSchema,
    CreateSlotsSchema,
    CreateCalendarWithSlotsSchema,
};
exports.default = CalendarValidation;
