import { Prisma, Role } from '@prisma/client';
import prisma from '../../utils/prisma';

interface IPublicCounselorFilters {
  service_id?: string;
  division_id?: string;
}

const GetPublicCounselors = async (filters: IPublicCounselorFilters = {}) => {
  const where: Prisma.UserWhereInput = {
    OR: [{ role: Role.SUPER_ADMIN }, { role: Role.COUNSELOR }],
    is_deleted: false,
  };

  if (filters.service_id) {
    where.user_services = { some: { service_id: filters.service_id } };
  }

  if (filters.division_id) {
    where.user_divisions = { some: { division_id: filters.division_id } };
  }

  // Get all counselors and super admin
  const counselors = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      role: true,
      specialization: true,
      profile_picture: true,
      is_calendar_connected: true,
      counselor_settings: {
        select: {
          approved_by_admin: true,
        },
      },
    },
    orderBy: [
      // Super admin first
      { role: 'asc' }, // SUPER_ADMIN comes before COUNSELOR alphabetically
      { name: 'asc' },
    ],
  });

  // Get next available date for each counselor
  const counselorsWithAvailability = await Promise.all(
    counselors.map(async (counselor) => {
      // Find the next available date for this counselor
      const nextAvailableCalendar = await prisma.calendar.findFirst({
        where: {
          counselor_id: counselor.id,
          date: {
            gte: new Date(),
          },
          time_slots: {
            some: {
              status: 'AVAILABLE',
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
        select: {
          date: true,
        },
      });

      let next_available = null;
      if (nextAvailableCalendar) {
        const today = new Date();
        const availableDate = new Date(nextAvailableCalendar.date);

        // Calculate if it's today, tomorrow, or specific date
        const diffTime = availableDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          next_available = 'Today';
        } else if (diffDays === 1) {
          next_available = 'Tomorrow';
        } else {
          // Format as readable date
          next_available = availableDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        }
      } else {
        next_available = null;
      }

      return {
        id: counselor.id,
        name: counselor.name,
        role: counselor.role,
        specialization: counselor.specialization,
        profile_picture: counselor.profile_picture,
        is_calendar_connected: counselor.is_calendar_connected,
        approved_by_admin: counselor.counselor_settings?.approved_by_admin ?? false,
        next_available,
      };
    }),
  );

  return counselorsWithAvailability;
};

const PublicUsersService = {
  GetPublicCounselors,
};
export type { IPublicCounselorFilters };

export default PublicUsersService;
