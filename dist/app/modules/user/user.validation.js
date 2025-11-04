"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').optional(),
    }),
});
const createCounselorSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({
            required_error: 'Name is required',
            invalid_type_error: 'Name must be a string',
        })
            .min(1, 'Name cannot be empty'),
        email: zod_1.z
            .string({
            required_error: 'Email is required',
            invalid_type_error: 'Email must be a string',
        })
            .email('Invalid email format'),
        specialization: zod_1.z
            .string({
            invalid_type_error: 'Specialization must be a string',
        })
            .min(1, 'Specialization cannot be empty')
            .optional(),
    }),
});
const updateCounselorSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        minimum_slots_per_day: zod_1.z
            .number({
            required_error: 'Minimum slots per day is required',
            invalid_type_error: 'Minimum slots per day must be a number',
        })
            .int('Minimum slots per day must be an integer')
            .min(1, 'Minimum slots per day must be at least 1')
            .max(50, 'Minimum slots per day cannot exceed 50'),
    }),
});
const UserValidation = {
    updateProfileSchema,
    createCounselorSchema,
    updateCounselorSettingsSchema,
};
exports.default = UserValidation;
