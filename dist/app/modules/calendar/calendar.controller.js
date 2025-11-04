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
const calendar_services_1 = __importDefault(require("./calendar.services"));
const GetCalendar = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield calendar_services_1.default.GetCalenders(req.user.id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'All calendar dates retrieved successfully',
        data: result,
    });
}));
const PostCalendarDate = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const date = req.body.date;
    const result = yield calendar_services_1.default.CreateCalenderDate(req.user.id, date);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.CREATED,
        message: 'Calendar date created successfully',
        data: result,
    });
}));
const GetDateSlots = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield calendar_services_1.default.GetDateSlots(req.params.id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Calendar slots retrieved successfully',
        data: result,
    });
}));
const PostDateSlots = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield calendar_services_1.default.CreateDateSlots(req.params.id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.CREATED,
        message: 'Calendar slots created successfully',
        data: result,
    });
}));
const PostSlotsWithCalendarDate = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let payload = req.body;
    if (req.body.date && req.body.slots && !req.body.data) {
        payload = {
            data: [
                {
                    date: req.body.date,
                    slots: req.body.slots,
                },
            ],
        };
    }
    const result = yield calendar_services_1.default.CreateSlotsWithCalendarDate(req.user.id, payload);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.CREATED,
        message: 'Calendar slots created successfully',
        data: result,
    });
}));
const GetSlotsWithCalendarDate = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield calendar_services_1.default.GetSlotsWithCalendarDate(req.user.id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Calendar slots got successfully',
        data: result,
    });
}));
const DeleteTimeSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield calendar_services_1.default.DeleteTimeSlot(req.user.id, req.params.slotId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Time slot deleted successfully',
        data: result,
    });
}));
const CalendarController = {
    GetCalendar,
    PostCalendarDate,
    GetDateSlots,
    PostDateSlots,
    PostSlotsWithCalendarDate,
    GetSlotsWithCalendarDate,
    DeleteTimeSlot,
};
exports.default = CalendarController;
