import prisma from '../../utils/prisma';
import path from 'path';
import {
  deleteFromSpaces,
  extractKeyFromUrl,
  uploadToSpaces,
} from '../../utils/handelFile';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import config from '../../config';
import UserUtils from './user.utils';
import sendMail from '../../utils/mailer';
import calculatePagination, {
  IPaginationOptions,
} from '../../utils/pagination';
import { counselorSearchableFields } from './user.constant';

interface ICounselorFilters {
  search?: string;
}

const UpdateProfilePicture = async (id: string, file: Express.Multer.File) => {
  const user = await prisma.user.findUnique({
    where: { id, is_deleted: false },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  let profilePicture: string | null = user.profile_picture || null;

  try {
    if (user.profile_picture) {
      const key = extractKeyFromUrl(user.profile_picture);
      if (key) {
        await deleteFromSpaces(key);
      }
    }

    const uploadResult = await uploadToSpaces(file, {
      folder: 'profile-pictures',
      filename: `profile_picture_${Date.now()}${path.extname(file.originalname)}`,
    });
    profilePicture = uploadResult?.url || null;
  } catch (error) {
    console.log(
      'Error from DigitalOcean Spaces while uploading profile picture',
      error,
    );
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to upload profile picture',
    );
  }

  const result = await prisma.user.update({
    where: { id },
    data: { profile_picture: profilePicture },
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      profile_picture: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  return result;
};

const UpdateUserProfile = async (id: string, data: { name?: string }) => {
  const user = await prisma.user.findUnique({
    where: { id, is_deleted: false },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const result = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      profile_picture: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  return result;
};

const CreateCounselor = async (payload: {
  name: string;
  email: string;
  specialization?: string;
}) => {
  const { name, email, specialization } = payload;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      'User with this email already exists',
    );
  }

  // Generate random password
  const randomPassword = UserUtils.generateRandomPassword();

  // Hash the password
  const hashedPassword = await bcrypt.hash(
    randomPassword,
    Number(config.bcrypt_salt_rounds),
  );

  // Create counselor with default settings in a transaction
  const newCounselor = await prisma.$transaction(async (tx) => {
    // Create the counselor
    const counselor = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.COUNSELOR,
        specialization: specialization || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        specialization: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Create default counselor settings
    await tx.counselorSettings.create({
      data: {
        counselor_id: counselor.id,
        minimum_slots_per_day: 6, // Default minimum slots
      },
    });

    return counselor;
  });

  // Send email with credentials in background (non-blocking)
  Promise.resolve().then(async () => {
    try {
      const emailTemplate = UserUtils.createCounselorEmailTemplate(
        name,
        email,
        randomPassword,
      );

      await sendMail(
        email,
        'Welcome to Alexander Rodriguez Counseling - Your Account Credentials',
        emailTemplate,
      );

      console.log(`Welcome email sent successfully to ${email}`);
    } catch (error) {
      console.error(`Failed to send welcome email to ${email}:`, error);
    }
  });

  return newCounselor;
};

const GetCounselors = async (
  filters: ICounselorFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sort_by, sort_order } =
    calculatePagination(paginationOptions);
  const { search } = filters;

  const whereConditions: Prisma.UserWhereInput = {
    role: Role.COUNSELOR,
    is_deleted: false,
  };

  if (search) {
    whereConditions.OR = counselorSearchableFields.map((field) => ({
      [field]: {
        contains: search,
        mode: 'insensitive' as Prisma.QueryMode,
      },
    }));
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = {};

  if (sort_by === 'name') {
    orderBy.name = sort_order as Prisma.SortOrder;
  } else if (sort_by === 'email') {
    orderBy.email = sort_order as Prisma.SortOrder;
  } else {
    orderBy.created_at = sort_order as Prisma.SortOrder;
  }

  const total = await prisma.user.count({
    where: whereConditions,
  });

  const counselors = await prisma.user.findMany({
    where: whereConditions,
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      role: true,
      created_at: true,
      updated_at: true,
      counselor_settings: {
        select: {
          minimum_slots_per_day: true,
          approved_by_admin: true,
        },
      },
    },
    orderBy,
    skip,
    take: limit,
  });

  return {
    data: counselors,
    meta: {
      total,
      page,
      limit,
    },
  };
};

const GetCounselorById = async (counselorId: string) => {
  // Find the counselor by ID with all related information
  const counselor = await prisma.user.findUnique({
    where: { id: counselorId, is_deleted: false },
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      profile_picture: true,
      role: true,
      is_calendar_connected: true,
      is_stripe_connected: true,
      stripe_onboarding_complete: true,
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
      created_at: true,
      updated_at: true,
      counselor_settings: {
        select: {
          minimum_slots_per_day: true,
          approved_by_admin: true,
        },
      },
      // Earnings information
      counsellor_balance: {
        select: {
          current_balance: true,
          total_earned: true,
          total_withdrawn: true,
          updated_at: true,
        },
      },
      // Appointments with client and payment details
      appointments: {
        select: {
          id: true,
          date: true,
          session_type: true,
          status: true,
          is_rescheduled: true,
          notes: true,
          created_at: true,
          updated_at: true,
          client: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
              date_of_birth: true,
              gender: true,
              is_verified: true,
            },
          },
          time_slot: {
            select: {
              start_time: true,
              end_time: true,
              type: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              payment_method: true,
              processed_at: true,
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
          date: 'desc',
        },
      },
      // Payout requests
      payout_requests: {
        select: {
          id: true,
          amount: true,
          status: true,
          requested_at: true,
          processed_at: true,
          rejection_reason: true,
          notes: true,
        },
        orderBy: {
          requested_at: 'desc',
        },
      },
      // Balance transactions
      balance_transactions: {
        select: {
          id: true,
          type: true,
          amount: true,
          is_increase: true,
          description: true,
          reference_type: true,
          balance_before: true,
          balance_after: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 50, // Limit to last 50 transactions
      },
    },
  });

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }

  if (counselor.role !== Role.COUNSELOR) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not a counselor');
  }

  // Get unique clients who have appointments with this counselor
  const uniqueClients = await prisma.client.findMany({
    where: {
      appointments: {
        some: {
          counselor_id: counselorId,
        },
      },
      is_deleted: false,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      date_of_birth: true,
      gender: true,
      is_verified: true,
      created_at: true,
      _count: {
        select: {
          appointments: {
            where: {
              counselor_id: counselorId,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // Calculate appointment statistics
  const appointmentStats = {
    total: counselor.appointments.length,
    pending: counselor.appointments.filter((apt) => apt.status === 'PENDING')
      .length,
    confirmed: counselor.appointments.filter((apt) => apt.status === 'CONFIRMED')
      .length,
    completed: counselor.appointments.filter((apt) => apt.status === 'COMPLETED')
      .length,
    cancelled: counselor.appointments.filter((apt) => apt.status === 'CANCELLED')
      .length,
  };

  return {
    ...counselor,
    clients: uniqueClients,
    appointment_stats: appointmentStats,
  };
};

const UpdateCounselorSettings = async (
  counselorId: string,
  payload: { minimum_slots_per_day?: number; approved_by_admin?: boolean },
) => {
  // Check if counselor exists and has COUNSELOR role
  const counselor = await prisma.user.findUnique({
    where: { id: counselorId },
  });

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }

  if (counselor.role !== Role.COUNSELOR) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not a counselor');
  }

  // Build update object with only provided fields
  const updateData: { minimum_slots_per_day?: number; approved_by_admin?: boolean } = {};
  if (payload.minimum_slots_per_day !== undefined) {
    updateData.minimum_slots_per_day = payload.minimum_slots_per_day;
  }
  if (payload.approved_by_admin !== undefined) {
    updateData.approved_by_admin = payload.approved_by_admin;
  }

  // Update or create counselor settings
  const updatedSettings = await prisma.counselorSettings.upsert({
    where: { counselor_id: counselorId },
    update: updateData,
    create: {
      counselor_id: counselorId,
      minimum_slots_per_day: payload.minimum_slots_per_day ?? 6,
      approved_by_admin: payload.approved_by_admin ?? false,
    },
  });

  return updatedSettings;
};

const UpdateCounselor = async (
  counselorId: string,
  payload: { name?: string; specialization?: string },
) => {
  // Check if counselor exists
  const counselor = await prisma.user.findUnique({
    where: { id: counselorId, is_deleted: false },
  });

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }

  if (counselor.role !== Role.COUNSELOR) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not a counselor');
  }

  // Build update object with only provided fields
  const updateData: { name?: string; specialization?: string | null } = {};
  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }
  if (payload.specialization !== undefined) {
    updateData.specialization = payload.specialization;
  }

  // Update counselor
  const updatedCounselor = await prisma.user.update({
    where: { id: counselorId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      profile_picture: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedCounselor;
};

const GetAllUsers = async (
  filters: ICounselorFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sort_by, sort_order } =
    calculatePagination(paginationOptions);
  const { search } = filters;

  const whereConditions: Prisma.UserWhereInput = {
    is_deleted: false,
  };

  if (search) {
    whereConditions.OR = counselorSearchableFields.map((field) => ({
      [field]: {
        contains: search,
        mode: 'insensitive' as Prisma.QueryMode,
      },
    }));
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = {};

  if (sort_by === 'name') {
    orderBy.name = sort_order as Prisma.SortOrder;
  } else if (sort_by === 'email') {
    orderBy.email = sort_order as Prisma.SortOrder;
  } else {
    orderBy.created_at = sort_order as Prisma.SortOrder;
  }

  const total = await prisma.user.count({
    where: whereConditions,
  });

  const users = await prisma.user.findMany({
    where: whereConditions,
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      profile_picture: true,
      role: true,
      created_at: true,
      updated_at: true,
      counselor_settings: {
        select: {
          minimum_slots_per_day: true,
          approved_by_admin: true,
        },
      },
    },
    orderBy,
    skip,
    take: limit,
  });

  return {
    data: users,
    meta: {
      total,
      page,
      limit,
    },
  };
};

const GetCounselorDivisions = async (counselorId: string) => {
  const counselor = await prisma.user.findUnique({
    where: { id: counselorId, is_deleted: false },
  });

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }

  return prisma.userDivision.findMany({
    where: { user_id: counselorId },
    include: { division: true },
    orderBy: { created_at: 'asc' },
  });
};

const AssignDivision = async (counselorId: string, divisionId: string) => {
  const [counselor, division] = await Promise.all([
    prisma.user.findUnique({ where: { id: counselorId, is_deleted: false } }),
    prisma.division.findUnique({ where: { id: divisionId } }),
  ]);

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }
  if (!division) {
    throw new AppError(httpStatus.NOT_FOUND, 'Division not found');
  }

  const existing = await prisma.userDivision.findUnique({
    where: { user_id_division_id: { user_id: counselorId, division_id: divisionId } },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'Division already assigned to this counselor');
  }

  return prisma.userDivision.create({
    data: { user_id: counselorId, division_id: divisionId },
    include: { division: true },
  });
};

const RemoveDivision = async (counselorId: string, divisionId: string) => {
  const record = await prisma.userDivision.findUnique({
    where: { user_id_division_id: { user_id: counselorId, division_id: divisionId } },
  });

  if (!record) {
    throw new AppError(httpStatus.NOT_FOUND, 'Division not assigned to this counselor');
  }

  await prisma.userDivision.delete({
    where: { user_id_division_id: { user_id: counselorId, division_id: divisionId } },
  });
};

const GetCounselorServices = async (counselorId: string) => {
  const counselor = await prisma.user.findUnique({
    where: { id: counselorId, is_deleted: false },
  });

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }

  return prisma.userService.findMany({
    where: { user_id: counselorId },
    include: {
      service: {
        include: { division: { select: { id: true, type: true } } },
      },
    },
    orderBy: { created_at: 'asc' },
  });
};

const AssignService = async (counselorId: string, serviceId: string) => {
  const [counselor, service] = await Promise.all([
    prisma.user.findUnique({ where: { id: counselorId, is_deleted: false } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);

  if (!counselor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Counselor not found');
  }
  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  }

  const existing = await prisma.userService.findUnique({
    where: { user_id_service_id: { user_id: counselorId, service_id: serviceId } },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'Service already assigned to this counselor');
  }

  return prisma.userService.create({
    data: { user_id: counselorId, service_id: serviceId },
    include: {
      service: {
        include: { division: { select: { id: true, type: true } } },
      },
    },
  });
};

const RemoveService = async (counselorId: string, serviceId: string) => {
  const record = await prisma.userService.findUnique({
    where: { user_id_service_id: { user_id: counselorId, service_id: serviceId } },
  });

  if (!record) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not assigned to this counselor');
  }

  await prisma.userService.delete({
    where: { user_id_service_id: { user_id: counselorId, service_id: serviceId } },
  });
};

export const UserService = {
  UpdateProfilePicture,
  UpdateUserProfile,
  CreateCounselor,
  GetCounselors,
  GetCounselorById,
  UpdateCounselorSettings,
  UpdateCounselor,
  GetAllUsers,
  GetCounselorDivisions,
  AssignDivision,
  RemoveDivision,
  GetCounselorServices,
  AssignService,
  RemoveService,
};
