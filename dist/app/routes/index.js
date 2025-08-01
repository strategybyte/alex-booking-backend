"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = require("../modules/auth/auth.routes");
const user_routes_1 = require("../modules/user/user.routes");
const calendar_routes_1 = require("../modules/calendar/calendar.routes");
const client_routes_1 = require("../modules/client/client.routes");
const publicCalendar_routes_1 = require("../modules/publicCalendar/publicCalendar.routes");
const publicAppointment_routes_1 = require("../modules/publicAppointment/publicAppointment.routes");
const optVerification_routes_1 = require("../modules/optVerification/optVerification.routes");
const payment_routes_1 = require("../modules/payment/payment.routes");
const router = express_1.default.Router();
const routes = [
    { path: '/auth', route: auth_routes_1.AuthRoutes },
    { path: '/users', route: user_routes_1.UserRoutes },
    { path: '/calendars', route: calendar_routes_1.CalendarRoutes },
    { path: '/clients', route: client_routes_1.ClientRoutes },
    { path: '/public-calenders', route: publicCalendar_routes_1.PublicCalendarRoutes },
    { path: '/public-appointments', route: publicAppointment_routes_1.PublicAppointmentRoutes },
    { path: '/otp', route: optVerification_routes_1.OptVerificationRoutes },
    { path: '/payments', route: payment_routes_1.PaymentRoutes },
];
routes.forEach((route) => {
    router.use(route.path, route.route);
});
exports.default = router;
