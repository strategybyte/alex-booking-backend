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

export const UserService = {
  UpdateProfilePicture,
  UpdateUserProfile,
  CreateCounselor,
  GetCounselors,
  UpdateCounselorSettings,
  GetAllUsers,
};
