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
const client_1 = require("@prisma/client");
const GetCounselorDashboard = (counselorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const selectedDate = query.date
        ? new Date(query.date)
        : new Date();
    selectedDate.setHours(0, 0, 0, 0);
    const appointments = yield prisma_1.default.appointment.findMany({
        where: {
            counselor_id: counselorId,
            date: selectedDate,
            status: {
                not: 'DELETED',
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
            time_slot: {
                select: {
                    start_time: true,
                    end_time: true,
                },
            },
            meeting: {
                select: {
                    platform: true,
                    link: true,
                },
            },
        },
        orderBy: {
            time_slot: {
                start_time: 'asc',
            },
        },
    });
    const formattedAppointments = appointments.map((appointment) => ({
        id: appointment.id,
        sessionType: appointment.session_type,
        appointmentDate: appointment.date,
        startTime: appointment.time_slot.start_time,
        endTime: appointment.time_slot.end_time,
        status: appointment.status,
        client: {
            firstName: appointment.client.first_name,
            lastName: appointment.client.last_name,
            email: appointment.client.email,
            phone: appointment.client.phone,
        },
        meeting: appointment.meeting ? {
            platform: appointment.meeting.platform,
            link: appointment.meeting.link,
        } : null,
        notes: appointment.notes,
    }));
    const statistics = {
        totalAppointments: appointments.length,
        byStatus: {
            pending: appointments.filter((a) => a.status === 'PENDING').length,
            confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
            completed: appointments.filter((a) => a.status === 'COMPLETED').length,
            cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
        },
        bySessionType: {
            online: appointments.filter((a) => a.session_type === 'ONLINE').length,
            inPerson: appointments.filter((a) => a.session_type === 'IN_PERSON').length,
        },
    };
    return {
        date: selectedDate,
        appointments: formattedAppointments,
        statistics,
    };
});
const GetSuperAdminDashboard = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const selectedDate = query.date
        ? new Date(query.date)
        : new Date();
    selectedDate.setHours(0, 0, 0, 0);
    const counselors = yield prisma_1.default.user.findMany({
        where: {
            role: client_1.Role.COUNSELOR,
            is_deleted: false,
        },
        select: {
            id: true,
            name: true,
            email: true,
            specialization: true,
            profile_picture: true,
            appointments: {
                where: {
                    date: selectedDate,
                    status: {
                        not: 'DELETED',
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
                    time_slot: {
                        select: {
                            start_time: true,
                            end_time: true,
                        },
                    },
                    meeting: {
                        select: {
                            platform: true,
                            link: true,
                        },
                    },
                },
                orderBy: {
                    time_slot: {
                        start_time: 'asc',
                    },
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });
    const formattedCounselors = counselors.map((counselor) => {
        const appointments = counselor.appointments.map((appointment) => ({
            id: appointment.id,
            sessionType: appointment.session_type,
            appointmentDate: appointment.date,
            startTime: appointment.time_slot.start_time,
            endTime: appointment.time_slot.end_time,
            status: appointment.status,
            client: {
                firstName: appointment.client.first_name,
                lastName: appointment.client.last_name,
                email: appointment.client.email,
                phone: appointment.client.phone,
            },
            meeting: appointment.meeting ? {
                platform: appointment.meeting.platform,
                link: appointment.meeting.link,
            } : null,
            notes: appointment.notes,
        }));
        return {
            counselor: {
                id: counselor.id,
                name: counselor.name,
                email: counselor.email,
                specialization: counselor.specialization,
                profilePicture: counselor.profile_picture,
            },
            bookingCount: appointments.length,
            appointments,
        };
    });
    const counselorWithHighestBookings = formattedCounselors.reduce((max, counselor) => {
        return counselor.bookingCount > max.bookingCount ? counselor : max;
    }, { counselor: null, bookingCount: 0, appointments: [] });
    const totalAppointments = formattedCounselors.reduce((sum, c) => sum + c.bookingCount, 0);
    const allAppointments = formattedCounselors.flatMap((c) => c.appointments);
    const statistics = {
        totalAppointments,
        totalCounselors: counselors.length,
        counselorsWithBookings: formattedCounselors.filter((c) => c.bookingCount > 0).length,
        byStatus: {
            pending: allAppointments.filter((a) => a.status === 'PENDING').length,
            confirmed: allAppointments.filter((a) => a.status === 'CONFIRMED').length,
            completed: allAppointments.filter((a) => a.status === 'COMPLETED').length,
            cancelled: allAppointments.filter((a) => a.status === 'CANCELLED').length,
        },
        bySessionType: {
            online: allAppointments.filter((a) => a.sessionType === 'ONLINE').length,
            inPerson: allAppointments.filter((a) => a.sessionType === 'IN_PERSON').length,
        },
    };
    return {
        date: selectedDate,
        counselors: formattedCounselors,
        topCounselor: counselorWithHighestBookings.bookingCount > 0
            ? {
                counselor: counselorWithHighestBookings.counselor,
                bookingCount: counselorWithHighestBookings.bookingCount,
            }
            : null,
        statistics,
    };
});
const DashboardService = {
    GetCounselorDashboard,
    GetSuperAdminDashboard,
};
exports.default = DashboardService;
