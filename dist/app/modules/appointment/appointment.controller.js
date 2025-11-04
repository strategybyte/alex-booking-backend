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
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const pick_1 = __importDefault(require("../../utils/pick"));
const appointment_services_1 = __importDefault(require("./appointment.services"));
const GetCounselorAppointments = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filters = (0, pick_1.default)(req.query, ['search', 'session_type', 'status', 'date']);
    const paginationOptions = (0, pick_1.default)(req.query, [
        'page',
        'limit',
        'sort_by',
        'sort_order',
    ]);
    const result = yield appointment_services_1.default.GetCounselorAppointmentsById(req.user.id, filters, paginationOptions);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Appointments retrieved successfully',
        data: result.data,
        meta: result.meta,
    });
}));
const GetCounselorAppointmentDetailsById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield appointment_services_1.default.GetCounselorAppointmentDetailsById(req.params.appointmentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Appointment details retrieved successfully',
        data: result,
    });
}));
const CompleteCounselorAppointmentById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield appointment_services_1.default.CompleteAppointmentById(req.params.appointmentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Appointment details retrieved successfully',
        data: result,
    });
}));
const CancelCounselorAppointmentById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield appointment_services_1.default.CancelAppointmentById(req.params.appointmentId, req.user.id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Appointment cancelled successfully',
        data: result,
    });
}));
const RescheduleCounselorAppointmentById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { newTimeSlotId } = req.body;
    const result = yield appointment_services_1.default.RescheduleAppointmentById(req.params.appointmentId, req.user.id, newTimeSlotId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Appointment rescheduled successfully',
        data: result,
    });
}));
const CreateManualAppointment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield appointment_services_1.default.CreateManualAppointment(req.user.id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.CREATED,
        message: 'Appointment created successfully. Confirmation email sent to client.',
        data: result,
    });
}));
const AppointmentController = {
    GetCounselorAppointments,
    GetCounselorAppointmentDetailsById,
    CompleteCounselorAppointmentById,
    CancelCounselorAppointmentById,
    RescheduleCounselorAppointmentById,
    CreateManualAppointment,
};
exports.default = AppointmentController;
