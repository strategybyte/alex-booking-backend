import prisma from '../../utils/prisma';
import { Role } from '@prisma/client';

interface IDashboardQuery {
  date?: string;
}

const GetCounselorDashboard = async (counselorId: string, query: IDashboardQuery) => {
  // Default to current date if no date provided
  let dateString: string;

  if (query.date) {
    dateString = query.date;
  } else {
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  }

  // Create date range for the selected day (in UTC)
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

  // Get all appointments for the counselor on the selected date
  const appointments = await prisma.appointment.findMany({
    where: {
      counselor_id: counselorId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
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

  // Format appointments for response
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

  // Calculate statistics
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
    date: dateString,
    appointments: formattedAppointments,
    statistics,
  };
};

const GetSuperAdminDashboard = async (query: IDashboardQuery) => {
  // Default to current date if no date provided
  let dateString: string;

  if (query.date) {
    dateString = query.date;
  } else {
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  }

  // Create date range for the selected day (in UTC)
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

  // Get all counselors with their appointments for the selected date
  const counselors = await prisma.user.findMany({
    where: {
      role: Role.COUNSELOR,
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
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
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

  // Format the response and calculate statistics
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

  // Find counselor with highest bookings
  const counselorWithHighestBookings = formattedCounselors.reduce(
    (max, counselor) => {
      return counselor.bookingCount > max.bookingCount ? counselor : max;
    },
    { counselor: null, bookingCount: 0, appointments: [] },
  );

  // Calculate overall statistics
  const totalAppointments = formattedCounselors.reduce(
    (sum, c) => sum + c.bookingCount,
    0,
  );

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
    date: dateString,
    counselors: formattedCounselors,
    topCounselor: counselorWithHighestBookings.bookingCount > 0
      ? {
          counselor: counselorWithHighestBookings.counselor,
          bookingCount: counselorWithHighestBookings.bookingCount,
        }
      : null,
    statistics,
  };
};

const DashboardService = {
  GetCounselorDashboard,
  GetSuperAdminDashboard,
};

export default DashboardService;
