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
const appointment_routes_1 = require("../modules/appointment/appointment.routes");
const publicCalendar_routes_1 = require("../modules/publicCalendar/publicCalendar.routes");
const publicAppointment_routes_1 = require("../modules/publicAppointment/publicAppointment.routes");
const publicUsers_routes_1 = require("../modules/publicUsers/publicUsers.routes");
const optVerification_routes_1 = require("../modules/optVerification/optVerification.routes");
const payment_routes_1 = require("../modules/payment/payment.routes");
const google_routes_1 = require("../modules/google/google.routes");
const balance_routes_1 = require("../modules/balance/balance.routes");
const payout_routes_1 = require("../modules/payout/payout.routes");
const stripe_routes_1 = require("../modules/stripe/stripe.routes");
const dashboard_routes_1 = require("../modules/dashboard/dashboard.routes");
const router = express_1.default.Router();
const routes = [
    { path: '/auth', route: auth_routes_1.AuthRoutes },
    { path: '/users', route: user_routes_1.UserRoutes },
    { path: '/calendars', route: calendar_routes_1.CalendarRoutes },
    { path: '/clients', route: client_routes_1.ClientRoutes },
    { path: '/appointments', route: appointment_routes_1.AppointmentRoutes },
    { path: '/public-calenders', route: publicCalendar_routes_1.PublicCalendarRoutes },
    { path: '/public-appointments', route: publicAppointment_routes_1.PublicAppointmentRoutes },
    { path: '/public-users', route: publicUsers_routes_1.PublicUsersRoutes },
    { path: '/otp', route: optVerification_routes_1.OptVerificationRoutes },
    { path: '/payments', route: payment_routes_1.PaymentRoutes },
    { path: '/google', route: google_routes_1.GoogleRoutes },
    { path: '/balance', route: balance_routes_1.BalanceRoutes },
    { path: '/payouts', route: payout_routes_1.PayoutRoutes },
    { path: '/stripe', route: stripe_routes_1.StripeRoutes },
    { path: '/dashboard', route: dashboard_routes_1.DashboardRoutes },
];
routes.forEach((route) => {
    router.use(route.path, route.route);
});
exports.default = router;
