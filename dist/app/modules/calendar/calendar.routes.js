"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarRoutes = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const calendar_controller_1 = __importDefault(require("./calendar.controller"));
const calendar_validation_1 = __importDefault(require("./calendar.validation"));
const router = express_1.default.Router();
router.use((0, auth_1.default)(client_1.Role.SUPER_ADMIN, client_1.Role.COUNSELOR));
router
    .route('/')
    .get(calendar_controller_1.default.GetCalendar)
    .post((0, validateRequest_1.default)(calendar_validation_1.default.CreateCalendarSchema), calendar_controller_1.default.PostCalendarDate);
router
    .route('/slots')
    .get(calendar_controller_1.default.GetSlotsWithCalendarDate)
    .post((0, validateRequest_1.default)(calendar_validation_1.default.CreateCalendarWithSlotsSchema), calendar_controller_1.default.PostSlotsWithCalendarDate);
router
    .route('/:id/slots')
    .get(calendar_controller_1.default.GetDateSlots)
    .post((0, validateRequest_1.default)(calendar_validation_1.default.CreateSlotsSchema), calendar_controller_1.default.PostDateSlots);
router
    .route('/slots/:slotId')
    .delete(calendar_controller_1.default.DeleteTimeSlot);
exports.CalendarRoutes = router;
