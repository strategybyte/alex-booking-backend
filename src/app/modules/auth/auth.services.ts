import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import config from '../../config';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import AuthUtils from './auth.utils';
import { deleteFromSpaces, extractKeyFromUrl } from '../../utils/handelFile';

const Register = async (payload: User) => {
  const { email, password, name } = payload;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  // Create user
  const result = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  });

  // Prepare JWT payload
  const jwtPayload = {
    id: result.id,
    email: result.email,
    role: result.role,
  };

  const access_token = AuthUtils.CreateToken(
    jwtPayload,
    config.jwt_access_token_secret as string,
    config.jwt_access_token_expires_in as string,
  );

  return { access_token };
};

const Login = async (payload: User) => {
  const user = await prisma.user.findFirst({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'No user found with this email');
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const access_token = AuthUtils.CreateToken(
    jwtPayload,
    config.jwt_access_token_secret as string,
    config.jwt_access_token_expires_in as string,
  );

  return { access_token };
};

const ChangePassword = async (
  payload: {
    old_password: string;
    new_password: string;
  },
  user: JwtPayload,
) => {
  const isUserValid = await prisma.user.findFirst({
    where: { id: user.id },
  });

  if (!isUserValid) {
    throw new AppError(httpStatus.NOT_FOUND, 'No user found');
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.old_password,
    isUserValid.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid password');
  }

  const hashedPassword = await bcrypt.hash(
    payload.new_password,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });
};

const GetMyProfile = async (user: JwtPayload) => {
  const userProfile = await prisma.user.findUnique({
    where: { id: user.id, email: user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      profile_picture: true,
      specialization: true,
      created_at: true,
    },
  });

  if (!userProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // If user is a counselor, include their settings
  if (userProfile.role === 'COUNSELOR') {
    const counselorSettings = await prisma.counselorSettings.findUnique({
      where: { counselor_id: user.id },
      select: {
        minimum_slots_per_day: true,
      },
    });

    return {
      ...userProfile,
      minimum_slots_per_day: counselorSettings?.minimum_slots_per_day || 6,
    };
  }

  return userProfile;
};

const UpdateProfile = async (
  payload: {
    name?: string;
    specialization?: string;
  },
  profilePicture: string | undefined,
  user: JwtPayload,
) => {
  const userExists = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const updateData: any = {};

  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }

  if (payload.specialization !== undefined) {
    updateData.specialization = payload.specialization;
  }

  if (profilePicture !== undefined) {
    updateData.profile_picture = profilePicture;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      profile_picture: true,
      specialization: true,
      created_at: true,
    },
  });

  // If user is a counselor, include their settings
  if (updatedUser.role === 'COUNSELOR') {
    const counselorSettings = await prisma.counselorSettings.findUnique({
      where: { counselor_id: user.id },
      select: {
        minimum_slots_per_day: true,
      },
    });

    return {
      ...updatedUser,
      minimum_slots_per_day: counselorSettings?.minimum_slots_per_day || 6,
    };
  }

  return updatedUser;
};

const DeleteProfilePicture = async (user: JwtPayload) => {
  const userExists = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!userExists.profile_picture) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No profile picture to delete');
  }

  // Delete the file from DigitalOcean Spaces
  const key = extractKeyFromUrl(userExists.profile_picture);
  if (key) {
    try {
      await deleteFromSpaces(key);
    } catch (error) {
      console.error('Failed to delete profile picture from storage:', error);
    }
  }

  // Update user record to remove profile picture
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { profile_picture: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      profile_picture: true,
      specialization: true,
      created_at: true,
    },
  });

  // If user is a counselor, include their settings
  if (updatedUser.role === 'COUNSELOR') {
    const counselorSettings = await prisma.counselorSettings.findUnique({
      where: { counselor_id: user.id },
      select: {
        minimum_slots_per_day: true,
      },
    });

    return {
      ...updatedUser,
      minimum_slots_per_day: counselorSettings?.minimum_slots_per_day || 6,
    };
  }

  return updatedUser;
};

const AuthService = {
  Register,
  Login,
  ChangePassword,
  GetMyProfile,
  UpdateProfile,
  DeleteProfilePicture,
};

export default AuthService;
