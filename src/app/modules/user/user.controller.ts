import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.services';
import AppError from '../../errors/AppError';
import pick from '../../utils/pick';

const UpdateProfilePicture = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Image is required');
  }

  const result = await UserService.UpdateProfilePicture(req.user.id, req.file);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Profile picture updated successfully',
    data: result,
  });
});

const UpdateProfile = catchAsync(async (req, res) => {
  const result = await UserService.UpdateUserProfile(req.user.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

const CreateCounselor = catchAsync(async (req, res) => {
  const result = await UserService.CreateCounselor(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Counselor created successfully',
    data: result,
  });
});

const GetCounselors = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['search']);
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sort_by',
    'sort_order',
  ]);
  const result = await UserService.GetCounselors(filters, paginationOptions);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Counselors retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const GetCounselorById = catchAsync(async (req, res) => {
  const { counselorId } = req.params;
  const result = await UserService.GetCounselorById(counselorId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Counselor retrieved successfully',
    data: result,
  });
});

const UpdateCounselorSettings = catchAsync(async (req, res) => {
  const { counselorId } = req.params;
  const result = await UserService.UpdateCounselorSettings(
    counselorId,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Counselor settings updated successfully',
    data: result,
  });
});

const UpdateCounselor = catchAsync(async (req, res) => {
  const { counselorId } = req.params;
  const result = await UserService.UpdateCounselor(counselorId, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Counselor updated successfully',
    data: result,
  });
});

const GetAllUsers = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['search']);
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sort_by',
    'sort_order',
  ]);
  const result = await UserService.GetAllUsers(filters, paginationOptions);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Users retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const UserController = {
  UpdateProfilePicture,
  UpdateProfile,
  CreateCounselor,
  GetCounselors,
  GetCounselorById,
  UpdateCounselorSettings,
  UpdateCounselor,
  GetAllUsers,
};
