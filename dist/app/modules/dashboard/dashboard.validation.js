"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const getDashboardSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z
            .string()
            .optional()
            .refine((val) => {
            if (!val)
                return true;
            return !isNaN(Date.parse(val));
        }, { message: 'Invalid date format' }),
    }),
});
const DashboardValidation = {
    getDashboardSchema,
};
exports.default = DashboardValidation;
